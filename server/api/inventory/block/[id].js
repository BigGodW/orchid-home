// server/api/inventory/block/[id].js
import { useDatabase } from '~/composables/useDatabase.js'

export default defineEventHandler(async (event) => {
  try {
    // 获取URL中的区块ID
    const blockId = event.context.params.id
    if (!blockId) {
      return {
        success: false,
        message: '区块ID不能为空'
      }
    }

    const config = useRuntimeConfig()
    const db = await useDatabase(config.db)

    // 查询该区块的所有库存信息
    const [inventory] = await db.execute(`
      SELECT 
        i.species_id,
        s.species_name,
        i.quantity
      FROM orchid_inventory i
      LEFT JOIN orchid_species s ON i.species_id = s.id
      WHERE i.block_id = ?
      ORDER BY s.species_name
    `, [blockId])

    return {
      success: true,
      data: inventory
    }
  } catch (error) {
    console.error('查询区块库存失败：', error)
    return {
      success: false,
      message: '查询区块库存失败：' + error.message
    }
  }
})