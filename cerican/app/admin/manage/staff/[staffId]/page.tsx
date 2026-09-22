import { createServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { StaffEditForm } from "./StaffEditForm"

interface PageProps {
  params: { staffId: string }
}

export default async function StaffEditPage({ params }: PageProps) {
  const supabase = createServerClient()

  const { data: staff } = await supabase
    .from("staff")
    .select("*")
    .eq("id", params.staffId)
    .maybeSingle()

  if (!staff) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-surface border border-border rounded-lg p-8 text-center">
          <h2 className="text-lg font-semibold text-text mb-2">Staff Member Not Found</h2>
          <p className="text-text-muted text-sm mb-6">The requested staff record could not be found.</p>
          <Link href="/admin/manage/staff">
            <Button variant="secondary">Back to Staff</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/manage/staff" className="text-sm text-primary hover:underline mb-2 inline-block">
            ← Back to Staff
          </Link>
          <h1 className="text-2xl font-bold text-text">{staff.surname}, {staff.first_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-mono text-text-muted">{staff.staff_id_code}</span>
            <Badge variant="default">{staff.staff_type}</Badge>
            <Badge variant={staff.is_active ? "success" : "default"}>
              {staff.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>

      <StaffEditForm staff={staff} />
    </div>
  )
}
