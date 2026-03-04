// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss' // 启用Tailwind CSS
  ],
   runtimeConfig: {
    // 数据库配置（运行时环境变量）
    db: {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'orchid_warehouse'
    },
    // 客户端可访问的配置
    public: {}
  }
})