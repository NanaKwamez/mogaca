import { createServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { GradingSchemaForm } from "./GradingSchemaForm"

export default async function GradingSchemaSettingsPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: ctx } = await supabase.from("school_current_context").select("school_id").limit(1).single()
  const schoolId = ctx?.school_id ?? "6caa6780-29ba-4e94-93b4-5a450fc7ccbc"

  const { data: schema } = await supabase
    .from("grading_schemas")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .maybeSingle()

  const defaultBands = schema?.bands ?? [
    { grade: "A1", min: 80, max: 100, remark: "Excellent" },
    { grade: "B2", min: 70, max: 79, remark: "Very Good" },
    { grade: "B3", min: 65, max: 69, remark: "Good" },
    { grade: "C4", min: 60, max: 64, remark: "Credit" },
    { grade: "C5", min: 55, max: 59, remark: "Credit" },
    { grade: "C6", min: 50, max: 54, remark: "Credit" },
    { grade: "D7", min: 45, max: 49, remark: "Pass" },
    { grade: "E8", min: 40, max: 44, remark: "Pass" },
    { grade: "F9", min: 0,  max: 39, remark: "Fail" },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/admin/settings" className="text-sm text-primary hover:underline mb-2 inline-block">
          ← Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Grading Schema</h1>
        <p className="text-xs text-slate-600 mt-1">Configure academic grading bands, thresholds, and performance remarks.</p>
      </div>

      <GradingSchemaForm initialBands={defaultBands} />
    </div>
  )
}
