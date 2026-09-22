#!/usr/bin/env node
// scripts/check-report-publish.ts
// Usage: ts-node scripts/check-report-publish.ts <classId> <termId>

import { generateReportsForClassTerm } from '../lib/reports/generate.jsx'
import { publishReport } from '../lib/reports/publish'

async function main() {
  const [,, classId, termId] = process.argv
  if (!classId || !termId) {
    console.error('Usage: node scripts/check-report-publish.js <classId> <termId>')
    process.exit(1)
  }

  console.log('Generating report snapshots for', classId, termId)
  const gen = await generateReportsForClassTerm(classId, termId, 'cli-check')
  console.log('Generate summary', gen)

  // Try publishing the first report found
  const supabase = (await import('../lib/supabase/server')).createServerClient()
  const { data: reports } = await supabase.from('student_reports').select('id').eq('class_id', classId).eq('term_id', termId).limit(1)
  if (reports && reports.length > 0) {
    const rid = reports[0].id
    console.log('Publishing report', rid)
    const res = await publishReport(rid, 'cli-check')
    console.log('Publish result', res)
  } else {
    console.log('No reports found to publish')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
