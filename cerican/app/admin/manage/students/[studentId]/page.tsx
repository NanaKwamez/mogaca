import { createServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { StudentEditForm } from "./StudentEditForm"

interface PageProps {
  params: { studentId: string }
}

export default async function StudentEditPage({ params }: PageProps) {
  const supabase = createServerClient()

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", params.studentId)
    .maybeSingle()

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .order("sort_order")

  const classesList = classes ?? []

  if (!student) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-surface border border-border rounded-lg p-8 text-center">
          <h2 className="text-lg font-semibold text-text mb-2">Student Not Found</h2>
          <p className="text-text-muted text-sm mb-6">The requested student record could not be found.</p>
          <Link href="/admin/manage/students">
            <Button variant="secondary">Back to Students</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/manage/students" className="text-sm text-primary hover:underline mb-2 inline-block">
            ← Back to Students
          </Link>
          <h1 className="text-2xl font-bold text-text">{student.surname}, {student.first_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-mono text-text-muted">{student.student_id_code}</span>
            <Badge variant={student.is_active ? "success" : "default"}>
              {student.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>

      <StudentEditForm student={student} classes={classesList} />
    </div>
  )
}
