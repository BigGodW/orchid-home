<template>
  <div>
    <div>
      <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold text-gray-900">兰花仓库管理系统</h1>
      </div>
    </header>
    <nav class="p-2">
      <router-link to="/" class="px-3 py-2 text-gray-700 hover:text-gray-900">首页</router-link>
      <router-link to="/orchids" class="px-3 py-2 text-gray-700 hover:text-gray-900">兰花统计</router-link>
    </nav>
    </div>
    <NuxtPage></NuxtPage>
  </div>
</template>
