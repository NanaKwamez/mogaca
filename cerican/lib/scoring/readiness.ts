// lib/scoring/readiness.ts
// Report readiness checker: surfaces structured list of blockers before PDF generation.
// PDF generation ≠ academic finalization.

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

  // 2. Subject assignments exist for this class
  const { data: assignments } = await supabase
    .from("subject_teacher_assignments")
    .select("subject_id, subjects(name)")
    .eq("class_id", classId)

  const totalAssignedSubjects = assignments?.length ?? 0

  checks.push({
    key: "subjects",
    label: "Subject assignments complete",
    status: totalAssignedSubjects > 0 ? "ok" : "blocking",
    detail: totalAssignedSubjects === 0 ? "No subjects assigned to teachers for this class." : `${totalAssignedSubjects} subject(s) assigned.`,
  })

  // 3. All scoresheets submitted
  const { data: submissions } = await supabase
    .from("scoresheet_submissions")
    .select("subject_id, status")
    .eq("class_id", classId)
    .eq("term_id", termId)

  const submittedCount = (submissions ?? []).filter(
    (s: { status: string }) => ["SUBMITTED", "LOCKED"].includes(s.status)
  ).length

  let scoresheetStatus: "ok" | "warning" | "blocking" = "blocking"
  let scoresheetDetail = ""

  if (totalAssignedSubjects === 0) {
    scoresheetStatus = "blocking"
    scoresheetDetail = "No subject assignments configured."
  } else if (submittedCount === 0) {
    scoresheetStatus = "blocking"
    scoresheetDetail = `0 of ${totalAssignedSubjects} scoresheets submitted by subject teachers.`
  } else if (submittedCount < totalAssignedSubjects) {
    scoresheetStatus = "blocking"
    scoresheetDetail = `Only ${submittedCount} of ${totalAssignedSubjects} scoresheets submitted.`
  } else {
    scoresheetStatus = "ok"
    scoresheetDetail = `All ${totalAssignedSubjects} scoresheets submitted.`
  }

  checks.push({
    key: "scoresheets",
    label: "All scoresheets submitted",
    status: scoresheetStatus,
    detail: scoresheetDetail,
  })

  // 4. Grades computed (no NULL grades when total score exists)
  const { count: scoresCount } = await supabase
    .from("scores")
    .select("*", { count: "exact", head: true })
    .eq("term_id", termId)

  const { count: ungradedCount } = await supabase
    .from("scores")
    .select("*", { count: "exact", head: true })
    .eq("term_id", termId)
    .not("total_score", "is", null)
    .is("grade", null)

  let gradeStatus: "ok" | "warning" | "blocking" = "ok"
  let gradeDetail: string | undefined = undefined

  if ((scoresCount ?? 0) === 0) {
    gradeStatus = "blocking"
    gradeDetail = "No scores entered yet."
  } else if ((ungradedCount ?? 0) > 0) {
    gradeStatus = "blocking"
    gradeDetail = `${ungradedCount} entered score(s) missing letter grades.`
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
    label: "Attendance sufficiently complete",
    status: (attendanceCount ?? 0) > 0 ? "ok" : "warning",
    detail: attendanceCount === 0 ? "No attendance records found — attendance will default." : `${attendanceCount} attendance logs.`,
  })

  // 6. Remarks generated & approved
  const { data: remarks } = await supabase
    .from("remark_generation_log")
    .select("status")
    .eq("class_id", classId)
    .eq("term_id", termId)

  const remarksCount = remarks?.length ?? 0
  const approvedCount = (remarks ?? []).filter((r: { status: string }) => r.status === "APPROVED").length

  let remarkStatus: "ok" | "warning" | "blocking" = "warning"
  let remarkDetail = ""

  if (remarksCount === 0) {
    remarkStatus = "warning"
    remarkDetail = "No remarks generated yet."
  } else if (approvedCount < remarksCount) {
    remarkStatus = "warning"
    remarkDetail = `${approvedCount} of ${remarksCount} remarks approved.`
  } else {
    remarkStatus = "ok"
    remarkDetail = `All ${remarksCount} remarks approved.`
  }

  checks.push({
    key: "remarks",
    label: "All remarks approved",
    status: remarkStatus,
    detail: remarkDetail,
  })

  const ready = checks.every((c) => c.status !== "blocking")

  return { ready, checks, attendance_completeness: attendanceCompleteness }
}
