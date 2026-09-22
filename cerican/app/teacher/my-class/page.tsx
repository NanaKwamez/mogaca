import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerClient } from "@/lib/supabase/server"
import { getUserRoleAndProfile } from "@/lib/auth/role"
import { getBulkAttendanceSummaries } from "@/lib/attendance/service"
import { getAttendanceForDate } from "@/lib/actions/attendance"
import { DailyAttendanceTracker } from "@/components/teacher/DailyAttendanceTracker"
import { Badge } from "@/components/ui/Badge"

export default async function TeacherMyClassPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { staff, role } = await getUserRoleAndProfile(session.user.id, session.user.email)
  if (role !== "TEACHER" || !staff) redirect("/login?error=unauthorized")

  const { data: ctx } = await supabase
    .from("school_current_context")
    .select("school_id, term_id, terms(total_school_days)")
    .limit(1)
    .single()

  const { data: myClass } = await supabase
    .from("classes")
    .select("id, name, max_students")
    .eq("class_teacher_id", staff.id)
    .maybeSingle()

  if (!myClass) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">My Class</h1>
        <div className="bg-white border border-border rounded-lg p-8 text-center text-text-muted">
          <p className="font-medium">You are not assigned as a class teacher.</p>
          <p className="text-sm mt-1">
            Contact administration to be assigned a class, or use the Scoresheets tab to enter subject scores.
          </p>
        </div>
      </div>
    )
  }

  const { data: rosterRaw } = await supabase
    .from("students")
    .select("id, student_id_code, surname, first_name, gender, is_active, full_name")
    .eq("class_id", myClass.id)
    .eq("is_active", true)
    .order("surname")

  const roster = (rosterRaw ?? []).map((s: any) => {
    const sn = (s.surname ?? "").trim()
    const fn = (s.first_name ?? "").trim()
    const backup = (s.full_name ?? "").trim()
    return {
      ...s,
      first_name: fn || (sn ? backup.replace(sn, "").trim() : backup) || backup,
      surname:    sn || (fn && backup !== fn ? backup.replace(fn, "").trim() : "") || "",
      student_id_code: s.student_id_code || s.id?.slice(0, 8).toUpperCase(),
    }
  })

  const studentIds = (roster ?? []).map((s: any) => s.id)

  const attMap = ctx
    ? await getBulkAttendanceSummaries(studentIds, ctx.term_id, myClass.id)
    : new Map()

  const todayStr = new Date().toISOString().split("T")[0]
  const todayAttMap = await getAttendanceForDate(myClass.id, todayStr)
  const initialAttObj: Record<string, "Present" | "Absent"> = {}
  todayAttMap.forEach((status, id) => {
    initialAttObj[id] = status
  })

  const trackerStudents = roster.map(s => {
    const summary = attMap.get(s.id)
    return {
      id: s.id,
      student_id_code: s.student_id_code,
      surname: s.surname,
      first_name: s.first_name,
      gender: s.gender,
      days_present: summary?.days_present ?? 0,
      total_days: summary?.total_days ?? 0,
    }
  })

  const { data: subjectAssignments } = ctx
    ? await supabase
        .from("subject_teacher_assignments")
        .select("subject_id, subjects(name, class_id)")
        .eq("term_id", ctx.term_id)
    : { data: [] }

  const classSubjects = (subjectAssignments ?? []).map((sa: any) => {
    const cid = (sa?.subjects as any)?.class_id
    return { ...sa, class_id: cid ?? sa.class_id }
  }).filter((sa: any) => sa.class_id === myClass.id)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Class · {myClass.name}</h1>
          <p className="text-sm text-text-muted mt-1">
            {roster?.length ?? 0} active student{(roster?.length ?? 0) !== 1 ? "s" : ""}
            {myClass.max_students && ` · capacity ${myClass.max_students}`}
          </p>
        </div>
        <Link
          href={`/admin/academic/reports/print?class_id=${myClass.id}`}
          className="px-4 py-2 bg-slate-900 text-white font-medium rounded-md hover:bg-slate-800 text-sm flex items-center gap-2 shadow-sm"
        >
          <span>🖨️ Print Class Reports</span>
        </Link>
      </header>

      {classSubjects.length > 0 && (
        <section className="bg-white border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Class Subjects &amp; Scoresheets</h2>
          <div className="flex flex-wrap gap-2">
            {classSubjects.map((sa: any) => {
              const href = `/teacher/scoresheets/${sa.subject_id}/${sa.class_id}`
              return (
                <Link
                  key={sa.subject_id}
                  href={href}
                  className="px-3 py-2 rounded-md bg-gray-50 border border-border hover:bg-gray-100 text-sm font-medium"
                >
                  {sa.subjects?.name ?? "Unknown"} →
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-3">Class Roster &amp; Cumulative Attendance</h2>
        {roster?.length === 0 ? (
          <div className="bg-white border border-border rounded-lg p-8 text-center text-text-muted">
            <p className="font-medium">No students registered in this class yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-white border border-border rounded-lg">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="py-3 px-4 text-sm font-semibold text-text-muted">Student ID</th>
                  <th className="py-3 px-4 text-sm font-semibold text-text-muted">Name</th>
                  <th className="py-3 px-4 text-sm font-semibold text-text-muted">Gender</th>
                  <th className="py-3 px-4 text-sm font-semibold text-text-muted">Cumulative Attendance</th>
                  <th className="py-3 px-4 text-sm font-semibold text-text-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                {(roster ?? []).map((s: any) => {
                  const att = attMap.get(s.id)
                  return (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm font-mono text-text-muted">{s.student_id_code}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {s.surname}, {s.first_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">{s.gender}</td>
                      <td className="py-3 px-4 text-sm font-medium">
                        {att && att.total_days > 0
                          ? `${att.days_present} / ${att.total_days} Days (${att.pct}%)`
                          : `${att?.days_present ?? 0} Days`}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={s.is_active ? "success" : "default"}>
                          {s.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
