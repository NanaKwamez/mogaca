"use server"

import { createServerClient } from "@/lib/supabase/server"
import { computeGrade, GES_STANDARD_BANDS } from "@/lib/scoring/grades"
import { recomputeSubjectPositions } from "@/lib/scoring/positions"
import { calculateFinalGrade, RAW_MAX_SCORES, validateWeights, AssessmentWeights, DEFAULT_WEIGHTS } from "@/lib/scoring/weighted"
import { z } from "zod"

// Score save schema — raw scores entered by teachers
const scoreSaveSchema = z.object({
  student_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  term_id: z.string().uuid(),
  classwork_score: z.number().min(0).max(RAW_MAX_SCORES.classwork).nullable().optional(),
  homework_score: z.number().min(0).max(RAW_MAX_SCORES.homework).nullable().optional(),
  classtest_score: z.number().min(0).max(RAW_MAX_SCORES.classtest).nullable().optional(),
  exam_score: z.number().min(0).max(RAW_MAX_SCORES.exam).nullable().optional(),
  class_score: z.number().min(0).nullable().optional(),
})

export type ScoreSaveResult =
  | { success: true; total_score: number | null; grade: string | null; class_score: number | null; exam_score: number | null }
  | { success: false; error: string }

export async function saveScore(formData: unknown): Promise<ScoreSaveResult> {
  const parsed = scoreSaveSchema.safeParse(formData)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const { student_id, subject_id, term_id, classwork_score, homework_score, classtest_score, exam_score } = parsed.data

  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: "Unauthenticated" }

  // Verify submission is not locked
  const { data: submission } = await supabase
    .from("scoresheet_submissions")
    .select("status")
    .eq("subject_id", subject_id)
    .eq("term_id", term_id)
    .maybeSingle()

  if (submission?.status === "LOCKED") {
    return { success: false, error: "Scoresheet is locked by administration and cannot be edited." }
  }

  // Fetch weights configuration from scoresheet_config (or default)
  const { data: config } = await supabase
    .from("scoresheet_config")
    .select("columns, hw_weight, cw_weight, ct_weight, exam_weight")
    .eq("term_id", term_id)
    .maybeSingle()

  const configCols = (config?.columns as any) || {}
  const weights: AssessmentWeights = {
    hwWeight: Number(config?.hw_weight ?? configCols.hw_weight ?? configCols.homework_max ?? DEFAULT_WEIGHTS.hwWeight),
    cwWeight: Number(config?.cw_weight ?? configCols.cw_weight ?? configCols.classwork_max ?? DEFAULT_WEIGHTS.cwWeight),
    ctWeight: Number(config?.ct_weight ?? configCols.ct_weight ?? configCols.classtest_max ?? DEFAULT_WEIGHTS.ctWeight),
    examWeight: Number(config?.exam_weight ?? configCols.exam_weight ?? configCols.exam_max ?? DEFAULT_WEIGHTS.examWeight),
  }

  // Calculate normalized weighted scores
  const calc = calculateFinalGrade(
    {
      homework_score: homework_score ?? null,
      classwork_score: classwork_score ?? null,
      classtest_score: classtest_score ?? null,
      exam_score: exam_score ?? null,
    },
    weights
  )

  let grade: string | null = null

  if (calc.totalScore !== null) {
    // Fetch active grading schema or fall back to standard GES
    const { data: ctx } = await supabase.from("school_current_context").select("school_id").limit(1).single()
    const schoolId = ctx?.school_id ?? "6caa6780-29ba-4e94-93b4-5a450fc7ccbc"
    
    const { data: schema } = await supabase
      .from("grading_schemas")
      .select("bands")
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .maybeSingle()

    const bands = schema?.bands || GES_STANDARD_BANDS
    const result = computeGrade(calc.totalScore, bands)
    if (result.success) {
      grade = result.grade
    }
  }

  // Encode component raw & weighted breakdown in subject_remark JSON
  const scoreMetaData = JSON.stringify({
    cw: calc.raw.classwork,
    hw: calc.raw.homework,
    ct: calc.raw.classtest,
    rawExam: calc.raw.exam,
    cw_w: calc.weighted.classwork,
    hw_w: calc.weighted.homework,
    ct_w: calc.weighted.classtest,
    exam_w: calc.weighted.exam,
    weights,
  })

  // Upsert score row
  const { error: upsertErr } = await supabase
    .from("scores")
    .upsert({
      student_id,
      subject_id,
      term_id,
      class_score: calc.classScore,
      exam_score: calc.examScore,
      total_score: calc.totalScore,
      grade,
      subject_remark: scoreMetaData,
      entered_by: session.user.id,
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "student_id,subject_id,term_id" })

  if (upsertErr) return { success: false, error: "Failed to save score: " + upsertErr.message }

  return {
    success: true,
    total_score: calc.totalScore,
    grade,
    class_score: calc.classScore,
    exam_score: calc.examScore,
  }
}

// Submit scoresheet → transition status and recompute positions transactionally
export type SubmitSheetResult =
  | { success: true; positions_updated: number }
  | { success: false; error: string }

export async function submitScoresheet(
  subjectId: string,
  classId: string,
  termId: string
): Promise<SubmitSheetResult> {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: "Unauthenticated" }

  // Resolve staff ID for teacher_id foreign key
  let staffId: string | null = null
  const { data: staffRow } = await supabase
    .from("staff")
    .select("id")
    .or(`user_id.eq.${session.user.id},email.ilike.${session.user.email ?? ""}`)
    .maybeSingle()

  if (staffRow) {
    staffId = staffRow.id
  }

  // Upsert submission record to SUBMITTED
  const { error: statusErr } = await supabase
    .from("scoresheet_submissions")
    .upsert({
      subject_id: subjectId,
      class_id: classId,
      term_id: termId,
      teacher_id: staffId,
      status: "SUBMITTED",
      submitted_at: new Date().toISOString(),
    }, { onConflict: "subject_id,class_id,term_id" })

  if (statusErr) return { success: false, error: "Status update failed: " + statusErr.message }

  // Recompute positions at submission boundary
  const posResult = await recomputeSubjectPositions(subjectId, classId, termId)
  if (!posResult.success) return { success: false, error: posResult.error }

  // Audit
  const { data: ctx } = await supabase.from("school_current_context").select("school_id").limit(1).single()
  if (ctx) {
    await supabase.from("audit_log").insert({
      school_id: ctx.school_id,
      user_id: session.user.id,
      action: "SCORESHEET_SUBMITTED",
      table_name: "scoresheet_submissions",
      new_values: { subject_id: subjectId, class_id: classId, term_id: termId },
    })
  }

  return { success: true, positions_updated: posResult.updated }
}

export async function updateScoresheetConfigWeights(params: {
  termId: string
  hwWeight: number
  cwWeight: number
  ctWeight: number
  examWeight: number
}) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: "Unauthenticated" }

  const { termId, hwWeight, cwWeight, ctWeight, examWeight } = params

  const validation = validateWeights({ hwWeight, cwWeight, ctWeight, examWeight })
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const { data: ctx } = await supabase.from("school_current_context").select("school_id").limit(1).single()
  const schoolId = ctx?.school_id ?? "6caa6780-29ba-4e94-93b4-5a450fc7ccbc"

  const columnsObj = {
    hw_weight: hwWeight,
    cw_weight: cwWeight,
    ct_weight: ctWeight,
    exam_weight: examWeight,
    homework_max: RAW_MAX_SCORES.homework,
    classwork_max: RAW_MAX_SCORES.classwork,
    classtest_max: RAW_MAX_SCORES.classtest,
    exam_max: RAW_MAX_SCORES.exam,
  }

  const { error } = await supabase
    .from("scoresheet_config")
    .upsert({
      school_id: schoolId,
      term_id: termId,
      column_count: 4,
      columns: columnsObj,
      class_score_max: hwWeight + cwWeight + ctWeight,
      exam_score_max: examWeight,
      hw_weight: hwWeight,
      cw_weight: cwWeight,
      ct_weight: ctWeight,
      exam_weight: examWeight,
      updated_at: new Date().toISOString(),
    }, { onConflict: "term_id" })

  if (error) return { success: false, error: error.message }

  return { success: true }
}
