// server/api/search.get.js
import { useDatabase } from '~/composables/useDatabase.js'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const db = await useDatabase(config.db)
    const { keyword } = getQuery(event)
    
    if (!keyword) {
      return {
        success: true,
        data: []
      }
    }

    // 联表查询（兼容手动配置的区块）
    const [results] = await db.execute(`
      SELECT 
        b.row_num,
        b.col_num,
        b.block_code,
        b.id as block_id,
        i.quantity,
        s.species_name
      FROM orchid_inventory i
      JOIN orchid_species s ON i.species_id = s.id
      JOIN warehouse_block b ON i.block_id = b.id
      WHERE s.species_name LIKE ?
    `, [`%${keyword}%`])

    return {
      success: true,
      data: results
    }
  } catch (error) {
    console.error('搜索接口错误：', error)
    return {
      success: false,
      message: '搜索失败：' + error.message
    }
  }
})