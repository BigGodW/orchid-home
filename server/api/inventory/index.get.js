// server/api/inventory/index.get.js
import { useDatabase } from '~/composables/useDatabase.js'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const db = await useDatabase(config.db)
    
    const [inventory] = await db.execute(`
      SELECT 
        i.id,
        i.block_id,
        i.species_id,
        i.quantity,
        i.create_time,
        s.species_name,
        b.block_code
      FROM orchid_inventory i
      LEFT JOIN orchid_species s ON i.species_id = s.id
      LEFT JOIN warehouse_block b ON i.block_id = b.id
    `)
    
    return {
      success: true,
      data: inventory
    }
  } catch (error) {
    console.error('获取库存失败：', error)
    return {
      success: false,
      message: '获取库存数据失败：' + error.message
    }
  }
})