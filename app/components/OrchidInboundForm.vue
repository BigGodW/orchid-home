<template>
  <div v-if="show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-2">
      <div class="px-4 sm:px-6 py-3 sm:py-4 border-b flex justify-between items-center">
        <h3 class="text-lg sm:text-xl font-bold text-gray-800">{{ blockLabel }} - {{ activeTab === 'inbound' ? '入库' : '库存管理' }}</h3>
        <button @click="closeForm" class="text-gray-500 hover:text-gray-700 transition-colors text-lg">
          ✕
        </button>
      </div>

      <div class="p-4 sm:p-6">
        <!-- 标签切换：入库 / 库存管理（出库+编辑） -->
        <div class="flex mb-4 border-b">
          <button
            @click="switchTab('inbound')"
            :class="['px-4 py-2 text-sm font-medium', activeTab === 'inbound' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700']"
          >
            兰花入库
          </button>
          <button
            @click="switchTab('manage')"
            :class="['px-4 py-2 text-sm font-medium', activeTab === 'manage' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700']"
            :disabled="blockInventory.length === 0"
          >
            库存管理（出库/编辑）
          </button>
        </div>

        <!-- 1. 区块现有库存信息展示（始终显示） -->
        <div class="border rounded-lg p-3 bg-gray-50 mb-4">
          <h4 class="font-medium text-gray-700 mb-2">当前区块库存（最多132盆）：</h4>
          <div v-if="blockInventory.length > 0" class="space-y-2">
            <div v-for="item in blockInventory" :key="item.species_id" class="flex justify-between items-center text-sm">
              <span>{{ item.species_name }}：</span>
              <span class="font-medium">{{ item.quantity }} 盆</span>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center font-medium">
              <span>合计：</span>
              <span class="text-blue-600">{{ totalInventory }} 盆</span>
            </div>
          </div>
          <div v-else class="text-sm text-gray-500">
            该区块暂无兰花存放
          </div>
        </div>

        <!-- 2. 入库标签页 -->
        <div v-if="activeTab === 'inbound'" class="space-y-3 sm:space-y-4">
          <!-- 区块基础信息 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">入库区块</label>
            <input
              type="text"
              v-model="blockLabel"
              class="w-full px-3 py-2 border rounded-md bg-gray-100 cursor-not-allowed text-sm"
              readonly
            />
            <p v-if="isRestrictedBlock" class="mt-1 text-sm text-red-600">
              ❌ 该区块为受限区域（直播间/平台），不可入库
            </p>
          </div>

          <!-- 兰花品种名称 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              兰花品种名称 <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              v-model="formData.speciesName"
              placeholder="例如：春剑 西部荷王"
              class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
              :disabled="isRestrictedBlock"
            />
          </div>

          <!-- 入库数量（提示剩余可入库数量） -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              入库数量 <span class="text-red-500">*</span>
              <span class="text-xs text-gray-500 ml-2">（剩余可入库：{{ remainingCapacity }} 盆）</span>
            </label>
            <input
              type="number"
              v-model="formData.quantity"
              min="1"
              :max="remainingCapacity"
              placeholder="请输入数量"
              class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
              :disabled="isRestrictedBlock || remainingCapacity <= 0"
            />
          </div>

          <!-- 提交按钮 -->
          <div class="flex justify-end space-x-2 sm:space-x-3 pt-3 sm:pt-4">
            <button
              type="button"
              @click="closeForm"
              class="px-3 sm:px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
            >
              取消
            </button>
            <button
              type="button"
              @click="handleInboundSubmit"
              class="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              :disabled="isRestrictedBlock || !formData.speciesName || !formData.quantity || remainingCapacity <= 0"
            >
              确认入库
            </button>
          </div>
        </div>

        <!-- 3. 库存管理标签页（出库+编辑数量） -->
        <div v-if="activeTab === 'manage'" class="space-y-4">
          <div v-if="blockInventory.length > 0">
            <!-- 选择要操作的品种 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                选择品种 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="manageForm.speciesId"
                class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                @change="onSpeciesChange"
              >
                <option value="">请选择兰花品种</option>
                <option v-for="item in blockInventory" :key="item.species_id" :value="item.species_id">
                  {{ item.species_name }}（当前：{{ item.quantity }} 盆）
                </option>
              </select>
            </div>

            <!-- 操作类型：出库 / 编辑数量 -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                操作类型 <span class="text-red-500">*</span>
              </label>
              <select
                v-model="manageForm.operationType"
                class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">请选择操作类型</option>
                <option value="outbound">出库</option>
                <option value="edit">编辑数量</option>
              </select>
            </div>

            <!-- 数量输入（根据操作类型动态提示） -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ manageForm.operationType === 'outbound' ? '出库数量' : '目标数量' }} 
                <span class="text-red-500">*</span>
                <span v-if="currentSpeciesQuantity > 0" class="text-xs text-gray-500 ml-2">
                  （当前：{{ currentSpeciesQuantity }} 盆）
                </span>
              </label>
              <input
                type="number"
                v-model="manageForm.quantity"
                :min="manageForm.operationType === 'outbound' ? 1 : 0"
                :max="manageForm.operationType === 'outbound' ? currentSpeciesQuantity : 132 - (totalInventory - currentSpeciesQuantity)"
                placeholder="请输入数量"
                class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                :disabled="!manageForm.speciesId || !manageForm.operationType"
              />
              <p v-if="manageForm.operationType === 'outbound' && currentSpeciesQuantity > 0" class="mt-1 text-xs text-gray-500">
                最多可出库：{{ currentSpeciesQuantity }} 盆
              </p>
              <p v-if="manageForm.operationType === 'edit' && currentSpeciesQuantity >= 0" class="mt-1 text-xs text-gray-500">
                最多可设置：{{ 132 - (totalInventory - currentSpeciesQuantity) }} 盆（不超区块总容量）
              </p>
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-end space-x-2 sm:space-x-3 pt-3 sm:pt-4">
              <button
                type="button"
                @click="resetManageForm"
                class="px-3 sm:px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
              >
                重置
              </button>
              <button
                type="button"
                @click="handleManageSubmit"
                class="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                :disabled="!manageForm.speciesId || !manageForm.operationType || !manageForm.quantity || manageForm.quantity < (manageForm.operationType === 'outbound' ? 1 : 0)"
              >
                {{ manageForm.operationType === 'outbound' ? '确认出库' : '确认修改' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

// Props
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  block: {
    type: Object,
    required: true,
    default: () => ({ id: '', row_num: 0, col_num: 0, is_restricted: 0, block_code: '' })
  }
})

// Emits
const emit = defineEmits(['close', 'success'])

// 标签切换
const activeTab = ref('inbound')
// 入库表单数据
const formData = ref({
  speciesName: '',
  quantity: 1
})
// 库存管理表单数据（出库/编辑）
const manageForm = ref({
  speciesId: '',
  operationType: '',
  quantity: ''
})

// 区块库存数据
const blockInventory = ref([])
const totalInventory = ref(0)
const currentSpeciesQuantity = ref(0) // 当前选中品种的数量
const MAX_CAPACITY = 132 // 单区块最大容量

// 区块标签
const blockLabel = computed(() => {
  return props.block.block_code || `${props.block.row_num}-${String.fromCharCode(64 + props.block.col_num)}`
})

// 判断是否为不可操作区域
const isRestrictedBlock = computed(() => {
  return props.block.is_restricted === 1
})

// 剩余可入库数量
const remainingCapacity = computed(() => {
  return Math.max(0, MAX_CAPACITY - totalInventory.value)
})

// 切换标签页
const switchTab = (tab) => {
  activeTab.value = tab
  if (tab === 'manage') {
    resetManageForm()
  } else {
    formData.value = {
      speciesName: '',
      quantity: 1
    }
  }
}

// 重置库存管理表单
const resetManageForm = () => {
  manageForm.value = {
    speciesId: '',
    operationType: '',
    quantity: ''
  }
  currentSpeciesQuantity.value = 0
}

// 选择品种后更新当前数量
const onSpeciesChange = () => {
  const selected = blockInventory.value.find(item => item.species_id === manageForm.value.speciesId)
  currentSpeciesQuantity.value = selected ? selected.quantity : 0
}

// 监听show状态，加载区块库存数据
watch(
  () => props.show,
  async (newVal) => {
    if (newVal && props.block.id) {
      // 重置表单
      formData.value = {
        speciesName: '',
        quantity: 1
      }
      resetManageForm()
      // 加载区块库存
      await loadBlockInventory()
    }
  },
  { immediate: true }
)

// 加载当前区块的库存信息
const loadBlockInventory = async () => {
  try {
    const res = await $fetch(`/api/inventory/block/${props.block.id}`, { method: 'GET' })
    if (res.success) {
      blockInventory.value = res.data || []
      // 计算总库存
      totalInventory.value = blockInventory.value.reduce((sum, item) => sum + item.quantity, 0)
    } else {
      blockInventory.value = []
      totalInventory.value = 0
      alert('加载区块库存失败：' + res.message)
    }
  } catch (error) {
    console.error('加载库存失败：', error)
    blockInventory.value = []
    totalInventory.value = 0
    alert('加载区块库存失败，请重试！')
  }
}

// 关闭表单
const closeForm = () => {
  emit('close')
}

// 入库提交
const handleInboundSubmit = async () => {
  try {
    const res = await $fetch('/api/inventory/inbound', {
      method: 'POST',
      body: {
        blockId: props.block.id,
        speciesName: formData.value.speciesName.trim(),
        quantity: formData.value.quantity
      }
    })

    if (res.success) {
      await loadBlockInventory() // 刷新库存
      formData.value = { speciesName: '', quantity: 1 }
      alert(`✅ ${formData.value.speciesName} 入库成功！数量：${formData.value.quantity}`)
    } else {
      alert(`❌ ${res.message}`)
    }
  } catch (error) {
    console.error('入库失败：', error)
    alert('❌ 入库失败，请重试！')
  }
}

// 出库/编辑数量提交
const handleManageSubmit = async () => {
  try {
    const { speciesId, operationType, quantity } = manageForm.value
    const res = await $fetch(`/api/inventory/${operationType === 'outbound' ? 'outbound' : 'edit'}`, {
      method: 'POST',
      body: {
        blockId: props.block.id,
        speciesId,
        quantity: Number(quantity)
      }
    })

    if (res.success) {
      await loadBlockInventory() // 刷新库存
      resetManageForm()
      alert(`✅ ${operationType === 'outbound' ? '出库' : '修改数量'} 成功！`)
    } else {
      alert(`❌ ${res.message}`)
    }
  } catch (error) {
    console.error('操作失败：', error)
    alert(`❌ ${manageForm.value.operationType === 'outbound' ? '出库' : '修改数量'} 失败，请重试！`)
  }
}
</script>