<template>
  <div v-if="show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-2">
      <div class="px-4 sm:px-6 py-3 sm:py-4 border-b flex justify-between items-center">
        <h3 class="text-lg sm:text-xl font-bold text-gray-800">兰花入库</h3>
        <button @click="closeForm" class="text-gray-500 hover:text-gray-700 transition-colors text-lg">
          ✕
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="p-4 sm:p-6 space-y-3 sm:space-y-4">
        <!-- 区块信息（兼容手动配置的区块编码） -->
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
            placeholder="例如：春兰、墨兰、建兰"
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            required
          />
        </div>

        <!-- 入库数量 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            入库数量 <span class="text-red-500">*</span>
            <span class="text-xs text-gray-500 ml-2">（单区块最多132盆）</span>
          </label>
          <input
            type="number"
            v-model="formData.quantity"
            min="1"
            max="132"
            placeholder="请输入数量"
            class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            required
          />
        </div>

        <!-- 提交按钮（移动端适配） -->
        <div class="flex justify-end space-x-2 sm:space-x-3 pt-3 sm:pt-4">
          <button
            type="button"
            @click="closeForm"
            class="px-3 sm:px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
          >
            取消
          </button>
          <button
            type="submit"
            class="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            :disabled="isRestrictedBlock || !formData.speciesName || !formData.quantity"
          >
            确认入库
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

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

// 表单数据
const formData = ref({
  speciesName: '',
  quantity: 1
})

// 区块标签（优先用数据库中的block_code，兼容手动配置）
const blockLabel = computed(() => {
  return props.block.block_code || `${props.block.row_num}-${String.fromCharCode(64 + props.block.col_num)}`
})

// 判断是否为不可操作区域（基于数据库的is_restricted字段）
const isRestrictedBlock = computed(() => {
  return props.block.is_restricted === 1
})

// 监听show状态重置表单
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      formData.value = {
        speciesName: '',
        quantity: 1
      }
    }
  }
)

// 关闭表单
const closeForm = () => {
  emit('close')
}

// 提交入库
const handleSubmit = async () => {
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
      emit('success')
      closeForm()
      alert(`✅ ${formData.value.speciesName} 入库成功！数量：${formData.value.quantity}`)
    } else {
      alert(`❌ ${res.message}`)
    }
  } catch (error) {
    console.error('入库失败：', error)
    alert('❌ 入库失败，请重试！')
  }
}
</script>