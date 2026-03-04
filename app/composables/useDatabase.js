// app/composables/useDatabase.js
import mysql from 'mysql2/promise'

/**
 * 创建数据库连接
 * @param {Object} dbConfig 数据库配置对象
 * @returns {Promise<mysql.Connection>} 数据库连接实例
 */
export const useDatabase = async (dbConfig) => {
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      charset: 'utf8mb4'
    })
    return connection
  } catch (error) {
    console.error('数据库连接失败：', error)
    throw new Error('数据库连接失败，请检查配置')
  }
}