<template>
  <div class="min-h-screen bg-gray-50 p-4 md:p-6">
    <!-- 页面标题 + 筛选 -->
    <div class="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-gray-800">兰花库存汇总</h1>
        <p class="text-gray-600 mt-1">按品种汇总：数量、分布区域、库存详情</p>
      </div>
      <!-- 品种筛选 -->
      <div class="w-full md:w-64">
        <input
          v-model="searchKeyword"
          placeholder="搜索兰花品种..."
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>
    </div>

    <!-- 全局统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
        <h3 class="text-sm font-medium text-gray-500">总库存（盆）</h3>
        <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{{ totalQuantity }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
        <h3 class="text-sm font-medium text-gray-500">品种总数</h3>
        <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{{ totalSpecies }}</p>
      </div>
      <div class="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
        <h3 class="text-sm font-medium text-gray-500">占用区块数</h3>
        <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{{ totalBlocks }}</p>
      </div>
    </div>

    <!-- 兰花品种汇总列表 -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">兰花品种</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总数量（盆）</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分布区块数</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">主要存放区域</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <!-- 筛选后的品种列表 -->
            <tr v-for="item in filteredSpeciesList" :key="item.species_id" class="hover:bg-gray-50">
              <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ item.species_name }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {{ item.total_quantity }}
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {{ item.block_count }}
              </td>
              <td class="px-4 py-3 whitespace-normal text-sm text-gray-500">
                <div class="flex flex-wrap gap-1">
                  <span v-for="block in item.main_blocks" :key="block" class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                    {{ block }}
                  </span>
                  <span v-if="item.block_count > 3" class="text-xs text-gray-400">
                    等{{ item.block_count }}个区块
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 whitespace-nowrap text-sm text-blue-600">
                <button @click="viewDetail(item)" class="hover:text-blue-800">查看详情</button>
              </td>
            </tr>
            <!-- 空数据提示 -->
            <tr v-if="filteredSpeciesList.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-sm text-gray-500">
                {{ searchKeyword ? '未找到该品种的库存数据' : '暂无兰花库存数据' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 品种详情弹窗 -->
    <div v-if="detailModal.show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <!-- 弹窗标题 -->
        <div class="px-6 py-4 border-b flex justify-between items-center">
          <h3 class="text-lg font-bold text-gray-800">
            {{ detailModal.data.species_name }} - 库存详情
          </h3>
          <button @click="closeDetailModal" class="text-gray-500 hover:text-gray-700 text-lg">✕</button>
        </div>
        <!-- 弹窗内容 -->
        <div class="p-6 overflow-y-auto max-h-[70vh]">
          <!-- 品种总览 -->
          <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 class="text-sm text-gray-500">总库存</h4>
                <p class="text-2xl font-bold text-gray-800">{{ detailModal.data.total_quantity }} 盆</p>
              </div>
              <div>
                <h4 class="text-sm text-gray-500">分布区块数</h4>
                <p class="text-2xl font-bold text-gray-800">{{ detailModal.data.block_count }} 个</p>
              </div>
              <div>
                <h4 class="text-sm text-gray-500">最多库存区块</h4>
                <p class="text-2xl font-bold text-gray-800">
                  {{ detailModal.data.top_block || '无' }}
                </p>
              </div>
            </div>
          </div>
          <!-- 区块分布详情 -->
          <div>
            <h4 class="font-medium text-gray-700 mb-3">各区块库存分布</h4>
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">区块编码</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">数量（盆）</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">容量使用率</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="block in detailModal.data.block_details" :key="block.block_id" class="hover:bg-gray-50">
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{{ block.block_code }}</td>
                  <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{{ block.quantity }}</td>
                  <td class="px-4 py-2 whitespace-nowrap">
                    <div class="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        :class="['h-2 rounded-full', block.usage_rate > 90 ? 'bg-red-500' : block.usage_rate > 70 ? 'bg-amber-500' : 'bg-green-500']"
                        :style="{ width: `${block.usage_rate}%` }"
                      ></div>
                    </div>
                    <span class="text-xs text-gray-500 ml-2">{{ block.usage_rate }}%</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// 搜索关键词
const searchKeyword = ref('')
// 全局统计
const totalQuantity = ref(0)
const totalSpecies = ref(0)
const totalBlocks = ref(0)
// 品种列表
const speciesList = ref([])
// 详情弹窗
const detailModal = ref({
  show: false,
  data: {}
})

// 页面加载时获取数据
onMounted(async () => {
  await loadOrchidSummaryData()
})

// 加载兰花汇总数据
const loadOrchidSummaryData = async () => {
  try {
    const res = await $fetch('/api/orchid/summary', { method: 'GET' })
    if (res.success) {
      // 全局统计
      totalQuantity.value = res.data.total_quantity || 0
      totalSpecies.value = res.data.total_species || 0
      totalBlocks.value = res.data.total_blocks || 0
      // 品种列表
      speciesList.value = res.data.species_list || []
    }
  } catch (error) {
    console.error('加载兰花汇总数据失败：', error)
    alert('加载汇总数据失败，请重试！')
  }
}

// 筛选后的品种列表
const filteredSpeciesList = computed(() => {
  if (!searchKeyword.value) return speciesList.value
  const keyword = searchKeyword.value.toLowerCase()
  return speciesList.value.filter(item => 
    item.species_name.toLowerCase().includes(keyword)
  )
})

// 查看品种详情
const viewDetail = (item) => {
  detailModal.value = {
    show: true,
    data: item
  }
}

// 关闭详情弹窗
const closeDetailModal = () => {
  detailModal.value = {
    show: false,
    data: {}
  }
}
</script>

<style scoped>
/* 移动端适配 */
@media (max-width: 640px) {
  .max-h-\[70vh\] {
    max-height: 60vh;
  }
  
  /* 表格单元格换行适配 */
  td {
    white-space: normal !important;
  }
}

/* 滚动条优化 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-track {
  background-color: #f1f5f9;
}
</style>