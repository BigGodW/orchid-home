// server/api/blocks/index.get.js
import { useDatabase,releaseConnection  } from '~/composables/useDatabase.js'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const db = await useDatabase(config.db)
    
    // 查询所有区块（关联区域信息，兼容手动配置）
    const [blocks] = await db.execute(`
      SELECT 
        b.id,
        b.row_num,
        b.col_num,
        b.block_code,
        b.is_restricted,
        a.area_name,
        a.area_desc
      FROM warehouse_block b
      LEFT JOIN warehouse_area a ON b.area_id = a.id
      ORDER BY b.row_num, b.col_num
    `)
    releaseConnection(db) // 成功查询后释放连接回连接池
    return {
      success: true,
      data: blocks
    }
  } catch (error) {
    console.error('获取区块失败：', error)
    if(db){
      releaseConnection(db) // 确保在发生错误时也释放连接
    }
    return {
      success: false,
      message: '获取区块数据失败：' + error.message
    }
  }
})