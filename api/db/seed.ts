import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { pool } from './pool.js'

dotenv.config({ override: true })

function requiredEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`${name} is required`)
  return val
}

async function ensureAdmin() {
  const email = requiredEnv('ADMIN_EMAIL')
  const password = requiredEnv('ADMIN_PASSWORD')
  const name = process.env.ADMIN_NAME || 'Admin'
  const passwordHash = await bcrypt.hash(password, 12)

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, status)
     VALUES ($1, $2, $3, 'admin', 'ACTIVE')
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       password_hash = EXCLUDED.password_hash,
       role = 'admin',
       status = 'ACTIVE'`,
    [name, email, passwordHash],
  )
}

async function ensureDemoData() {
  const segmentRes = await pool.query<{ id: string }>(
    `INSERT INTO segments (code, slug, name, price_pix, teaser, active)
     VALUES ('ACAI', 'acai', 'Açaí', 19.90, 'Lista de compra enxuta pra vender rápido.', true)
     ON CONFLICT (code) DO UPDATE SET
       slug = EXCLUDED.slug,
       name = EXCLUDED.name,
       price_pix = EXCLUDED.price_pix,
       teaser = EXCLUDED.teaser,
       active = true
     RETURNING id`,
  )

  const segmentId = segmentRes.rows[0]?.id
  if (!segmentId) return

  const basesRes = await pool.query<{ id: string }>(
    `INSERT INTO sections (segment_id, name, sort_order)
     VALUES ($1, 'Bases', 1)
     ON CONFLICT (segment_id, name) DO UPDATE SET sort_order = 1
     RETURNING id`,
    [segmentId],
  )
  const addsRes = await pool.query<{ id: string }>(
    `INSERT INTO sections (segment_id, name, sort_order)
     VALUES ($1, 'Adicionais', 2)
     ON CONFLICT (segment_id, name) DO UPDATE SET sort_order = 2
     RETURNING id`,
    [segmentId],
  )

  const basesId = basesRes.rows[0]?.id
  const addsId = addsRes.rows[0]?.id

  const prod1 = await pool.query<{ id: string }>(
    `INSERT INTO products (name, unit)
     VALUES ('Açaí (polpa)', 'kg')
     ON CONFLICT (name) DO UPDATE SET unit = EXCLUDED.unit
     RETURNING id`,
  )
  const prod2 = await pool.query<{ id: string }>(
    `INSERT INTO products (name, unit)
     VALUES ('Leite condensado', 'un')
     ON CONFLICT (name) DO UPDATE SET unit = COALESCE(products.unit, EXCLUDED.unit)
     RETURNING id`,
  )

  const product1Id = prod1.rows[0]?.id
  const product2Id = prod2.rows[0]?.id
  if (!product1Id || !product2Id) return

  await pool.query(
    `INSERT INTO segment_products (
       segment_id,
       section_id,
       product_id,
       qty_ideal_7,
       qty_ideal_15,
       qty_ideal_30,
       qty_ideal_60,
       qty_ideal_90,
       avg_price,
       note
     )
     VALUES
       ($1, $2, $3, 2.8, 6, 12, 24, 36, 18.90, 'alto giro'),
       ($1, $4, $5, 5.6, 12, 24, 48, 72, 6.50, 'upsell')
     ON CONFLICT (segment_id, product_id) DO UPDATE SET
       section_id = EXCLUDED.section_id,
       qty_ideal_7 = EXCLUDED.qty_ideal_7,
       qty_ideal_15 = EXCLUDED.qty_ideal_15,
       qty_ideal_30 = EXCLUDED.qty_ideal_30,
       qty_ideal_60 = EXCLUDED.qty_ideal_60,
       qty_ideal_90 = EXCLUDED.qty_ideal_90,
       avg_price = EXCLUDED.avg_price,
       note = EXCLUDED.note`,
    [segmentId, basesId, product1Id, addsId, product2Id],
  )
}

async function main() {
  await ensureAdmin()
  await ensureDemoData()
  process.stdout.write('seed ok\n')
  await pool.end()
}

main().catch((err) => {
  process.stderr.write(`${String(err)}\n`)
  process.exit(1)
})

