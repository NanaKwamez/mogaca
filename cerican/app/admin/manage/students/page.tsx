import { createServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"

export default async function StudentsManagePage({
  searchParams,
}: {
  searchParams: { search?: string; class_id?: string }
}) {
  const search = searchParams.search ?? ""
  const classId = searchParams.class_id ?? ""
  const supabase = createServerClient()

  // Fetch all active classes for the dropdown filter
  const { data: classesData } = await supabase
    .from("classes")
    .select("id, name")
    .order("sort_order")
  const classesList = classesData ?? []

  let studentsQuery = supabase
    .from("students")
    .select("id, student_id_code, surname, first_name, gender, is_active, classes(name)")
    .eq("is_active", true)

  if (classId) {
    studentsQuery = studentsQuery.eq("class_id", classId)
  }

  if (search.trim()) {
    const pattern = `%${search.trim()}%`
    studentsQuery = studentsQuery.or(
      `surname.ilike.${pattern},first_name.ilike.${pattern},student_id_code.ilike.${pattern}`
    )
  }

  const { data: studentsData } = await studentsQuery.order("surname")
  const students = studentsData ?? []

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Students</h1>
          <p className="text-text-muted mt-1">{students.length} active student{students.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/admin/registration/student">
          <Button>Register Student</Button>
        </Link>
      </div>

      <form className="mb-6 bg-white p-4 border border-border rounded-lg shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by name or student ID..."
            className="h-[44px] rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            name="class_id"
            defaultValue={classId}
            className="h-[44px] rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Classes</option>
            {classesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Search / Filter</Button>
            {(search || classId) && (
              <Link href="/admin/manage/students">
                <Button type="button" variant="secondary">Clear</Button>
              </Link>
            )}
          </div>
        </div>
      </form>

      {students.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-lg font-medium">No students registered yet</p>
          <p className="text-sm mt-1">Use the Register Student button to add your first student.</p>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 md:hidden">
            {students.map((s: any) => (
              <div key={s.id} className="bg-surface border border-border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-text">{s.surname}, {s.first_name}</p>
                    <p className="text-xs font-mono text-text-muted mt-0.5">{s.student_id_code}</p>
                    <p className="text-sm text-text-muted mt-1">{s.classes?.name ?? "No class"} · {s.gender}</p>
                  </div>
                  <Badge variant={s.is_active ? "success" : "default"}>
                    {s.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <Link href={`/admin/manage/students/${s.id}`} className="text-sm text-primary mt-2 inline-block">
                  View Record →
                </Link>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="py-3 px-4 text-sm font-semibold text-text-muted">Student ID</th>
                  <th className="py-3 px-4 text-sm font-semibold text-text-muted">Name</th>
                  <th className="py-3 px-4 text-sm font-semibold text-text-muted">Class</th>
                  <th className="py-3 px-4 text-sm font-semibold text-text-muted">Gender</th>
                  <th className="py-3 px-4 text-sm font-semibold text-text-muted">Status</th>
                  <th className="py-3 px-4 text-sm font-semibold text-text-muted"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s: any) => (
                  <tr key={s.id} className="border-b border-border hover:bg-background transition-colors">
                    <td className="py-3 px-4 text-sm font-mono text-text-muted">{s.student_id_code}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-text">{s.surname}, {s.first_name}</td>
                    <td className="py-3 px-4 text-sm text-text">{s.classes?.name ?? "—"}</td>
                    <td className="py-3 px-4 text-sm text-text">{s.gender}</td>
                    <td className="py-3 px-4">
                      <Badge variant={s.is_active ? "success" : "default"}>{s.is_active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/admin/manage/students/${s.id}`}>
                        <Button variant="ghost" className="text-sm" aria-label={`Edit ${s.first_name} ${s.surname}`}>
                          Edit →
                        </Button>
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
