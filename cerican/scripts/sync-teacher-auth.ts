import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pzhwvjiddmjpdxolgckz.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6aHd2amlkZG1qcGR4b2xnY2t6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc0NjI1MSwiZXhwIjoyMDkzMzIyMjUxfQ.WJ7wuSHZLrx3_KPzB74DJi8C5WgcfN5GRtVkzEZKO7M'

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const teacherEmails = [
  'kennedy.perby@mogasco.edu.gh',
  'evans.amankona@mogasco.edu.gh',
  'gabriel.afful@mogasco.edu.gh',
  'daniel.atsidefe@mogasco.edu.gh',
  'anthony.kokonu@mogasco.edu.gh',
  'bismark.darko@mogasco.edu.gh',
  'samuel.boateng@mogasco.edu.gh',
  'stephen.quaye@mogasco.edu.gh',
]

async function main() {
  console.log('Syncing teacher auth via Supabase Admin API...')

  const { data: users, error: listErr } = await adminSupabase.auth.admin.listUsers()
  if (listErr) {
    console.error('List users error:', listErr)
    return
  }

  const userByEmail = new Map<string, any>()
  for (const u of users.users) {
    if (u.email) userByEmail.set(u.email.toLowerCase(), u)
  }

  for (const email of teacherEmails) {
    const existing = userByEmail.get(email.toLowerCase())
    if (existing) {
      console.log(`Updating password for existing auth user: ${email} (ID: ${existing.id})`)
      const { error: updateErr } = await adminSupabase.auth.admin.updateUserById(existing.id, {
        password: 'Teacher@123',
        email_confirm: true,
      })
      if (updateErr) console.error(`Error updating ${email}:`, updateErr)
      else console.log(`Successfully updated ${email}`)
    } else {
      console.log(`Creating new auth user: ${email}`)
      const { data: created, error: createErr } = await adminSupabase.auth.admin.createUser({
        email,
        password: 'Teacher@123',
        email_confirm: true,
      })
      if (createErr) console.error(`Error creating ${email}:`, createErr)
      else console.log(`Successfully created ${email} (ID: ${created.user.id})`)
    }
  }

  console.log('Done syncing teacher auth.')
}

main().catch(console.error)
