import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerClient } from "@/lib/supabase/server"
import { getUserRoleAndProfile } from "@/lib/auth/role"
import { Badge } from "@/components/ui/Badge"

export default async function TeacherScoresheetListPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { staff, role } = await getUserRoleAndProfile(session.user.id, session.user.email)
  if (role !== "TEACHER" || !staff) redirect("/login?error=unauthorized")

  const { data: ctx } = await supabase
    .from("school_current_context")
    .select("academic_year_id, term_id")
    .limit(1)
    .single()

  if (!ctx) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Scoresheets</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          School context not yet configured.
        </div>
      </div>
    )
  }

  const { data: assignments } = await supabase
    .from("subject_teacher_assignments")
    .select("id, subject_id, class_id, subjects(id, name, code, class_id, classes(name))")
    .eq("teacher_id", staff.id)

  const normalized = (assignments ?? []).map((a: any) => {
    const classId = a.class_id || a.subjects?.class_id
    const className = a.subjects?.classes?.name || "Class"
    return {
      ...a,
      class_id: classId,
      className,
      subjectName: a.subjects?.name ?? "Subject",
      subjectCode: a.subjects?.code,
    }
  }).filter((a: any) => a.class_id && a.subject_id)

  const { data: submissions } = await supabase
    .from("scoresheet_submissions")
    .select("subject_id, class_id, status")
    .eq("teacher_id", staff.id)

  const statusByKey = new Map<string, string>()
  for (const s of submissions ?? []) {
    const row = s as any
    statusByKey.set(`${row.subject_id}::${row.class_id}`, row.status)
  }

  const rows = normalized.map((a: any) => {
    const key = `${a.subject_id}::${a.class_id}`
    return {
      key,
      subjectId: a.subject_id,
      classId: a.class_id,
      subjectName: a.subjectName,
      subjectCode: a.subjectCode,
      className: a.className,
      status: statusByKey.get(key) ?? "DRAFT",
    }
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Scoresheets</h1>
          <p className="text-sm text-text-muted mt-1">
            {rows.length} assigned subject{rows.length !== 1 ? "s" : ""} for the current term.
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-border text-text-muted">
          <p className="font-medium">No assigned scoresheets</p>
          <p className="text-sm mt-1">Subjects will appear here once you&apos;re assigned as a teacher.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map((r: any) => (
              <Link
                key={r.key}
                href={`/teacher/scoresheets/${r.subjectId}/${r.classId}`}
                className="block bg-white border border-border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{r.subjectName}</p>
                    <p className="text-sm text-text-muted mt-1">{r.className}</p>
                  </div>
                  <Badge
                    variant={
                      r.status === "SUBMITTED" || r.status === "LOCKED"
                        ? "success"
                        : r.status === "IN_PROGRESS"
                        ? "warning"
                        : "default"
                    }
                  >
                    {r.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse bg-white border border-border rounded-lg">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="py-3 px-4 text-sm font-semibold text-text-muted">Subject</th>
                  <th className="py-3 px-4 text-sm font-semibold text-text-muted">Class</th>
                  <th className="py-3 px-4 text-sm font-semibold text-text-muted">Status</th>
                  <th className="py-3 px-4 text-sm font-semibold text-text-muted"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.key} className="border-b border-border last:border-0">
                    <td className="py-3 px-4">
                      <div className="font-semibold">{r.subjectName}</div>
                      {r.subjectCode && <div className="text-xs text-text-muted">{r.subjectCode}</div>}
                    </td>
                    <td className="py-3 px-4">{r.className}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          r.status === "SUBMITTED" || r.status === "LOCKED"
                            ? "success"
                            : r.status === "IN_PROGRESS"
                            ? "warning"
                            : "default"
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/teacher/scoresheets/${r.subjectId}/${r.classId}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
