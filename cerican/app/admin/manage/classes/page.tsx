import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import Link from "next/link"

export default async function ClassesManagePage() {
  const supabase = createServerClient()

  const { data: classesData } = await supabase
    .from("classes")
    .select("id, name, sort_order, class_teacher_id, staff:class_teacher_id(first_name, surname)")
    .order("sort_order")

  const classes = classesData ?? []

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Manage Classes</h1>
          <p className="text-text-muted mt-1">{classes.length} class{classes.length !== 1 ? "es" : ""} configured in Supabase</p>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-lg font-medium">No classes found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls: any) => (
            <div key={cls.id} className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-text text-lg">{cls.name}</p>
                <p className="text-sm text-text-muted mt-0.5">
                  Order #{cls.sort_order}
                  {cls.staff ? ` · Class Teacher: ${cls.staff.first_name || ''} ${cls.staff.surname || ''}` : " · No Class Teacher Assigned"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="info">Active</Badge>
                <Link href={`/admin/manage/classes/${cls.id}`}>
                  <Button variant="ghost" className="text-sm">Edit / View Roster →</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
