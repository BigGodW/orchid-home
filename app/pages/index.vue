<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 头部 -->
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold text-gray-900">兰花仓库管理系统</h1>
      </div>
    </header>

    <!-- 主要内容 -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="bg-white p-6 rounded-lg shadow">
        <WarehouseMap />
      </div>
    </main>
  </div>
</template>

<script setup>
import WarehouseMap from '~/components/WarehouseMap.vue'
</script>