// server/api/inventory/outbound.js
import { useDatabase, releaseConnection } from '~/composables/useDatabase.js'

export default defineEventHandler(async (event) => {
  let db = null
  
  try {
    const body = await readBody(event)
    const { blockId, speciesId, quantity } = body

    // 参数校验
    if (!blockId || !speciesId || !quantity || quantity <= 0) {
      return {
        success: false,
        message: '参数错误：区块ID、品种ID、出库数量（大于0）不能为空'
      }
    }

    // 初始化数据库连接
    const config = useRuntimeConfig()
    db = await useDatabase(config.db)

    // 开启事务
    await db.beginTransaction()

    // 1. 查询当前库存
    const [inventory] = await db.execute(`
      SELECT quantity FROM orchid_inventory 
      WHERE block_id = ? AND species_id = ?
    `, [blockId, speciesId])

    if (inventory.length === 0) {
      await db.rollback()
      releaseConnection(db) // 修复：库存不存在时释放连接
      return {
        success: false,
        message: '该区块暂无此品种的兰花库存'
      }
    }

    const currentQty = inventory[0].quantity
    if (quantity > currentQty) {
      await db.rollback()
      releaseConnection(db) // 出库数量超限释放连接
      return {
        success: false,
        message: `出库数量超过当前库存（当前：${currentQty} 盆）`
      }
    }

    // 2. 计算新库存并更新
    const newQty = currentQty - quantity

    if (newQty === 0) {
      // 库存为0，删除记录
      await db.execute(`
        DELETE FROM orchid_inventory 
        WHERE block_id = ? AND species_id = ?
      `, [blockId, speciesId])
    } else {
      // 库存不为0，更新数量
      await db.execute(`
        UPDATE orchid_inventory 
        SET quantity = ?, update_time = CURRENT_TIMESTAMP 
        WHERE block_id = ? AND species_id = ?
      `, [newQty, blockId, speciesId])
    }

    // 3. 记录出库日志（正数+备注区分）
    await db.execute(`
      INSERT INTO inbound_log (block_id, species_id, inbound_quantity, operator, remark, operation_time)
      VALUES (?, ?, ?, 'system', '兰花出库', CURRENT_TIMESTAMP)
    `, [blockId, speciesId, quantity])

    // 提交事务
    await db.commit()
    releaseConnection(db) // 事务成功提交后释放连接
    return {
      success: true,
      message: `成功出库 ${quantity} 盆，剩余库存 ${newQty} 盆`
    }

  } catch (error) {
    // 事务回滚 + 释放连接
    if (db) {
      try {
        await db.rollback()
      } catch (rollbackError) {
        console.error('事务回滚失败：', rollbackError)
      }
      releaseConnection(db) // 异常时必须释放连接！
    }
    
    console.error('出库接口执行失败：', error)
    return {
      success: false,
      message: '出库失败：' + error.message
    }
  }
})