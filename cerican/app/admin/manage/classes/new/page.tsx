import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"

export default function NewClassPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-surface border border-border rounded-lg p-8 text-center space-y-4">
        <Badge variant="info">Info</Badge>
        <h2 className="text-xl font-bold text-text">No Manual Class Creation</h2>
        <p className="text-text-muted">
          Classes already exist in Supabase. New classes are managed via the database directly.
        </p>
        <Link href="/admin/manage/classes">
          <Button>Back to Classes →</Button>
        </Link>
      </div>
    </div>
  )
}
