import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

type CalendarSectionInput = {
  section: "preschool" | "primary" | "jhs"
  vacation_date?: string | null
  reopening_date?: string | null
  total_school_days?: number | null
}

export async function POST(req: Request) {
  try {
    const supabase = createServerClient()
    const { data: user } = await supabase.auth.getUser()
    if (!user?.user) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const sections: CalendarSectionInput[] = Array.isArray(body.sections) ? body.sections : []
    if (sections.length === 0) return NextResponse.json({ ok: false, error: 'sections is required' }, { status: 400 })

    const { data: ctx } = await supabase
      .from('school_current_context')
      .select('school_id, term_id')
      .limit(1)
      .single()

    if (!ctx?.school_id || !ctx?.term_id) {
      return NextResponse.json({ ok: false, error: 'Missing school context' }, { status: 400 })
    }

    const validSections = new Set(['preschool', 'primary', 'jhs'])
    const rows = sections
      .filter((s) => validSections.has(s.section))
      .map((s) => ({
        school_id: ctx.school_id,
        term_id: ctx.term_id,
        section: s.section,
        vacation_date: typeof s.vacation_date === 'string' && s.vacation_date.trim() !== ''
          ? s.vacation_date
          : null,
        reopening_date: typeof s.reopening_date === 'string' && s.reopening_date.trim() !== ''
          ? s.reopening_date
          : null,
        total_school_days: typeof s.total_school_days === 'number' && !Number.isNaN(s.total_school_days)
          ? s.total_school_days
          : null,
      }))

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'No valid sections provided' }, { status: 400 })
    }

    const { error } = await supabase
      .from('school_calendar')
      .upsert(rows, { onConflict: 'school_id, term_id, section' })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    // Also update the current term's vacation, reopening and total_days for global consistency
    const primarySection = rows.find((r) => r.section === 'primary') || rows[0]
    if (primarySection) {
      await supabase
        .from('terms')
        .update({
          vacation_date: primarySection.vacation_date,
          reopening_date: primarySection.reopening_date,
          total_school_days: primarySection.total_school_days,
        })
        .eq('id', ctx.term_id)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}
