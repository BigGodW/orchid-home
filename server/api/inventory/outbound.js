// server/api/inventory/outbound.js
import { useDatabase } from '~/composables/useDatabase.js'

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
      return {
        success: false,
        message: '该区块暂无此品种的兰花库存'
      }
    }

    const currentQty = inventory[0].quantity
    if (quantity > currentQty) {
      await db.rollback()
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

    // 3. 修复：日志数量改为正数，通过remark区分出库（解决数值越界）
    await db.execute(`
      INSERT INTO inbound_log (block_id, species_id, inbound_quantity, operator, remark, operation_time)
      VALUES (?, ?, ?, 'system', '兰花出库', CURRENT_TIMESTAMP)
    `, [blockId, speciesId, quantity]) // 改为正数，不再用负数

    // 提交事务
    await db.commit()

    return {
      success: true,
      message: `成功出库 ${quantity} 盆，剩余库存 ${newQty} 盆`
    }

  } catch (error) {
    // 事务回滚（仅当db初始化成功）
    if (db) {
      try {
        await db.rollback()
      } catch (rollbackError) {
        console.error('事务回滚失败：', rollbackError)
      }
    }
    
    console.error('出库接口执行失败：', error)
    return {
      success: false,
      message: '出库失败：' + error.message
    }
  } finally {
    // 修复：移除release方法（mysql2的PromiseConnection无此方法）
    // 如需关闭连接，改用end()（仅在单连接模式下使用）
    if (db) {
      try {
        // await db.end() // 仅当你是单连接模式时启用，连接池模式请注释
      } catch (endError) {
        console.error('关闭数据库连接失败：', endError)
      }
    }
  }
})