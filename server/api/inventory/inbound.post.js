// server/api/inventory/inbound.post.js
import { useDatabase } from '~/composables/useDatabase.js'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const db = await useDatabase(config.db)
    const body = await readBody(event)
    const { blockId, speciesName, quantity } = body

    // 基础参数校验
    if (!blockId || !speciesName || !quantity || quantity < 1) {
      throw createError({
        statusCode: 400,
        statusMessage: '参数错误：品种名称和数量不能为空，数量必须大于0'
      })
    }

    // 1. 检查区块是否合法（兼容手动配置的is_restricted）
    const [block] = await db.execute(
      'SELECT is_restricted FROM warehouse_block WHERE id = ?',
      [blockId]
    )
    
    if (!block.length) {
      throw createError({ statusCode: 404, statusMessage: '区块不存在' })
    }
    
    if (block[0].is_restricted) {
      throw createError({ statusCode: 400, statusMessage: '该区块为受限区域（直播间/平台），不可入库' })
    }

    // 2. 检查/创建兰花品种
    let [species] = await db.execute(
      'SELECT id FROM orchid_species WHERE species_name = ?',
      [speciesName]
    )

    let speciesId
    if (!species.length) {
      const [result] = await db.execute(
        'INSERT INTO orchid_species (species_name) VALUES (?)',
        [speciesName]
      )
      speciesId = result.insertId
    } else {
      speciesId = species[0].id
    }

    // 3. 单区块最多132盆校验
    const MAX_PER_BLOCK = 132
    const [current] = await db.execute(`
      SELECT IFNULL(SUM(quantity), 0) AS total
      FROM orchid_inventory
      WHERE block_id = ?
    `, [blockId])

    const currentTotal = parseInt(current[0].total || 0)
    if (currentTotal + quantity > MAX_PER_BLOCK) {
      throw createError({
        statusCode: 400,
        statusMessage: `该区块最多只能放 ${MAX_PER_BLOCK} 盆，当前已放 ${currentTotal} 盆，无法再入库 ${quantity} 盆`
      })
    }

    // 4. 入库操作（新增/累加）
    const [existing] = await db.execute(
      'SELECT id, quantity FROM orchid_inventory WHERE block_id = ? AND species_id = ?',
      [blockId, speciesId]
    )

    if (existing.length > 0) {
      await db.execute(
        'UPDATE orchid_inventory SET quantity = quantity + ? WHERE id = ?',
        [quantity, existing[0].id]
      )
    } else {
      await db.execute(
        'INSERT INTO orchid_inventory (block_id, species_id, quantity) VALUES (?, ?, ?)',
        [blockId, speciesId, quantity]
      )
    }

    // 5. 记录入库日志
    await db.execute(`
      INSERT INTO inbound_log (block_id, species_id, inbound_quantity, remark) 
      VALUES (?, ?, ?, ?)
    `, [blockId, speciesId, quantity, `自动入库：${speciesName}`])

    return {
      success: true,
      message: '入库成功'
    }
  } catch (error) {
    console.error('入库失败：', error)
    return {
      success: false,
      message: error.message || '入库失败'
    }
  }
})