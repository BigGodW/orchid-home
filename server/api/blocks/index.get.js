// server/api/blocks/index.get.js
import { useDatabase } from '~/composables/useDatabase.js'

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
    
    return {
      success: true,
      data: blocks
    }
  } catch (error) {
    console.error('获取区块失败：', error)
    return {
      success: false,
      message: '获取区块数据失败：' + error.message
    }
  }
})