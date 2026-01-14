import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config({ override: true })

const { Pool } = pg

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

export const pool = new Pool({
  connectionString: databaseUrl,
})

