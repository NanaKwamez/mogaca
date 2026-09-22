import { createServerClient } from '@/lib/supabase/server'

export interface AttendanceSummary {
  days_present: number
  total_days: number
  pct: number
}

export function getSectionFromClass(className?: string | null, sortOrder?: number | null): 'preschool' | 'primary' | 'jhs' {
  if (sortOrder != null) {
    if (sortOrder <= 4) return 'preschool'
    if (sortOrder <= 10) return 'primary'
    return 'jhs'
  }
  const c = (className || '').toUpperCase()
  if (c.includes('NURSERY') || c.includes('KG') || c.includes('KINDERGARTEN')) return 'preschool'
  if (c.includes('JHS') || c.includes('BASIC 7') || c.includes('BASIC 8') || c.includes('BASIC 9') || c.includes('FORM')) return 'jhs'
  return 'primary'
}

export async function getAttendanceSummary(
  studentId: string,
  termId: string,
  classId?: string | null
): Promise<AttendanceSummary> {
  const supabase = createServerClient()

  // 1. Fetch present days count from attendance table for this term
  let attQuery = supabase
    .from('attendance')
    .select('status')
    .eq('student_id', studentId)
    .ilike('status', 'present')

  if (termId) {
    attQuery = attQuery.eq('term_id', termId)
  }

  const { data: presentRows } = await attQuery

  // 2. Fetch from feeding_daily_log as fallback
  const { data: feedingLogRows } = await supabase
    .from('feeding_daily_log')
    .select('status')
    .eq('student_id', studentId)
    .neq('status', 'absent')

  const manualCount = presentRows?.length ?? 0
  const feedingCount = feedingLogRows?.length ?? 0
  const days_present = Math.max(manualCount, feedingCount)

  // 3. Dynamically fetch total school days set by admin for this section/term
  let total_days = 0

  // Check section from class if provided
  let section: 'preschool' | 'primary' | 'jhs' = 'primary'
  if (classId) {
    const { data: cRow } = await supabase
      .from('classes')
      .select('name, sort_order')
      .eq('id', classId)
      .maybeSingle()
    if (cRow) {
      section = getSectionFromClass(cRow.name, cRow.sort_order)
    }
  }

  // Check school_calendar for section
  const { data: calData } = await supabase
    .from('school_calendar')
    .select('total_school_days')
    .eq('term_id', termId)
    .eq('section', section)
    .maybeSingle()

  if (calData?.total_school_days && calData.total_school_days > 0) {
    total_days = calData.total_school_days
  } else {
    // Check terms table
    const { data: termData } = await supabase
      .from('terms')
      .select('total_school_days')
      .eq('id', termId)
      .maybeSingle()

    if (termData?.total_school_days && termData.total_school_days > 0) {
      total_days = termData.total_school_days
    } else {
      // Dynamic fallback: count distinct days recorded in attendance
      const { data: recordedDays } = await supabase
        .from('attendance')
        .select('date')
        .eq('term_id', termId)

      const uniqueDates = new Set((recordedDays ?? []).map(r => r.date)).size
      total_days = uniqueDates > 0 ? uniqueDates : 0
    }
  }

  // If student was present more days than total_days, adjust total_days dynamically
  if (days_present > total_days) {
    total_days = days_present
  }

  const pct = total_days > 0 ? Math.round((days_present / total_days) * 1000) / 10 : 0

  return { days_present, total_days, pct }
}

export async function getBulkAttendanceSummaries(
  studentIds: string[],
  termId: string,
  classId?: string | null,
  className?: string | null
): Promise<Map<string, AttendanceSummary>> {
  const supabase = createServerClient()
  const result = new Map<string, AttendanceSummary>()

  if (studentIds.length === 0) {
    return result
  }

  // 1. Determine Section
  let section: 'preschool' | 'primary' | 'jhs' = getSectionFromClass(className)
  if (classId && !className) {
    const { data: cRow } = await supabase
      .from('classes')
      .select('name, sort_order')
      .eq('id', classId)
      .maybeSingle()
    if (cRow) {
      section = getSectionFromClass(cRow.name, cRow.sort_order)
    }
  }

  // 2. Dynamically fetch total_school_days configured by admin for this section & term
  let total_days = 0

  const { data: calData } = await supabase
    .from('school_calendar')
    .select('total_school_days')
    .eq('term_id', termId)
    .eq('section', section)
    .maybeSingle()

  if (calData?.total_school_days && calData.total_school_days > 0) {
    total_days = calData.total_school_days
  } else {
    // Check terms table
    const { data: termData } = await supabase
      .from('terms')
      .select('total_school_days')
      .eq('id', termId)
      .maybeSingle()

    if (termData?.total_school_days && termData.total_school_days > 0) {
      total_days = termData.total_school_days
    } else {
      // Dynamic fallback: count distinct days recorded in attendance for this term
      let recQuery = supabase
        .from('attendance')
        .select('date')
        .eq('term_id', termId)

      if (classId) {
        recQuery = recQuery.eq('class_id', classId)
      }

      const { data: recordedDays } = await recQuery
      const uniqueDates = new Set((recordedDays ?? []).map(r => r.date)).size
      total_days = uniqueDates > 0 ? uniqueDates : 0
    }
  }

  // 3. Query real attendance records (present) for this term
  const { data: attendanceRows } = await supabase
    .from('attendance')
    .select('student_id, status')
    .in('student_id', studentIds)
    .eq('term_id', termId)
    .ilike('status', 'present')

  // 4. Query feeding_daily_log (present / paid / credit / covered)
  const { data: feedingLogRows } = await supabase
    .from('feeding_daily_log')
    .select('student_id, date, status')
    .in('student_id', studentIds)
    .neq('status', 'absent')

  // 5. Query feeding_fees records (paid / amount > 0)
  const { data: feedingFeesRows } = await supabase
    .from('feeding_fees')
    .select('student_id, payment_date, amount')
    .in('student_id', studentIds)
    .gt('amount', 0)

  const attCounts = new Map<string, number>()
  for (const row of attendanceRows ?? []) {
    const sid = (row as { student_id: string }).student_id
    attCounts.set(sid, (attCounts.get(sid) ?? 0) + 1)
  }

  const feedingLogDates = new Map<string, Set<string>>()
  for (const row of feedingLogRows ?? []) {
    const sid = (row as { student_id: string }).student_id
    const fdate = (row as { date: string }).date
    if (!feedingLogDates.has(sid)) feedingLogDates.set(sid, new Set())
    feedingLogDates.get(sid)!.add(fdate)
  }

  const feedingFeesDates = new Map<string, Set<string>>()
  for (const row of feedingFeesRows ?? []) {
    const sid = (row as { student_id: string }).student_id
    const pdate = (row as { payment_date: string }).payment_date
    if (!feedingFeesDates.has(sid)) feedingFeesDates.set(sid, new Set())
    feedingFeesDates.get(sid)!.add(pdate)
  }

  // 6. Assemble dynamic results
  for (const sid of studentIds) {
    const attCount = attCounts.get(sid) ?? 0
    const logCount = feedingLogDates.get(sid)?.size ?? 0
    const feesCount = feedingFeesDates.get(sid)?.size ?? 0

    const days_present = Math.max(attCount, logCount, feesCount)
    const effectiveTotal = Math.max(total_days, days_present)
    const pct = effectiveTotal > 0 ? Math.round((days_present / effectiveTotal) * 1000) / 10 : 0

    result.set(sid, {
      days_present,
      total_days: effectiveTotal,
      pct,
    })
  }

  return result
}
