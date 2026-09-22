import { createServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { ClassEditForm } from "./ClassEditForm"

interface PageProps {
  params: { classId: string }
}

export default async function ClassEditPage({ params }: PageProps) {
  const supabase = createServerClient()

  const { data: cls } = await supabase
    .from("classes")
    .select("*")
    .eq("id", params.classId)
    .maybeSingle()

  const { data: staffList } = await supabase
    .from("staff")
    .select("id, first_name, surname")
    .eq("is_active", true)
    .order("surname")

  const { data: classStudents } = cls
    ? await supabase
        .from("students")
        .select("id, student_id_code, surname, first_name, gender")
        .eq("class_id", params.classId)
        .eq("is_active", true)
        .order("surname")
    : { data: [] }

  const staffOptions = staffList ?? []
  const students = classStudents ?? []

  if (!cls) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-surface border border-border rounded-lg p-8 text-center">
          <h2 className="text-lg font-semibold text-text mb-2">Class Not Found</h2>
          <p className="text-text-muted text-sm mb-6">The requested class could not be found.</p>
          <Link href="/admin/manage/classes">
            <Button variant="secondary">Back to Classes</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/manage/classes" className="text-sm text-primary hover:underline mb-2 inline-block">
          ← Back to Classes
        </Link>
        <h1 className="text-2xl font-bold text-text">{cls.name}</h1>
        <p className="text-text-muted mt-1">
          Order #{cls.sort_order ?? "—"} · {students.length} active student{students.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-6">
        <ClassEditForm cls={cls} staff={staffOptions} />

        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text">Active Students in {cls.name}</h2>
            <Badge variant="info">{students.length} student{students.length !== 1 ? "s" : ""}</Badge>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <p className="font-medium">No active students in this class</p>
              <p className="text-sm mt-1">Students assigned to this class will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((s: any) => (
                <Link
                  key={s.id}
                  href={`/admin/manage/students/${s.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-background transition-colors"
                >
                  <div>
                    <p className="font-semibold text-text">{s.surname}, {s.first_name}</p>
                    <p className="text-xs font-mono text-text-muted mt-0.5">{s.student_id_code} · {s.gender}</p>
                  </div>
                  <Button variant="ghost" className="text-sm">View →</Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
