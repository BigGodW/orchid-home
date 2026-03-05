// server/api/inventory/edit.js
import { useDatabase,releaseConnection  } from '~/composables/useDatabase.js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { blockId, speciesId, quantity } = body

    // 参数校验
    if (!blockId || !speciesId || quantity < 0) {
      return {
        success: false,
        message: '参数错误：区块ID、品种ID不能为空，目标数量不能为负数'
      }
    }

    const config = useRuntimeConfig()
    const db = await useDatabase(config.db)

    // 开启事务
    await db.beginTransaction()

    // 1. 查询该区块其他品种的总库存
    const [otherInventory] = await db.execute(`
      SELECT COALESCE(SUM(quantity), 0) AS total 
      FROM orchid_inventory 
      WHERE block_id = ? AND species_id != ?
    `, [blockId, speciesId])

    const otherTotal = otherInventory[0].total
    const MAX_CAPACITY = 132

    if (quantity > MAX_CAPACITY - otherTotal) {
      await db.rollback()
      return {
        success: false,
        message: `目标数量超过区块剩余容量（剩余：${MAX_CAPACITY - otherTotal} 盆）`
      }
    }

    // 2. 查询当前库存
    const [currentInventory] = await db.execute(`
      SELECT quantity FROM orchid_inventory 
      WHERE block_id = ? AND species_id = ?
    `, [blockId, speciesId])

    if (quantity === 0) {
      // 目标数量为0，删除记录
      if (currentInventory.length > 0) {
        await db.execute(`
          DELETE FROM orchid_inventory 
          WHERE block_id = ? AND species_id = ?
        `, [blockId, speciesId])
      }
    } else if (currentInventory.length > 0) {
      // 更新库存
      await db.execute(`
        UPDATE orchid_inventory 
        SET quantity = ?, update_time = CURRENT_TIMESTAMP 
        WHERE block_id = ? AND species_id = ?
      `, [quantity, blockId, speciesId])
    } else {
      // 新增库存记录（如果原本无记录）
      await db.execute(`
        INSERT INTO orchid_inventory (block_id, species_id, quantity, create_time, update_time)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [blockId, speciesId, quantity])
    }

    // 3. 记录编辑日志
    const changeQty = currentInventory.length > 0 ? quantity - currentInventory[0].quantity : quantity
    await db.execute(`
      INSERT INTO inbound_log (block_id, species_id, inbound_quantity, operator, remark, operation_time)
      VALUES (?, ?, ?, 'system', '编辑库存数量', CURRENT_TIMESTAMP)
    `, [blockId, speciesId, changeQty])

    // 提交事务
    await db.commit()
    releaseConnection(db) // 事务提交后释放连接回连接池
    return {
      success: true,
      message: `成功将数量修改为 ${quantity} 盆`
    }
  } catch (error) {
    
    await db.rollback()
    if(db){
      releaseConnection(db) // 确保在发生错误时也释放连接
    }
    console.error('编辑数量失败：', error)
    return {
      success: false,
      message: '编辑数量失败：' + error.message
    }
  }
})