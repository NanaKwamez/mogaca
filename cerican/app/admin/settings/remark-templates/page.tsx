import { createServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { RemarkTemplatesForm } from "./RemarkTemplatesForm"

export default async function RemarkTemplatesPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: templates } = await supabase
    .from("remark_templates")
    .select("*")
    .order("created_at")

  const defaultTemplates = (templates && templates.length > 0) ? templates : [
    { category: "EXCELLENT", target: "TEACHER", text: "An outstanding academic performance. Demonstrates great diligence and mastery of concepts." },
    { category: "VERY_GOOD", target: "TEACHER", text: "Very good result. Consistently produces high quality work in class assignments." },
    { category: "AVERAGE", target: "TEACHER", text: "Satisfactory performance. Possesses good potential to achieve higher results with extra focus." },
    { category: "NEEDS_IMPROVEMENT", target: "TEACHER", text: "Fair effort shown. Needs to pay more attention in class and complete all homework on time." },
    { category: "EXCELLENT", target: "HEADMASTER", text: "Promoted with distinction. Keep up the excellent work!" },
    { category: "AVERAGE", target: "HEADMASTER", text: "Promoted. Encouraged to put in more effort next term." },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/admin/settings" className="text-sm text-primary hover:underline mb-2 inline-block">
          ← Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Remark Templates</h1>
        <p className="text-xs text-slate-600 mt-1">Manage reusable comment templates for Class Teachers and Headmasters.</p>
      </div>

      <RemarkTemplatesForm initialTemplates={defaultTemplates} />
    </div>
  )
}
