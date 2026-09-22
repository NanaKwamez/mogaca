import { createServerClient } from "@/lib/supabase/server"
import { StudentForm } from "@/components/admin/StudentForm"

export default async function StudentRegistrationPage() {
  const supabase = createServerClient()

  const { data: ctx } = await supabase
    .from("school_current_context")
    .select("school_id")
    .limit(1)
    .single()

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .order("sort_order")

  const classesList = (classes ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
  }))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Student Registration</h1>
        <p className="text-text-muted mt-1">Register a new student into the system.</p>
      </div>
      
      <StudentForm classes={classesList} />
    </div>
  )
}
