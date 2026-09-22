import { createServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"

export default async function StaffManagePage() {
  const supabase = createServerClient()

  const { data: staffData } = await supabase
    .from("staff")
    .select("id, staff_id_code, surname, first_name, staff_type, is_active, email")
    .order("surname")

  const { data: assignmentsData } = await supabase
    .from("subject_teacher_assignments")
    .select("teacher_id, subjects(name, classes(name))")

  const assignmentsByTeacher = new Map<string, string[]>()
  for (const a of assignmentsData ?? []) {
    const tid = a.teacher_id
    if (!tid) continue
    const subName = (a.subjects as any)?.name ?? "Subject"
    const clsName = (a.subjects as any)?.classes?.name ?? "Class"
    const label = `${subName} (${clsName})`
    if (!assignmentsByTeacher.has(tid)) {
      assignmentsByTeacher.set(tid, [])
    }
    const list = assignmentsByTeacher.get(tid)!
    if (!list.includes(label)) list.push(label)
  }

  const staff = staffData ?? []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Staff & Teacher Management</h1>
          <p className="text-text-muted mt-1">View staff login emails, roles, and assigned subjects.</p>
        </div>
        <Link href="/admin/registration/staff">
          <Button>Register New Staff</Button>
        </Link>
      </div>

      {staff.length === 0 ? (
        <div className="text-center py-16 text-text-muted bg-white rounded-lg border border-border">
          <p className="text-lg font-medium">No staff registered yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((s: any) => {
            const teacherAssignments = assignmentsByTeacher.get(s.id) ?? []
            return (
              <div key={s.id} className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-text text-lg">{s.surname}, {s.first_name}</h2>
                      <Badge variant="default">{s.staff_type}</Badge>
                      <Badge variant={s.is_active ? "success" : "default"}>
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-muted mt-1">
                      Login Email: <strong className="font-mono text-primary">{s.email || "No email"}</strong> · Code: <span className="font-mono">{s.staff_id_code}</span>
                    </p>
                  </div>
                  <Link href={`/admin/manage/staff/${s.id}`}>
                    <Button variant="secondary" className="text-xs">Edit Staff &amp; Roles →</Button>
                  </Link>
                </div>

                {teacherAssignments.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                      Assigned Subjects ({teacherAssignments.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {teacherAssignments.map((asgn, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-text font-medium px-2.5 py-1 rounded-md border border-border">
                          {asgn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
