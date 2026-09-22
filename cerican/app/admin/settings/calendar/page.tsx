import { createServerClient } from "@/lib/supabase/server"
import { SchoolCalendarForm } from "@/components/admin/SchoolCalendarForm"

type CalendarSection = {
  section: "preschool" | "primary" | "jhs"
  vacation_date: string | null
  reopening_date: string | null
  total_school_days: number | null
}

export default async function SchoolCalendarPage() {
  const supabase = createServerClient()

  const { data: ctx } = await supabase
    .from("school_current_context")
    .select("school_id, term_id")
    .limit(1)
    .single()

  const { data: existing } = await supabase
    .from("school_calendar")
    .select("section, vacation_date, reopening_date, total_school_days")
    .eq("term_id", ctx?.term_id ?? "")
    .in("section", ["preschool", "primary", "jhs"])

  const bySection: Record<string, CalendarSection> = {}
  ;(existing ?? []).forEach((row: any) => {
    bySection[row.section] = row
  })

  const defaults: CalendarSection[] = [
    {
      section: "preschool",
      vacation_date: bySection.preschool?.vacation_date ?? null,
      reopening_date: bySection.preschool?.reopening_date ?? null,
      total_school_days: bySection.preschool?.total_school_days ?? null,
    },
    {
      section: "primary",
      vacation_date: bySection.primary?.vacation_date ?? null,
      reopening_date: bySection.primary?.reopening_date ?? null,
      total_school_days: bySection.primary?.total_school_days ?? null,
    },
    {
      section: "jhs",
      vacation_date: bySection.jhs?.vacation_date ?? null,
      reopening_date: bySection.jhs?.reopening_date ?? null,
      total_school_days: bySection.jhs?.total_school_days ?? null,
    },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">School Calendar</h1>
        <p className="text-text-muted mt-1">Set vacation and reopening dates plus total school days per section.</p>
      </div>
      <SchoolCalendarForm sections={defaults} />
    </div>
  )
}
