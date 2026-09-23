import { createServerClient } from "@/lib/supabase/server"
import { checkReportReadiness } from "@/lib/scoring/readiness"
import { Button } from "@/components/ui/Button"
import Link from "next/link"

export default async function ReportReadinessPage({
  searchParams,
}: {
  searchParams: { class_id?: string; term_id?: string; academic_year_id?: string }
}) {
  const { class_id, term_id, academic_year_id } = searchParams
  const supabase = createServerClient()

  // Load current context as default fallback
  const { data: ctx } = await supabase
    .from("school_current_context")
    .select("school_id, term_id, academic_year_id")
    .limit(1)
    .single()

  // Load academic years and classes
  const [{ data: years }, { data: classes }] = await Promise.all([
    supabase.from("academic_years").select("id, label").order("label", { ascending: false }),
    supabase.from("classes").select("id, name").order("sort_order")
  ])

  const selectedYearId = academic_year_id ?? ctx?.academic_year_id ?? years?.[0]?.id ?? ""

  // Fetch terms for selected academic year
  const { data: terms } = selectedYearId
    ? await supabase
        .from("terms")
        .select("id, term_number, term, is_current")
        .eq("academic_year_id", selectedYearId)
        .order("term_number")
    : { data: [] }

  const termList = terms ?? []
  const selectedTermId = term_id ?? (termList.find(t => t.is_current)?.id || termList[0]?.id || ctx?.term_id || "")
  const selectedClassId = class_id ?? ""

  let readiness = null
  if (selectedClassId && selectedTermId) {
    readiness = await checkReportReadiness(selectedClassId, selectedTermId)
  }

  const statusIcon = (status: "ok" | "warning" | "blocking") =>
    status === "ok" ? "✓" : status === "warning" ? "⚠" : "✗"

  const statusColor = (status: "ok" | "warning" | "blocking") =>
    status === "ok"
      ? "text-emerald-600"
      : status === "warning"
      ? "text-amber-600"
      : "text-red-600"

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Academic Report Readiness</h1>
        <p className="text-slate-600 text-xs mt-1">Select Academic Year, Term, and Class to review submission status and generate/print terminal report cards.</p>
      </div>

      {/* Academic Year / Term / Class Selectors */}
      <form className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">Academic Year</label>
            <select
              name="academic_year_id"
              defaultValue={selectedYearId}
              className="h-[42px] rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
            >
              {(years ?? []).map((y: { id: string; label: string }) => (
                <option key={y.id} value={y.id}>{y.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">Academic Term</label>
            <select
              name="term_id"
              defaultValue={selectedTermId}
              className="h-[42px] rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
            >
              {(termList).map((t: any) => (
                <option key={t.id} value={t.id}>
                  Term {t.term_number} {t.is_current ? " (Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700 uppercase">Target Class</label>
            <select
              name="class_id"
              defaultValue={selectedClassId}
              className="h-[42px] rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
            >
              <option value="">-- Choose Class --</option>
              {(classes ?? []).map((c: { id: string; name: string }) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200">
          <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold">
            🔍 Check Report Readiness
          </Button>
        </div>
      </form>

      {readiness && (
        <div className="space-y-4">
          <div className="space-y-3">
            {readiness.checks.map((check) => (
              <div
                key={check.key}
                className={`bg-white rounded-xl border p-4 flex items-start gap-3 shadow-sm ${
                  check.status === "blocking"
                    ? "border-red-300 bg-red-50/30"
                    : check.status === "warning"
                    ? "border-amber-300 bg-amber-50/30"
                    : "border-slate-200"
                }`}
              >
                <span className={`text-lg font-bold ${statusColor(check.status)}`}>{statusIcon(check.status)}</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{check.label}</p>
                  {check.detail && <p className="text-xs text-slate-600 mt-0.5">{check.detail}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex gap-3 justify-end items-center flex-wrap">
            <Link
              href={selectedClassId && selectedTermId
                ? `/admin/academic/reports/print?class_id=${selectedClassId}&term_id=${selectedTermId}`
                : "#"}
            >
              <Button
                disabled={!selectedClassId || !selectedTermId}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
              >
                🖨️ Mass Print Report Cards →
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
