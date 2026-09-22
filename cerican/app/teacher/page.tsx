import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerClient } from "@/lib/supabase/server"
import { getUserRoleAndProfile } from "@/lib/auth/role"
import { getAttendanceSummary } from "@/lib/attendance/service"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"

export default async function TeacherDashboardPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { staff, role } = await getUserRoleAndProfile(session.user.id, session.user.email)
  if (role !== "TEACHER" || !staff) redirect("/login?error=unauthorized")

  const { data: ctx } = await supabase
    .from("school_current_context")
    .select("school_id, academic_year_id, term_id, terms(total_school_days)")
    .limit(1)
    .single()

  const termId = ctx?.term_id ?? ""

  // 1. Fetch all assigned subjects & classes for this specific teacher
  let { data: assignments } = await supabase
    .from("subject_teacher_assignments")
    .select("id, subject_id, class_id, subjects(id, name, code, class_id, classes(id, name, sort_order))")
    .eq("teacher_id", staff.id)

  let assignmentList = (assignments ?? []).map((a: any) => {
    const cid = a.class_id || a.subjects?.class_id
    const cname = a.subjects?.classes?.name || "Class"
    const csort = a.subjects?.classes?.sort_order ?? 99
    return {
      id: a.id,
      subject_id: a.subject_id,
      class_id: cid,
      subjectName: a.subjects?.name ?? "Subject",
      subjectCode: a.subjects?.code,
      className: cname,
      classSort: csort,
    }
  }).filter((a: any) => a.class_id && a.subject_id)

  // Fallback for Class 3 and below Class Teachers: if no explicit STA, give them all subjects in their class
  const { data: myClass } = await supabase
    .from("classes")
    .select("id, name, sort_order, max_students")
    .eq("class_teacher_id", staff.id)
    .maybeSingle()

  if (myClass && myClass.sort_order <= 7 && assignmentList.length === 0) {
    const { data: classSubjs } = await supabase
      .from("subjects")
      .select("id, name, code, class_id")
      .eq("class_id", myClass.id)

    assignmentList = (classSubjs ?? []).map((sub: any) => ({
      id: sub.id,
      subject_id: sub.id,
      class_id: myClass.id,
      subjectName: sub.name,
      subjectCode: sub.code,
      className: myClass.name,
      classSort: myClass.sort_order,
    }))
  }

  // 2. Fetch submission status for this teacher's assigned subjects
  const { data: submissionRows } = await supabase
    .from("scoresheet_submissions")
    .select("subject_id, class_id, status")
    .eq("teacher_id", staff.id)

  const submissionByKey = new Map<string, string>()
  for (const s of submissionRows ?? []) {
    const row = s as any
    submissionByKey.set(`${row.subject_id}::${row.class_id}`, row.status)
  }

  // 3. Compute entry progress for each assigned subject/class
  const tasks = await Promise.all(
    assignmentList.map(async (a: any) => {
      const key = `${a.subject_id}::${a.class_id}`
      const status = submissionByKey.get(key) ?? "DRAFT"

      const { count: enteredCount } = await supabase
        .from("scores")
        .select("*", { count: "exact", head: true })
        .eq("subject_id", a.subject_id)
        .not("total_score", "is", null)

      const { count: classCount } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("class_id", a.class_id)
        .eq("is_active", true)

      const total = classCount ?? 0
      const entered = enteredCount ?? 0
      const pctDone = total > 0 ? Math.round((entered / total) * 100) : 0

      return {
        id: key,
        subjectId: a.subject_id,
        classId: a.class_id,
        subjectName: a.subjectName,
        className: a.className,
        status,
        pctDone,
        entered,
        total,
      }
    })
  )

  let classStats: { name: string; studentCount: number; presentPct: number | null; href: string } | null = null
  if (myClass) {
    const { count: rosterCount } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("class_id", myClass.id)
      .eq("is_active", true)

    classStats = {
      name: myClass.name,
      studentCount: rosterCount ?? 0,
      presentPct: null,
      href: "/teacher/my-class",
    }
  }

  function statusBadge(status: string, pctDone: number, entered: number, total: number) {
    if (status === "SUBMITTED" || status === "LOCKED") {
      return <Badge variant="success">Submitted</Badge>
    }
    if (pctDone >= 100 && total > 0) {
      return <Badge variant="warning">Ready to Submit</Badge>
    }
    if (entered > 0) {
      return <Badge variant="warning">In Progress ({pctDone}%)</Badge>
    }
    return <Badge variant="default">Not Started</Badge>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="space-y-1 bg-white p-6 border border-border rounded-xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text">
              Welcome, {staff.first_name} {staff.surname} 👋
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Personal Teacher Portal · <span className="font-semibold text-primary">{staff.staff_type}</span>
              {staff.email && ` · ${staff.email}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info">{tasks.length} Assigned Subject-Classes</Badge>
          </div>
        </div>
      </header>

      {classStats && (
        <section className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-text">My Class Teacher Roster · {classStats.name}</h2>
              <p className="text-sm text-text-muted mt-1">
                You are the assigned Class Teacher for {classStats.name} ({classStats.studentCount} active students).
              </p>
            </div>
            <Link href={classStats.href}>
              <Button variant="secondary">Manage Roster & Attendance →</Button>
            </Link>
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-text">My Assigned Subjects &amp; Classes</h2>
            <p className="text-sm text-text-muted">Select a subject below to manage student scores.</p>
          </div>
          <Link href="/teacher/scoresheets" className="text-sm text-primary hover:underline font-medium">
            View All Scoresheets →
          </Link>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-border text-text-muted">
            <p className="text-lg font-medium">No assigned subjects found</p>
            <p className="text-sm mt-1">Please contact school administration if your subject assignments are missing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((t: any) => (
              <Link
                key={t.id}
                href={`/teacher/scoresheets/${t.subjectId}/${t.classId}`}
                className="bg-white border border-border hover:border-primary rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary-light/10 px-2 py-1 rounded">
                      {t.className}
                    </span>
                    {statusBadge(t.status, t.pctDone, t.entered, t.total)}
                  </div>
                  <h3 className="font-bold text-text text-lg mt-1">{t.subjectName}</h3>
                  <p className="text-xs text-text-muted mt-1">
                    {t.entered} of {t.total} students scored
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <div className="w-2/3 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${t.pctDone}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-primary">Open Sheet →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
