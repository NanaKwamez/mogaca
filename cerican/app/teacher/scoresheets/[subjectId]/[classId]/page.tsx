import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { getUserRoleAndProfile } from "@/lib/auth/role"
import { ScoreEntryList } from "@/components/teacher/ScoreEntryList"

export default async function TeacherScoreEntryPage({
  params,
}: {
  params: { subjectId: string; classId: string }
}) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { staff, role } = await getUserRoleAndProfile(session.user.id, session.user.email)
  if (role !== "TEACHER" || !staff) redirect("/login?error=unauthorized")

  const { data: ctx } = await supabase
    .from("school_current_context")
    .select("academic_year_id, term_id, terms(id, term_number, academic_years(label))")
    .limit(1)
    .single()

  if (!ctx) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        School context not yet configured.
      </div>
    )
  }

  const { data: classRow } = await supabase
    .from("classes")
    .select("id, name, sort_order, class_teacher_id")
    .eq("id", params.classId)
    .maybeSingle()

  const { data: subjectRow } = await supabase
    .from("subjects")
    .select("id, name, code")
    .eq("id", params.subjectId)
    .maybeSingle()

  // 1. Check direct subject assignment
  const { data: assignment } = await supabase
    .from("subject_teacher_assignments")
    .select("id")
    .eq("teacher_id", staff.id)
    .eq("subject_id", params.subjectId)
    .maybeSingle()

  // 2. Check Class 3 and below Class Teacher permission rule
  const isClassTeacherLowerSchool = 
    Boolean(classRow && classRow.sort_order <= 7 && classRow.class_teacher_id === staff.id)

  const isAuthorized = Boolean(assignment || isClassTeacherLowerSchool || ['ADMIN','HEADMASTER','PROPRIETRESS'].includes(role.toUpperCase()))

  if (!isAuthorized) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center bg-white border border-border rounded-lg p-8">
        <h2 className="text-xl font-bold text-red-600 mb-2">Scoresheet Access Restricted</h2>
        <p className="text-sm text-text-muted">
          You are only assigned to access subjects you teach or classes you oversee.
        </p>
      </div>
    )
  }

  const { data: config } = await supabase
    .from("scoresheet_config")
    .select("class_score_max, exam_score_max, columns")
    .eq("term_id", ctx.term_id)
    .maybeSingle()

  const configCols = (config?.columns as any) || {}
  const classworkMax = configCols.classwork_max ?? 10
  const homeworkMax = configCols.homework_max ?? 10
  const classtestMax = configCols.classtest_max ?? 30
  const examMax = configCols.exam_max ?? config?.exam_score_max ?? 50

  const { data: studentRows } = await supabase
    .from("students")
    .select("id, surname, first_name, is_active")
    .eq("class_id", params.classId)
    .eq("is_active", true)
    .order("surname")

  const studentIds = (studentRows ?? []).map((s: any) => s.id)

  const { data: scoreRows } = await supabase
    .from("scores")
    .select("student_id, class_score, exam_score, total_score, grade, position, subject_remark")
    .eq("subject_id", params.subjectId)
    .eq("term_id", ctx.term_id)
    .in("student_id", studentIds)

  const scoreByStudent = new Map<string, any>()
  for (const sc of scoreRows ?? []) {
    let cw: number | null = null
    let hw: number | null = null
    let ct: number | null = null
    if (sc.subject_remark) {
      try {
        const meta = JSON.parse(sc.subject_remark)
        cw = meta.cw ?? null
        hw = meta.hw ?? null
        ct = meta.ct ?? null
      } catch (e) {
        // legacy format fallback
      }
    }
    scoreByStudent.set((sc as any).student_id, {
      ...sc,
      classwork_score: cw,
      homework_score: hw,
      classtest_score: ct,
    })
  }

  const { data: submission } = await supabase
    .from("scoresheet_submissions")
    .select("status")
    .eq("subject_id", params.subjectId)
    .eq("class_id", params.classId)
    .eq("term_id", ctx.term_id)
    .maybeSingle()

  const termLabel =
    (ctx as any).terms?.academic_years?.label || "Current Year" +
      " · Term " +
      ((ctx as any).terms?.term_number ?? "?")

  const students = (studentRows ?? []).map((s: any) => {
    const sc = scoreByStudent.get(s.id)
    return {
      id: s.id,
      surname: s.surname,
      first_name: s.first_name,
      scores: sc
        ? {
            classwork_score: sc.classwork_score,
            homework_score: sc.homework_score,
            classtest_score: sc.classtest_score,
            exam_score: sc.exam_score,
            total_score: sc.total_score,
            grade: sc.grade,
            position: sc.position,
          }
        : undefined,
    }
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Enter Scores</h1>
        <p className="text-sm text-text-muted mt-1">
          Edits are saved on blur. Submit the scoresheet once all entries are complete to lock and calculate positions.
        </p>
      </header>

      <ScoreEntryList
        students={students as any}
        subjectId={params.subjectId}
        classId={params.classId}
        termId={ctx.term_id}
        classworkMax={classworkMax}
        homeworkMax={homeworkMax}
        classtestMax={classtestMax}
        examMax={examMax}
        submissionStatus={submission?.status ?? "DRAFT"}
        subjectName={subjectRow?.name ?? "—"}
        className={classRow?.name ?? "—"}
        termName={termLabel}
      />
    </div>
  )
}
