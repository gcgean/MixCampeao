import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from './pool.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function ensureMigrationsTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,
  )
}

async function getAppliedIds(): Promise<Set<string>> {
  const res = await pool.query<{ id: string }>('SELECT id FROM schema_migrations')
  return new Set(res.rows.map((r) => r.id))
}

async function applyMigration(id: string, sql: string) {
  await pool.query('BEGIN')
  try {
    await pool.query(sql)
    await pool.query('INSERT INTO schema_migrations (id) VALUES ($1)', [id])
    await pool.query('COMMIT')
  } catch (err) {
    await pool.query('ROLLBACK')
    throw err
  }
}

async function main() {
  const migrationsDir = path.resolve(__dirname, '../../migrations')
  await ensureMigrationsTable()
  const applied = await getAppliedIds()

  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b))

  for (const file of files) {
    if (applied.has(file)) continue
    const fullPath = path.join(migrationsDir, file)
    const sql = await fs.readFile(fullPath, 'utf8')
    await applyMigration(file, sql)
    process.stdout.write(`applied ${file}\n`)
  }

  await pool.end()
}

main().catch((err) => {
  process.stderr.write(`${String(err)}\n`)
  process.exit(1)
})

