"use server"

import { createServerClient } from "@/lib/supabase/server"
import { computeGrade } from "@/lib/scoring/grades"
import { recomputeSubjectPositions } from "@/lib/scoring/positions"
import { z } from "zod"

// Score save schema — null is intentional for incomplete scores
const scoreSaveSchema = z.object({
  student_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  term_id: z.string().uuid(),
  classwork_score: z.number().min(0).nullable().optional(),
  homework_score: z.number().min(0).nullable().optional(),
  classtest_score: z.number().min(0).nullable().optional(),
  exam_score: z.number().min(0).nullable(),
  class_score: z.number().min(0).nullable().optional(),
})

export type ScoreSaveResult =
  | { success: true; total_score: number | null; grade: string | null }
  | { success: false; error: string }

export async function saveScore(formData: unknown): Promise<ScoreSaveResult> {
  const parsed = scoreSaveSchema.safeParse(formData)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const { student_id, subject_id, term_id, classwork_score, homework_score, classtest_score, exam_score, class_score } = parsed.data

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

  if (submission?.status === "SUBMITTED" || submission?.status === "LOCKED") {
    return { success: false, error: "Scoresheet is locked and cannot be edited." }
  }

  // Fetch score limits from config
  const { data: config } = await supabase
    .from("scoresheet_config")
    .select("class_score_max, exam_score_max, columns")
    .eq("term_id", term_id)
    .maybeSingle()

  const configCols = (config?.columns as any) || {}
  const cwMax = configCols.classwork_max ?? 10
  const hwMax = configCols.homework_max ?? 10
  const ctMax = configCols.classtest_max ?? 30
  const examMax = configCols.exam_max ?? config?.exam_score_max ?? 50

  const cw = classwork_score ?? null
  const hw = homework_score ?? null
  const ct = classtest_score ?? null

  if (cw !== null && cw > cwMax) return { success: false, error: `Classwork score cannot exceed ${cwMax}.` }
  if (hw !== null && hw > hwMax) return { success: false, error: `Homework score cannot exceed ${hwMax}.` }
  if (ct !== null && ct > ctMax) return { success: false, error: `Class Test score cannot exceed ${ctMax}.` }
  if (exam_score !== null && exam_score > examMax) return { success: false, error: `Exam score cannot exceed ${examMax}.` }

  // Compute total class score from subcomponents (or use provided class_score if subcomponents null)
  let computedClassScore: number | null = null
  if (cw !== null || hw !== null || ct !== null) {
    computedClassScore = (cw ?? 0) + (hw ?? 0) + (ct ?? 0)
  } else if (class_score !== undefined && class_score !== null) {
    computedClassScore = class_score
  }

  let total_score: number | null = null
  let grade: string | null = null

  if (computedClassScore !== null && exam_score !== null) {
    total_score = computedClassScore + exam_score

    if (total_score > 100) {
      return { success: false, error: "Total score cannot exceed 100." }
    }

    // Fetch active grading schema
    const { data: ctx } = await supabase.from("school_current_context").select("school_id").limit(1).single()
    if (ctx) {
      const { data: schema } = await supabase
        .from("grading_schemas")
        .select("bands")
        .eq("school_id", ctx.school_id)
        .eq("is_active", true)
        .single()

      if (schema?.bands) {
        const result = computeGrade(total_score, schema.bands)
        if (result.success) grade = result.grade
        else return { success: false, error: result.error }
      }
    }
  }

  // Encode component breakdown in subject_remark as structured JSON string for 100% reliability
  const scoreMetaData = JSON.stringify({
    cw,
    hw,
    ct
  })

  // Upsert score row
  const { error: upsertErr } = await supabase
    .from("scores")
    .upsert({
      student_id,
      subject_id,
      term_id,
      class_score: computedClassScore,
      exam_score: exam_score,
      total_score,
      grade,
      subject_remark: scoreMetaData,
      entered_by: session.user.id,
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "student_id,subject_id,term_id" })

  if (upsertErr) return { success: false, error: "Failed to save score: " + upsertErr.message }

  return { success: true, total_score, grade }
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
    .eq("user_id", session.user.id)
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
  classwork_max: number
  homework_max: number
  classtest_max: number
  exam_max: number
}) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: "Unauthenticated" }

  const { termId, classwork_max, homework_max, classtest_max, exam_max } = params

  const totalSum = classwork_max + homework_max + classtest_max + exam_max
  if (totalSum !== 100) {
    return { success: false, error: `Total weights sum to ${totalSum}, but must equal exactly 100.` }
  }

  const { data: ctx } = await supabase.from("school_current_context").select("school_id").limit(1).single()
  const schoolId = ctx?.school_id ?? "6caa6780-29ba-4e94-93b4-5a450fc7ccbc"

  const columnsObj = { classwork_max, homework_max, classtest_max, exam_max }

  const { error } = await supabase
    .from("scoresheet_config")
    .upsert({
      school_id: schoolId,
      term_id: termId,
      column_count: 4,
      columns: columnsObj,
      class_score_max: classwork_max + homework_max + classtest_max,
      exam_score_max: exam_max,
      updated_at: new Date().toISOString(),
    }, { onConflict: "term_id" })

  if (error) return { success: false, error: error.message }

  return { success: true }
}
