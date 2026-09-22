import { createServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export default async function ReportSettingsPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: ctx } = await supabase.from("school_current_context").select("school_id").limit(1).single()
  const schoolId = ctx?.school_id ?? "6caa6780-29ba-4e94-93b4-5a450fc7ccbc"

  const { data: config } = await supabase
    .from("report_settings")
    .select("*")
    .eq("school_id", schoolId)
    .maybeSingle()

  async function saveReportSettings(formData: FormData) {
    "use server"
    const supabase = createServerClient()
    const { data: ctx } = await supabase.from("school_current_context").select("school_id").limit(1).single()
    const sId = ctx?.school_id ?? "6caa6780-29ba-4e94-93b4-5a450fc7ccbc"

    const showPosition = formData.get("show_position") === "on"
    const showAttendance = formData.get("show_attendance") === "on"
    const headmasterTitle = formData.get("headmaster_title") as string
    const reportFooter = formData.get("report_footer") as string

    await supabase.from("report_settings").upsert({
      school_id: sId,
      show_position: showPosition,
      show_attendance: showAttendance,
      headmaster_title: headmasterTitle || "Headmaster",
      report_footer: reportFooter || "Cerican School Management",
      updated_at: new Date().toISOString(),
    }, { onConflict: "school_id" })

    revalidatePath("/admin/settings/reports")
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/admin/settings" className="text-sm text-primary hover:underline mb-2 inline-block">
          ← Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Report Settings</h1>
        <p className="text-xs text-slate-600 mt-1">Configure layout options and signature labels for student report cards.</p>
      </div>

      <form action={saveReportSettings} className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-6">
        <div className="space-y-4">
          <h2 className="font-bold text-slate-900 text-base border-b border-border pb-2">Display Preferences</h2>

          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <span className="text-sm font-bold text-slate-900 block">Show Class Ranks / Positions</span>
              <span className="text-xs text-slate-500">Display student rank (e.g. #1, #2) on report cards.</span>
            </div>
            <input
              type="checkbox"
              name="show_position"
              defaultChecked={config?.show_position ?? true}
              className="w-5 h-5 accent-primary rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <span className="text-sm font-bold text-slate-900 block">Show Attendance Summary</span>
              <span className="text-xs text-slate-500">Display total days present and total school days.</span>
            </div>
            <input
              type="checkbox"
              name="show_attendance"
              defaultChecked={config?.show_attendance ?? true}
              className="w-5 h-5 accent-primary rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h2 className="font-bold text-slate-900 text-base border-b border-border pb-2">Endorsement Labels</h2>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Administrator Signature Title</label>
            <input
              type="text"
              name="headmaster_title"
              defaultValue={config?.headmaster_title ?? "Headmaster"}
              placeholder="e.g. Headmaster / Principal"
              className="w-full h-[42px] px-3 rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Report Card Footer Note</label>
            <input
              type="text"
              name="report_footer"
              defaultValue={config?.report_footer ?? "Excellence & Discipline"}
              placeholder="e.g. Excellence & Discipline"
              className="w-full h-[42px] px-3 rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary text-white font-semibold text-sm rounded-md hover:bg-primary-dark transition-colors shadow-sm"
          >
            Save Report Settings
          </button>
        </div>
      </form>
    </div>
  )
}
