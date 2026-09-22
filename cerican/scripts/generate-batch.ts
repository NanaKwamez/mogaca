// scripts/generate-batch.ts
// Simple CLI to invoke generateRemarksForClassTerm via Node (requires env for Supabase)

import { generateRemarksForClassTerm } from '../lib/remarks/batch'

async function main() {
  const [,, classId, termId] = process.argv
  if (!classId || !termId) {
    console.error('Usage: node scripts/generate-batch.js <classId> <termId>')
    process.exit(2)
  }

  try {
    const summary = await generateRemarksForClassTerm(classId, termId, process.env.USER_ID ?? undefined)
    console.log('Batch summary:', JSON.stringify(summary, null, 2))
  } catch (err: any) {
    console.error('Batch failed:', err.message || err)
    process.exit(1)
  }
}

main()
