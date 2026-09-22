// db-ddl.mjs - Apply DDL via pg direct connection to Supabase
import pkg from 'pg'
const { Client } = pkg

// Supabase connection via transaction pooler (port 6543)
const client = new Client({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.pzhwvjiddmjpdxolgckz',
  password: 'Mogasco@123',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
})

const steps = [
  // Add variable score columns to scores table
  `ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS classwork_score NUMERIC(5,2)`,
  `ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS homework_score NUMERIC(5,2)`,
  `ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS classtest_score NUMERIC(5,2)`,
  // Add variable weight columns to scoresheet_config
  `ALTER TABLE public.scoresheet_config ADD COLUMN IF NOT EXISTS classwork_max NUMERIC DEFAULT 10`,
  `ALTER TABLE public.scoresheet_config ADD COLUMN IF NOT EXISTS homework_max NUMERIC DEFAULT 10`,
  `ALTER TABLE public.scoresheet_config ADD COLUMN IF NOT EXISTS classtest_max NUMERIC DEFAULT 30`,
  `ALTER TABLE public.scoresheet_config ADD COLUMN IF NOT EXISTS exam_max_new NUMERIC DEFAULT 50`,
  // Update existing config rows
  `UPDATE public.scoresheet_config SET classwork_max = 10, homework_max = 10, classtest_max = 30, exam_max_new = 50 WHERE classwork_max IS NULL`,
  // Migrate existing class_score data into classwork + classtest split
  `UPDATE public.scores SET classwork_score = ROUND(COALESCE(class_score,0)/2.0,2), classtest_score = ROUND(COALESCE(class_score,0)/2.0,2) WHERE classwork_score IS NULL AND class_score IS NOT NULL`,
  // Kennedy: update user_profiles class_id so kennedy.perby@mogasco.edu.gh sees Basic 7 roster
  `UPDATE public.user_profiles SET class_id = '0c708537-2a48-4798-9abd-e3f488cf6450' WHERE id = 'e51863c9-bc73-4f19-865e-7751b4bcfba9' AND class_id IS NULL`,
  // Also update staff record to link kennedy.perby to Basic 7 via user link
  `UPDATE public.staff SET email = 'jhs1@morningglory.edu.gh' WHERE id = '9fab2870-aadc-4655-8c5d-71a2d5f2fad4' AND email = 'kennedy.perby@mogasco.edu.gh'`,
]

async function run() {
  try {
    await client.connect()
    console.log('Connected to Supabase DB')

    for (const sql of steps) {
      try {
        await client.query(sql)
        console.log('OK:', sql.slice(0, 80))
      } catch (err) {
        console.error('FAIL:', sql.slice(0, 80), '→', err.message)
      }
    }

    // Verify
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='scores' ORDER BY ordinal_position")
    console.log('\nScores columns:', res.rows.map(r => r.column_name).join(', '))

    const cfg = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='scoresheet_config' ORDER BY ordinal_position")
    console.log('Config columns:', cfg.rows.map(r => r.column_name).join(', '))

    await client.end()
  } catch (err) {
    console.error('Connection error:', err.message)
    await client.end().catch(() => {})
  }
}
run()
