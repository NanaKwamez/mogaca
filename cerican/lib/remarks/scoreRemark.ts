// lib/remarks/scoreRemark.ts
// Server-side dynamic remark generation using remark_score_rules, remark_attendance_rules, and remark_templates.
// Deterministic and personalized with student name and pronouns.

import { createServerClient } from '@/lib/supabase/server'

// Normalize a class name like "Nursery 1", "Primary 3", "JHS 2", "KG 1" → level key
export function classNameToLevel(className: string): string {
  const c = className.trim().toUpperCase()
  if (c.includes('NURSERY 1') || c.includes('NURSERY1')) return 'nursery_1'
  if (c.includes('NURSERY 2') || c.includes('NURSERY2')) return 'nursery_2'
  if (c.includes('KG 1') || c.includes('KG1') || c.includes('KINDERGARTEN 1')) return 'kg_1'
  if (c.includes('KG 2') || c.includes('KG2') || c.includes('KINDERGARTEN 2')) return 'kg_2'
  if (c.includes('PRIMARY 1') || c.includes('BASIC 1') || c.includes('CLASS 1')) return 'primary_1'
  if (c.includes('PRIMARY 2') || c.includes('BASIC 2') || c.includes('CLASS 2')) return 'primary_2'
  if (c.includes('PRIMARY 3') || c.includes('BASIC 3') || c.includes('CLASS 3')) return 'primary_3'
  if (c.includes('PRIMARY 4') || c.includes('BASIC 4') || c.includes('CLASS 4')) return 'primary_4'
  if (c.includes('PRIMARY 5') || c.includes('BASIC 5') || c.includes('CLASS 5')) return 'primary_5'
  if (c.includes('PRIMARY 6') || c.includes('BASIC 6') || c.includes('CLASS 6')) return 'primary_6'
  if (c.includes('JHS 1') || c.includes('BASIC 7') || c.includes('FORM 1')) return 'jhs_1'
  if (c.includes('JHS 2') || c.includes('BASIC 8') || c.includes('FORM 2')) return 'jhs_2'
  if (c.includes('JHS 3') || c.includes('BASIC 9') || c.includes('FORM 3')) return 'jhs_3'
  return 'primary_1' // fallback
}

// Normalize a subject name → level_subjects.subject key
function subjectNameToKey(name: string): string {
  const n = name.toLowerCase().trim()
  if (n.includes('mathemat') || n === 'maths' || n === 'math') return 'maths'
  if (n.includes('english')) return 'english'
  if (n.includes('science')) return 'science'
  if (n.includes('computing') || n.includes('ict')) return 'computing'
  if (n.includes('creative') || n.includes('c. art') || n.includes('c art') || n.includes('c_art')) return 'creative_art'
  if (n.includes('religious') || n === 'rme' || n === 'r.m.e') return 'rme'
  if (n.includes('history')) return 'history'
  if (n.includes('twi') || n.includes('ghanaian language')) return 'twi'
  if (n.includes('social') || n.includes('owop') || n.includes('our world')) return 'social'
  if (n.includes('career') || n.includes('tech')) return 'career_tech'
  if (n.includes('literacy')) return 'literacy'
  if (n.includes('numeracy')) return 'numeracy'
  if (n.includes('creativity')) return 'creativity'
  if (n.includes('phoenix')) return 'phoenix'
  if (n.includes('colour')) return 'colouring'
  if (n.includes('phonetics')) return 'phonetics'
  if (n.includes('storytelling') || n.includes('picture reading')) return 'storytelling'
  if (n.includes('singing') || n.includes('dancing')) return 'singing_dancing'
  if (n.includes('painting')) return 'painting'
  if (n.includes('sound')) return 'sound'
  return n.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

export interface SubjectScoreForRemark {
  subject_name: string
  total_score: number | null
  grade?: string | null
}

export interface GeneratedRemarks {
  teacherRemark: string
  headmasterRemark: string
  interest: string
  conduct: string
}

export async function generateScoreBasedRemarks(
  studentId: string,
  studentName: string,
  gender: string,
  className: string,
  subjects: SubjectScoreForRemark[],
  attendancePct: number | null,
  totalStudentsInClass: number,
  classRank: number | null
): Promise<GeneratedRemarks> {
  const supabase = createServerClient()
  const level = classNameToLevel(className)

  // Find strong and weak subjects
  const scoredSubjects = subjects
    .filter(s => s.total_score != null && !isNaN(Number(s.total_score)))
    .map(s => ({ ...s, score: Number(s.total_score) }))
    .sort((a, b) => b.score - a.score)

  // Dynamic Interest from top-performing areas
  let interest = "GENERAL STUDIES"
  if (scoredSubjects.length > 0) {
    const top = scoredSubjects[0]
    const second = scoredSubjects.length > 1 ? scoredSubjects[1] : null
    if (second && second.score >= 70 && top.score >= 70) {
      interest = `${top.subject_name.toUpperCase()} & ${second.subject_name.toUpperCase()}`
    } else {
      interest = top.subject_name.toUpperCase()
    }
  }

  // Dynamic Conduct
  let conduct = "SATISFACTORY"
  if (attendancePct !== null) {
    if (attendancePct >= 95) conduct = "EXCELLENT"
    else if (attendancePct >= 80) conduct = "VERY GOOD"
    else if (attendancePct >= 65) conduct = "SATISFACTORY"
    else conduct = "NEEDS ATTENTION"
  } else {
    // If attendance not recorded yet, infer from rank / score if available
    const topScore = scoredSubjects[0]?.score ?? 0
    if (topScore >= 80) conduct = "EXCELLENT"
    else if (topScore >= 60) conduct = "VERY GOOD"
    else conduct = "SATISFACTORY"
  }

  // Candidate patterns from rules
  const candidatePatternKeys: { key: string; priority: number }[] = []

  // Check rules for each subject
  for (const sub of scoredSubjects) {
    const subKey = subjectNameToKey(sub.subject_name)

    const { data: rules } = await supabase
      .from('remark_score_rules')
      .select('pattern_key, priority')
      .eq('subject', subKey)
      .eq('level', level)
      .eq('is_active', true)
      .lte('min_score', sub.score)
      .gte('max_score', sub.score)
      .order('priority', { ascending: false })
      .limit(1)

    if (rules && rules.length > 0) {
      candidatePatternKeys.push({ key: rules[0].pattern_key, priority: rules[0].priority })
    }
  }

  // Check attendance rules
  if (attendancePct !== null) {
    const { data: attRules } = await supabase
      .from('remark_attendance_rules')
      .select('pattern_key, priority')
      .eq('is_active', true)
      .lte('min_attendance_pct', attendancePct)
      .gte('max_attendance_pct', attendancePct)
      .order('priority', { ascending: false })
      .limit(1)

    if (attRules && attRules.length > 0) {
      candidatePatternKeys.push({ key: attRules[0].pattern_key, priority: attRules[0].priority })
    }
  }

  // Check overall performance tiers
  const avg = scoredSubjects.length > 0
    ? scoredSubjects.reduce((acc, x) => acc + x.score, 0) / scoredSubjects.length
    : 0

  if (avg >= 80) {
    candidatePatternKeys.push({ key: 'HIGH_ACHIEVER', priority: 3 })
  } else if (avg >= 70) {
    candidatePatternKeys.push({ key: 'ABOVE_AVERAGE', priority: 2 })
  } else if (avg >= 50) {
    candidatePatternKeys.push({ key: 'AVERAGE', priority: 1 })
  } else if (avg > 0) {
    candidatePatternKeys.push({ key: 'BELOW_AVERAGE', priority: 2 })
  }

  // Deduplicate and prioritize
  const uniqueKeys = Array.from(new Set(candidatePatternKeys.map(k => k.key)))
  const sortedKeys = uniqueKeys.sort((a, b) => {
    const prioA = candidatePatternKeys.find(k => k.key === a)?.priority ?? 1
    const prioB = candidatePatternKeys.find(k => k.key === b)?.priority ?? 1
    return prioB - prioA
  })

  const primaryKey = sortedKeys[0] || (avg >= 60 ? 'ABOVE_AVERAGE' : 'AVERAGE')
  const secondaryKey = sortedKeys.find(k => k !== primaryKey) || null

  // Fetch teacher and headmaster remarks
  const teacherRemark = await fetchRemarkText(supabase, primaryKey, secondaryKey, 'class_teacher', gender, studentName, studentId)
  const headmasterRemark = await fetchRemarkText(supabase, primaryKey, secondaryKey, 'headteacher', gender, studentName, studentId)

  return {
    teacherRemark,
    headmasterRemark,
    interest,
    conduct,
  }
}

async function fetchRemarkText(
  supabase: any,
  primaryKey: string,
  secondaryKey: string | null,
  remarkType: 'class_teacher' | 'headteacher',
  gender: string,
  studentName: string,
  studentId: string
): Promise<string> {
  const gNorm = (gender || '').trim().toLowerCase()
  const isFemale = gNorm === 'female' || gNorm === 'f'
  const isMale = gNorm === 'male' || gNorm === 'm'

  const pronouns = isFemale
    ? { they: 'she', them: 'her', their: 'her' }
    : isMale
    ? { they: 'he', them: 'him', their: 'his' }
    : { they: 'they', them: 'them', their: 'their' }

  const genderOptions = isFemale ? ['Female', 'Any'] : isMale ? ['Male', 'Any'] : ['Any']

  // 1. Try primary pattern
  let primaryText = ""
  for (const g of genderOptions) {
    const { data } = await supabase
      .from('remark_templates')
      .select('variant_text')
      .eq('pattern_key', primaryKey)
      .eq('clause_slot', 'primary')
      .eq('remark_type', remarkType)
      .eq('is_active', true)
      .eq('gender', g)
      .order('variant_index', { ascending: true })

    if (data && data.length > 0) {
      const idx = Math.abs(hashCode(studentId + primaryKey)) % data.length
      primaryText = data[idx].variant_text
      break
    }
  }

  // Fallback for primary if specific pattern didn't return templates
  if (!primaryText) {
    const { data: fb } = await supabase
      .from('remark_templates')
      .select('variant_text')
      .in('pattern_key', ['ABOVE_AVERAGE', 'AVERAGE', 'HIGH_ACHIEVER'])
      .eq('clause_slot', 'primary')
      .eq('remark_type', remarkType)
      .eq('is_active', true)
      .order('variant_index', { ascending: true })

    if (fb && fb.length > 0) {
      const idx = Math.abs(hashCode(studentId)) % fb.length
      primaryText = fb[idx].variant_text
    } else {
      primaryText = remarkType === 'headteacher'
        ? 'A commendable performance this term. Keep up the high standards.'
        : 'Good effort and steady progress shown throughout the term.'
    }
  }

  // 2. Try secondary pattern (if available and slot = secondary)
  let secondaryText = ""
  if (secondaryKey) {
    for (const g of genderOptions) {
      const { data } = await supabase
        .from('remark_templates')
        .select('variant_text')
        .eq('pattern_key', secondaryKey)
        .eq('clause_slot', 'secondary')
        .eq('remark_type', remarkType)
        .eq('is_active', true)
        .eq('gender', g)
        .order('variant_index', { ascending: true })

      if (data && data.length > 0) {
        const idx = Math.abs(hashCode(studentId + secondaryKey)) % data.length
        secondaryText = data[idx].variant_text
        break
      }
    }
  }

  // Combine clauses
  let combined = secondaryText ? `${primaryText} ${secondaryText}` : primaryText

  // Replace placeholders dynamically
  combined = combined
    .replace(/{{\s*name\s*}}/gi, studentName || 'The student')
    .replace(/{{\s*they\s*}}/gi, pronouns.they)
    .replace(/{{\s*them\s*}}/gi, pronouns.them)
    .replace(/{{\s*their\s*}}/gi, pronouns.their)
    .replace(/{{[^}]+}}/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return combined
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32bit integer
  }
  return hash
}
