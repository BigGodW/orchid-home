// server/api/orchid/summary.js
import { useDatabase,releaseConnection  } from '~/composables/useDatabase.js'

export default defineEventHandler(async (event) => {
  let db = null
  try {
    // 初始化数据库连接
    const config = useRuntimeConfig()
    db = await useDatabase(config.db)

    // 1. 查询全局统计数据
    // 总库存、总品种数、总占用区块数
    const [globalStats] = await db.execute(`
      SELECT 
        COALESCE(SUM(i.quantity), 0) AS total_quantity,
        COUNT(DISTINCT i.species_id) AS total_species,
        COUNT(DISTINCT i.block_id) AS total_blocks
      FROM orchid_inventory i
    `)

    const globalData = globalStats[0] || {
      total_quantity: 0,
      total_species: 0,
      total_blocks: 0
    }

    // 2. 查询按品种汇总的数据（核心）
    const [speciesSummary] = await db.execute(`
      SELECT 
        s.id AS species_id,
        s.species_name,
        SUM(i.quantity) AS total_quantity,
        COUNT(DISTINCT i.block_id) AS block_count
      FROM orchid_species s
      LEFT JOIN orchid_inventory i ON s.id = i.species_id
      WHERE i.quantity > 0 OR i.quantity IS NOT NULL
      GROUP BY s.id, s.species_name
      ORDER BY total_quantity DESC
    `)

    // 3. 为每个品种补充详细的区块分布信息
    const speciesList = await Promise.all(
      speciesSummary.map(async (species) => {
        // 查询该品种的所有存放区块
        const [blockDetails] = await db.execute(`
          SELECT 
            b.id AS block_id,
            b.block_code,
            i.quantity,
            -- 计算区块容量使用率（单区块最大132盆）
            ROUND((i.quantity / 132) * 100, 1) AS usage_rate
          FROM orchid_inventory i
          LEFT JOIN warehouse_block b ON i.block_id = b.id
          WHERE i.species_id = ?
          ORDER BY i.quantity DESC
        `, [species.species_id])

        // 提取主要区块（前3个）
        const main_blocks = blockDetails.slice(0, 3).map(item => item.block_code)
        // 找到库存最多的区块
        const top_block = blockDetails.length > 0 ? blockDetails[0].block_code : ''

        return {
          ...species,
          main_blocks, // 主要存放区块（前3个）
          top_block,   // 库存最多的区块
          block_details: blockDetails // 完整的区块分布详情
        }
      })
    )

    // 组装最终返回数据
    releaseConnection(db) // 查询完成后释放连接回连接池
    return {
      success: true,
      data: {
        // 全局统计
        total_quantity: Number(globalData.total_quantity),
        total_species: Number(globalData.total_species),
        total_blocks: Number(globalData.total_blocks),
        // 品种列表（含区块详情）
        species_list: speciesList
      }
    }

  } catch (error) {
    if(db){
      releaseConnection(db) // 确保在发生错误时也释放连接
    }
    console.error('兰花汇总API执行失败：', error)
    return {
      success: false,
      message: '加载兰花汇总数据失败：' + error.message,
      data: {
        total_quantity: 0,
        total_species: 0,
        total_blocks: 0,
        species_list: []
      }
    }
  } finally {
    // 关闭数据库连接（根据实际连接方式调整，连接池可注释）
    if (db) {
      try {
        // await db.end() // 单连接模式启用，连接池模式注释
      } catch (endError) {
        console.error('关闭数据库连接失败：', endError)
      }
    }
  }
})