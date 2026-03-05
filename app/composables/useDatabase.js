// app/composables/useDatabase.js
import mysql from 'mysql2/promise'

// 全局连接池单例（避免重复创建）
let connectionPool = null

/**
 * 初始化/获取数据库连接池
 * @param {Object} dbConfig 数据库配置对象
 * @returns {Promise<mysql.Pool>} 数据库连接池实例
 */
const getPool = async (dbConfig) => {
  if (!connectionPool) {
    connectionPool = mysql.createPool({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      charset: 'utf8mb4',
      // 连接池关键配置（解决连接数过多核心）
      connectionLimit: 10,        // 最大连接数（根据服务器配置调整，建议10-20）
      waitForConnections: true,   // 连接数满时等待（而非直接报错）
      queueLimit: 0,              // 等待队列无限制
      connectTimeout: 5000,       // 连接超时5秒
      idleTimeout: 30000          // 空闲连接超时30秒（自动释放）
    })
    console.log('✅ 数据库连接池初始化成功')
  }
  return connectionPool
}

/**
 * 获取数据库连接（从连接池获取）
 * 兼容原有调用方式，返回单个连接实例
 * @param {Object} dbConfig 数据库配置对象
 * @returns {Promise<mysql.PoolConnection>} 数据库连接实例
 */
export const useDatabase = async (dbConfig) => {
  try {
    const pool = await getPool(dbConfig)
    // 从连接池获取一个连接
    const connection = await pool.getConnection()
    return connection
  } catch (error) {
    console.error('数据库连接失败：', error)
    throw new Error('数据库连接失败，请检查配置')
  }
}

/**
 * 释放连接回连接池（关键：避免连接泄漏）
 * @param {mysql.PoolConnection} connection 数据库连接实例
 */
export const releaseConnection = (connection) => {
  if (connection) {
    try {
      connection.release() // 连接池模式释放（不是关闭）
      console.log('🔄 数据库连接已释放回连接池')
    } catch (error) {
      console.error('释放数据库连接失败：', error)
    }
  }
}

/**
 * 关闭连接池（仅在应用退出时调用）
 */
export const closePool = async () => {
  if (connectionPool) {
    await connectionPool.end()
    connectionPool = null
    console.log('🛑 数据库连接池已关闭')
  }
}