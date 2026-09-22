// lib/remarks/generate.ts
// Main deterministic remark generation flow

import { classifyStudent } from './classify'
import { fetchTemplatesForPattern } from './templates'
import { pickVariant } from './variants'
import { renderTemplates, validateRenderedRemark } from './placeholders'
import type { StudentProfileForRemark, GenerateResult } from './types'
import { createServerClient } from '@/lib/supabase/server'

export async function generateRemark(
  profile: StudentProfileForRemark,
  remarkType: 'headteacher' | 'class_teacher',
  termId: string,
  options?: { primaryVariantIndex?: number; secondaryVariantIndex?: number }
): Promise<GenerateResult> {
  // Minimal profile validation
  if (!profile || !profile.id) {
    return { status: 'MANUAL_REVIEW_REQUIRED', reason: 'Incomplete profile' }
  }

  const supabase = createServerClient()

  // Fetch student's scores for the term
  const { data: scores, error: scoresErr } = await supabase
    .from('scores')
    .select('subject_id, total_score, class_score, exam_score')
    .eq('student_id', profile.id)
    .eq('term_id', termId)

  if (scoresErr) {
    return { status: 'MANUAL_REVIEW_REQUIRED', reason: 'Failed to fetch scores: ' + scoresErr.message }
  }

  const validTotalScores = (scores || []).filter((s: any) => s.total_score !== null && s.total_score !== undefined)
  if (validTotalScores.length === 0) {
    return { status: 'MANUAL_REVIEW_REQUIRED', reason: 'No complete scores for term' }
  }

  const averageScore = validTotalScores.reduce((acc: number, s: any) => acc + Number(s.total_score), 0) / validTotalScores.length
  const classworkVals = (scores || []).filter((s: any) => s.class_score !== null && s.class_score !== undefined).map((s: any) => Number(s.class_score))
  const examVals = (scores || []).filter((s: any) => s.exam_score !== null && s.exam_score !== undefined).map((s: any) => Number(s.exam_score))
  const classwork_average = classworkVals.length > 0 ? classworkVals.reduce((a: number, b: number) => a + b, 0) / classworkVals.length : null
  const exam_average = examVals.length > 0 ? examVals.reduce((a: number, b: number) => a + b, 0) / examVals.length : null

  // Helper to compute subject group average
  async function groupAverage(groupKey: string): Promise<number | null> {
    // Find the subject_group id
    const { data: groups } = await supabase
      .from('subject_groups')
      .select('id')
      .eq('group_key', groupKey)
      .limit(1)

    if (!groups || groups.length === 0) return null
    const groupId = groups[0].id

    const { data: members } = await supabase
      .from('subject_group_members')
      .select('subject_id')
      .eq('subject_group_id', groupId)

    if (!members || members.length === 0) return null
    const subjectIds = members.map((m: any) => m.subject_id)

    const scoresForGroup = (scores || []).filter((s: any) => subjectIds.includes(s.subject_id) && s.total_score !== null && s.total_score !== undefined)
    if (scoresForGroup.length === 0) return null
    return scoresForGroup.reduce((a: number, b: any) => a + Number(b.total_score), 0) / scoresForGroup.length
  }

  const verbal_average = await groupAverage('VERBAL')
  const numerical_average = await groupAverage('NUMERICAL')
  const practical_average = await groupAverage('PRACTICAL')
  const theory_average = await groupAverage('THEORY')

  // Build classification input
  const classificationInput = {
    averageScore: Math.round(averageScore * 100) / 100,
    verbal_average: verbal_average !== null ? Math.round(verbal_average * 100) / 100 : null,
    numerical_average: numerical_average !== null ? Math.round(numerical_average * 100) / 100 : null,
    practical_average: practical_average !== null ? Math.round(practical_average * 100) / 100 : null,
    theory_average: theory_average !== null ? Math.round(theory_average * 100) / 100 : null,
    classwork_average: classwork_average !== null ? Math.round(classwork_average * 100) / 100 : null,
    exam_average: exam_average !== null ? Math.round(exam_average * 100) / 100 : null,
    attendance_pct: profile.attendance_pct ?? null,
    position_this_term: profile.cur_pos ?? null,
    position_last_term: profile.prev_pos ?? null,
    total_students: profile.total_students ?? 1,
    gender: profile.gender,
    division: profile.division ?? ''
  }

  try {
    const classifications = classifyStudent(classificationInput as any, {
      verbal_numerical_diff: 15,
      practical_theory_diff: 15,
      classwork_exam_diff: 15,
      consistent_spread: 10,
      inconsistent_spread: 30,
      low_attendance_pct: 80,
      excellent_attendance_pct: 95,
      trend_position_change: 3,
    })

    const primaryKey = classifications.primary_pattern
    const secondaryKey = classifications.secondary_pattern

    // Pick primary template deterministically
    const primaryTemplates = await fetchTemplatesForPattern(primaryKey, 'primary', remarkType, profile.gender, profile.division ?? null)
    if (!primaryTemplates || primaryTemplates.length === 0) {
      return { status: 'MANUAL_REVIEW_REQUIRED', reason: `No templates for primary pattern ${primaryKey}` }
    }

    const primaryPick = await pickVariant(primaryKey, 'primary', remarkType, profile.gender, profile.division ?? null, profile.id, options?.primaryVariantIndex)
    if (!primaryPick.success) return { status: 'MANUAL_REVIEW_REQUIRED', reason: primaryPick.error }

    let templatesToRender = [
      {
        id: primaryPick.template_id,
        variant_text: primaryPick.variant_text,
        variant_index: primaryPick.variant_index,
        template_version: primaryPick.template_version,
        max_chars: primaryTemplates[0]?.max_chars ?? 200
      }
    ]

    if (secondaryKey) {
      const secondaryTemplates = await fetchTemplatesForPattern(secondaryKey, 'secondary', remarkType, profile.gender, profile.division ?? null)
      if (secondaryTemplates && secondaryTemplates.length > 0) {
        const secondaryPick = await pickVariant(secondaryKey, 'secondary', remarkType, profile.gender, profile.division ?? null, profile.id, options?.secondaryVariantIndex)
        if (secondaryPick.success) {
          templatesToRender.push({
            id: secondaryPick.template_id,
            variant_text: secondaryPick.variant_text,
            variant_index: secondaryPick.variant_index,
            template_version: secondaryPick.template_version,
            max_chars: secondaryTemplates[0]?.max_chars ?? 200
          })
        }
      }
    }

    const { text, max_chars } = renderTemplates(templatesToRender as any, profile)
    const final = validateRenderedRemark(text, max_chars)

    return {
      status: 'GENERATED',
      remark: final,
      primaryKey,
      secondaryKey,
      primaryTemplateId: templatesToRender[0]?.id ?? null,
      secondaryTemplateId: templatesToRender[1]?.id ?? null
    }
  } catch (err: any) {
    return { status: 'MANUAL_REVIEW_REQUIRED', reason: err?.message ?? String(err) }
  }
}
