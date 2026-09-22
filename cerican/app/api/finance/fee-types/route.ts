import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const supabase = createServerClient()
    const url = new URL(req.url)
    const classId = url.searchParams.get('class_id')
    const termId = url.searchParams.get('term_id')

    let query = supabase.from('fee_types').select('*').order('name')
    if (classId) query = query.eq('class_id', classId)
    if (termId) query = query.eq('term_id', termId)

    const { data, error } = await query
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, feeTypes: data || [] })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createServerClient()
    const { data: user } = await supabase.auth.getUser()
    if (!user?.user) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const class_id = typeof body.class_id === 'string' ? body.class_id : null
    const term_id = typeof body.term_id === 'string' ? body.term_id : null
    const is_mandatory = body.is_mandatory !== false
    if (!name) return NextResponse.json({ ok: false, error: 'name is required' }, { status: 400 })

    const { data: ctx } = await supabase.from('school_current_context').select('school_id').limit(1).single()
    if (!ctx?.school_id) return NextResponse.json({ ok: false, error: 'Missing school context' }, { status: 400 })

    const { data, error } = await supabase
      .from('fee_types')
      .insert([{ school_id: ctx.school_id, name, class_id, term_id, is_mandatory }])
      .select('*')
      .single()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, feeType: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}
