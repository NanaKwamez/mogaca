// app/api/remarks/log/[reportId]/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: { reportId: string } }) {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('remark_generation_log')
      .select('*')
      .eq('student_report_id', params.reportId)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, logs: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}
