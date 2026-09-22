// scripts/remarks-selftest.ts
// Simple Node script to run local checks for classify and placeholder rendering without DB

import { classifyStudent, scoreTier } from '../lib/remarks/classify'
import { renderTemplates, validateRenderedRemark } from '../lib/remarks/placeholders'

async function run() {
  console.log('Running remarks self-test...')

  const sampleInput = {
    averageScore: 82,
    verbal_average: 88,
    numerical_average: 60,
    practical_average: 70,
    theory_average: 68,
    classwork_average: 78,
    exam_average: 86,
    attendance_pct: 96,
    position_this_term: 1,
    position_last_term: 3,
    total_students: 30,
    gender: 'Male',
    division: 'Primary'
  }

  const thresholds = {
    verbal_numerical_diff: 15,
    practical_theory_diff: 15,
    classwork_exam_diff: 15,
    consistent_spread: 10,
    inconsistent_spread: 30,
    low_attendance_pct: 80,
    excellent_attendance_pct: 95,
    trend_position_change: 3,
  }

  const cls = classifyStudent(sampleInput as any, thresholds as any)
  console.log('Classification result:', cls)

  // Placeholder rendering
  const templates = [
    { id: 't1', variant_text: '{{name}} has done very well this term.', variant_index: 1, template_version: 1, max_chars: 200 } as any,
    { id: 't2', variant_text: 'Improved position: previously {{prev_pos}}, now {{cur_pos}}.', variant_index: 1, template_version: 1, max_chars: 200 } as any,
  ]

  const profile = {
    id: 'stu-1',
    first_name: 'Kwame',
    surname: 'Mensah',
    gender: 'Male',
    division: 'Primary',
    prev_pos: 3,
    cur_pos: 1,
    total_students: 30,
    attendance_pct: 96,
    strong_subject: 'English',
    focus_area: 'Mathematics'
  }

  const { text, max_chars } = renderTemplates(templates as any, profile as any)
  console.log('Rendered:', text)

  try {
    const final = validateRenderedRemark(text, max_chars)
    console.log('Validation passed:', final)
  } catch (err: any) {
    console.error('Validation failed:', err.message)
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
