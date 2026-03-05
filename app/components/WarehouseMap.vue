<template>
  <div class="w-full overflow-auto p-2 md:p-4">
    <!-- 搜索区域（适配移动端） -->
    <div class="mb-4 md:mb-6 flex flex-row items-start sm:items-center gap-3 w-full">
      <input v-model="searchKeyword" type="text" placeholder="输入兰花品种名称搜索..."
        class="px-4 py-2 border rounded-lg flex-1 sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        @input="handleSearch" />
      <div class="flex gap-2 sm:w-auto">
        <button @click="clearSearch"
          class="px-2 py-1 bg-red-400  rounded-lg hover:bg-red-300 transition-colors text-lg  w-full sm:w-auto">
          ✕清空
        </button>
        
      </div>
      
    </div>
    <div>
      <span v-if="searchedBlocks.length > 0" class="text-sm text-blue-600  px-2 py-2 decoration-solid">
          找到 {{ searchedBlocks.length }} 个相关区块
        </span>
        <span v-else-if="searchKeyword" class="text-sm text-gray-600 px-2 py-2">
          未找到相关兰花品种
        </span>
    </div>
<div v-if="searchedBlocks.length > 0">
        <div class=" pb-4">
          <table class="w-full bg-white border border-gray-300 shadow-md rounded-lg overflow-hidden table-auto">
            <thead class="bg-blue-100 border-b border-gray-300">
              <tr>
                <th class="py-1 px-4">序号</th>
                <th class="py-1 px-4 text-left">品种名称</th>
                <th class="py-1 px-4 ">区块</th>
                <th class="py-1 px-4 text-right">数量</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in searchedBlocks" :key="item.block_id + '-' + item.row_num + '-' + item.col_num"
                class="border-b hover:bg-gray-100 transition-colors">
                <td class="py-1 px-1 text-center">{{ index + 1 }}</td>
                <td class="py-1 px-1">{{ item.species_name }}</td>
                <td class="py-1 px-4 text-right font-mono text-sm">{{ item.block_code }}</td>
                <td class="py-1 px-3 text-right font-semibold">{{ item.quantity }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    <!-- 仓库网格（核心：I/J列分割 + 每行间距 + 边框修复） -->
    <div class=" inline-block  border border-gray-200 overflow-auto">
      <!-- 第一行：列标题（A-P）+ 左上角占位 -->
      <div class="flex flex-shrink-0 border">
        <!-- 行号占位 -->
        <div
          class="w-6 sm:w-10 h-6 sm:h-10 border  flex items-center justify-center font-bold bg-gray-50 text-xs sm:text-sm">
        </div>

        <!-- 列标题A-I -->
        <div v-for="col in 9" :key="`col-${col}`"
          class="w-6 sm:w-10 h-6 sm:h-10 border  flex items-center justify-center font-bold bg-gray-50 text-xs sm:text-sm">
          {{ String.fromCharCode(64 + col) }}
        </div>

        <!-- I/J列之间的分割边距（修复边框） -->
        <div class="w-2 sm:w-3 h-6 sm:h-10 "></div>

        <!-- 列标题J-N -->
        <div v-for="col in [10, 11, 12, 13, 14]" :key="`col-${col}`"
          class="w-6 sm:w-10 h-6 sm:h-10 border  flex items-center justify-center font-bold bg-gray-50 text-xs sm:text-sm">
          {{ String.fromCharCode(64 + col) }}
        </div>
      </div>

      <!-- 后续行：行号 + 16个区块单元格（增加每行间距） -->
      <div v-for="row in 28" :key="`row-${row}`" class="flex flex-shrink-0 border">
        <!-- 行号 -->
        <div class="w-6 sm:w-10 h-6 sm:h-10  flex items-center justify-center font-bold bg-gray-50 text-xs sm:text-sm">
          {{ row }}
        </div>

        <!-- 区块单元格A-I -->
        <div v-for="col in 9" :key="`${row}-${col}`" @click="handleBlockClick(row, col)" :class="[
          'w-6 sm:w-10 h-6 sm:h-10 border cursor-pointer transition-all flex items-center justify-center text-xs',
          getBlockStatus(row, col).isRestricted
            ? 'bg-gray-300 cursor-not-allowed'
            : getBlockStatus(row, col).isSearched
              ? 'bg-yellow-400 hover:bg-yellow-500'
              : getBlockStatus(row, col).hasOrchids
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-white hover:bg-blue-100'
        ]">
          {{ getBlockStatus(row, col).count || '' }}
        </div>

        <!-- I/J列之间的分割边距（和标题行对应，修复边框） -->
        <div class="w-2 sm:w-3 h-6 sm:h-10 "></div>

        <!-- 区块单元格J-P（修复J列边框） -->
        <div v-for="col in [10, 11, 12, 13, 14]" :key="`${row}-${col}`" @click="handleBlockClick(row, col)" :class="[
          'w-6 sm:w-10 h-6 sm:h-10 border cursor-pointer transition-all flex items-center justify-center text-xs',
          getBlockStatus(row, col).isRestricted
            ? 'bg-gray-300 cursor-not-allowed'
            : getBlockStatus(row, col).isSearched
              ? 'bg-yellow-400 hover:bg-yellow-500'
              : getBlockStatus(row, col).hasOrchids
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-white hover:bg-blue-100'
        ]">
          {{ getBlockStatus(row, col).count || '' }}
        </div>
      </div>
    </div>

    <!-- 入库表单 -->
    <OrchidInboundForm :show="showInboundForm" :block="selectedBlock" @close="showInboundForm = false"
      @success="refreshInventoryData" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import OrchidInboundForm from './OrchidInboundForm.vue'

// 数据存储
const blocks = ref([])
const inventory = ref([])
const searchKeyword = ref('')
const searchedBlocks = ref([])
const showInboundForm = ref(false)
const selectedBlock = ref({})

// 初始化数据
const initData = async () => {
  await fetchBlocks()
  await refreshInventoryData()
}

// 获取区块数据（兼容手动配置）
const fetchBlocks = async () => {
  try {
    const res = await $fetch('/api/blocks', { method: 'GET' })
    if (res.success) {
      blocks.value = res.data
    }
  } catch (error) {
    console.error('获取区块失败：', error)
    alert('区块数据加载失败！')
  }
}

// 刷新库存数据
const refreshInventoryData = async () => {
  try {
    const res = await $fetch('/api/inventory', { method: 'GET' })
    if (res.success) {
      inventory.value = res.data
      if (searchKeyword.value) {
        handleSearch()
      }
    }
  } catch (error) {
    console.error('获取库存失败：', error)
    alert('库存数据加载失败！')
  }
}

// 获取区块状态（基于数据库字段，无硬编码）
const getBlockStatus = (row, col) => {
  const block = blocks.value.find(b => b.row_num === row && b.col_num === col)
  if (!block) return { isRestricted: false, hasOrchids: false, count: 0, isSearched: false }

  // 基于数据库的is_restricted判断（兼容手动配置）
  const isRestricted = block.is_restricted === 1
  const inventoryItems = inventory.value.filter(i => i.block_id === block.id)
  const hasOrchids = inventoryItems.length > 0
  const count = hasOrchids ? inventoryItems.reduce((sum, i) => sum + i.quantity, 0) : 0
  const isSearched = searchedBlocks.value.some(b => b.row_num === row && b.col_num === col)

  return { isRestricted, hasOrchids, count, isSearched }
}

// 区块点击事件（兼容手动配置的受限区块）
const handleBlockClick = (row, col) => {
  const block = blocks.value.find(b => b.row_num === row && b.col_num === col)
  if (!block || block.is_restricted === 1) return

  selectedBlock.value = block
  showInboundForm.value = true
}

// 搜索功能
const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    searchedBlocks.value = []
    return
  }

  try {
    const res = await $fetch('/api/search', {
      method: 'GET',
      params: { keyword: searchKeyword.value }
    })

    if (res.success) {
      console.log('搜索结果：', res.data)
      searchedBlocks.value = res.data
    } else {
      alert(`搜索失败：${res.message}`)
    }
  } catch (error) {
    console.error('搜索请求错误：', error)
    alert('搜索接口调用失败，请检查配置！')
    searchedBlocks.value = []
  }
}

// 清空搜索
const clearSearch = () => {
  searchKeyword.value = ''
  searchedBlocks.value = []
}

// 页面挂载初始化
onMounted(() => {
  initData()
})
</script>

<style scoped>
/* 移动端适配补充样式 */
@media (max-width: 640px) {
  .overflow-x-auto {
    -webkit-overflow-scrolling: touch;
    /* 移动端顺滑滚动 */
    scrollbar-width: thin;
    /* 精简滚动条 */
  }

  /* 优化移动端点击体验 */
  [class*="cursor-pointer"] {
    touch-action: manipulation;
    /* 禁用双击缩放 */
  }
}

/* 自定义滚动条样式（可选） */
::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}

::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-track {
  background-color: #f1f5f9;
}
</style>