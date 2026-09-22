// app/api/remarks/[logId]/route.ts
// PATCH: edit a remark_generation_log entry (final_text), mark as EDITED

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PATCH(req: Request, { params }: { params: { logId: string } }) {
  try {
    const supabase = createServerClient()
    const body = await req.json().catch(() => ({}))
    const { final_text } = body
    if (typeof final_text !== 'string') return NextResponse.json({ ok: false, error: 'final_text required' }, { status: 400 })

    const { data, error } = await supabase
      .from('remark_generation_log')
      .update({ final_text, status: 'EDITED', was_edited: true, edited_at: new Date().toISOString() })
      .eq('id', params.logId)

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, updated: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}
