// lib/scoring/readiness.ts
// Report readiness checker: surfaces structured list of blockers before PDF generation.

import { createServerClient } from "@/lib/supabase/server"
import { getBulkAttendanceSummaries } from "@/lib/attendance/service"

export interface ReadinessCheck {
  key: string
  label: string
  status: "ok" | "warning" | "blocking"
  detail?: string
}

export interface AttendanceCompleteness {
  above_80_pct: number
  below_80_pct: number
  no_records: number
  total_students: number
}

export interface ReadinessResult {
  ready: boolean
  checks: ReadinessCheck[]
  attendance_completeness?: AttendanceCompleteness
}

export async function checkReportReadiness(
  classId: string,
  termId: string
): Promise<ReadinessResult> {
  const supabase = createServerClient()
  const checks: ReadinessCheck[] = []

  // 1. Student records complete
  const { data: activeStudents, error: studentsErr } = await supabase
    .from("students")
    .select("id")
    .eq("class_id", classId)
    .eq("is_active", true)

  const studentCount = activeStudents?.length ?? 0

  if (studentsErr) throw new Error(studentsErr.message)

  checks.push({
    key: "students",
    label: "Student records complete",
    status: studentCount > 0 ? "ok" : "blocking",
    detail: studentCount === 0 ? "No active enrolled students in this class." : `${studentCount} student(s) enrolled.`,
  })

  const studentIds = activeStudents?.map((s: { id: string }) => s.id) ?? []
  const attendanceCompleteness: AttendanceCompleteness = {
    above_80_pct: 0,
    below_80_pct: 0,
    no_records: 0,
    total_students: studentCount,
  }

  if (studentIds.length > 0) {
    const attMap = await getBulkAttendanceSummaries(studentIds, termId, classId)
    for (const sid of studentIds) {
      const s = attMap.get(sid)
      if (!s || s.total_days === 0) {
        attendanceCompleteness.no_records++
      } else if (s.pct >= 80) {
        attendanceCompleteness.above_80_pct++
      } else {
        attendanceCompleteness.below_80_pct++
      }
    }
  }

  // 2. Subjects configured for this class (Dynamic subject count from subjects table)
  const { data: classSubjects } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("class_id", classId)

  const totalClassSubjects = classSubjects?.length ?? 0

  checks.push({
    key: "subjects",
    label: "Subjects configured for class",
    status: totalClassSubjects > 0 ? "ok" : "blocking",
    detail: totalClassSubjects === 0
      ? "No subjects registered for this class."
      : `${totalClassSubjects} subject(s) configured.`,
  })

  // 3. Scoresheets submitted status
  const subjectIds = (classSubjects ?? []).map(s => s.id)
  let submittedCount = 0

  if (subjectIds.length > 0) {
    const { data: submissions } = await supabase
      .from("scoresheet_submissions")
      .select("subject_id, status")
      .eq("class_id", classId)
      .eq("term_id", termId)
      .in("subject_id", subjectIds)

    const submittedSet = new Set(
      (submissions ?? [])
        .filter((s: { status: string }) => ["SUBMITTED", "LOCKED"].includes(s.status))
        .map((s: { subject_id: string }) => s.subject_id)
    )
    submittedCount = submittedSet.size
  }

  let scoresheetStatus: "ok" | "warning" | "blocking" = "warning"
  let scoresheetDetail = ""

  if (totalClassSubjects === 0) {
    scoresheetStatus = "blocking"
    scoresheetDetail = "No subjects registered for this class."
  } else if (submittedCount === 0) {
    scoresheetStatus = "warning"
    scoresheetDetail = `0 of ${totalClassSubjects} scoresheets submitted by teachers.`
  } else if (submittedCount < totalClassSubjects) {
    scoresheetStatus = "warning"
    scoresheetDetail = `${submittedCount} of ${totalClassSubjects} scoresheets submitted (${totalClassSubjects - submittedCount} pending/draft).`
  } else {
    scoresheetStatus = "ok"
    scoresheetDetail = `All ${totalClassSubjects} scoresheets submitted.`
  }

  checks.push({
    key: "scoresheets",
    label: "Scoresheet submissions",
    status: scoresheetStatus,
    detail: scoresheetDetail,
  })

  // 4. Grades computed for students in THIS CLASS
  let gradeStatus: "ok" | "warning" | "blocking" = "ok"
  let gradeDetail = ""

  if (studentIds.length > 0) {
    const { count: scoresCount } = await supabase
      .from("scores")
      .select("*", { count: "exact", head: true })
      .eq("term_id", termId)
      .in("student_id", studentIds)

    const { count: ungradedCount } = await supabase
      .from("scores")
      .select("*", { count: "exact", head: true })
      .eq("term_id", termId)
      .in("student_id", studentIds)
      .not("total_score", "is", null)
      .is("grade", null)

    if ((scoresCount ?? 0) === 0) {
      gradeStatus = "warning"
      gradeDetail = "No student scores entered yet for this class."
    } else if ((ungradedCount ?? 0) > 0) {
      gradeStatus = "warning"
      gradeDetail = `${ungradedCount} score entry missing calculated letter grade.`
    } else {
      gradeStatus = "ok"
      gradeDetail = `${scoresCount} score entries calculated.`
    }
  }

  checks.push({
    key: "grades",
    label: "Grades calculated",
    status: gradeStatus,
    detail: gradeDetail,
  })

  // 5. Attendance sufficiently complete
  const { count: attendanceCount } = await supabase
    .from("attendance")
    .select("*", { count: "exact", head: true })
    .eq("class_id", classId)
    .eq("term_id", termId)

  checks.push({
    key: "attendance",
    label: "Attendance recorded",
    status: (attendanceCount ?? 0) > 0 ? "ok" : "warning",
    detail: (attendanceCount ?? 0) === 0 ? "No attendance logs recorded this term." : `${attendanceCount} attendance logs.`,
  })

  // 6. Remarks status
  const { data: remarks } = await supabase
    .from("remark_generation_log")
    .select("status")
    .eq("class_id", classId)
    .eq("term_id", termId)

  const remarksCount = remarks?.length ?? 0
  const approvedCount = (remarks ?? []).filter((r: { status: string }) => r.status === "APPROVED").length

  let remarkStatus: "ok" | "warning" | "blocking" = "ok"
  let remarkDetail = "Dynamic remarks engine active (generates on print preview)."

  if (remarksCount > 0) {
    remarkDetail = `${approvedCount} of ${remarksCount} remarks approved.`
  }

  checks.push({
    key: "remarks",
    label: "Report remarks",
    status: remarkStatus,
    detail: remarkDetail,
  })

  // Ready if no hard blocking checks exist (students > 0 && subjects > 0)
  const ready = checks.every((c) => c.status !== "blocking")

  return { ready, checks, attendance_completeness: attendanceCompleteness }
}
