import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { assessmentBalance, postedAmount } from '@/lib/finance/service'

export async function GET(req: Request) {
  try {
    const supabase = createServerClient()
    const url = new URL(req.url)
    const studentId = url.searchParams.get('student_id')

    let query = supabase
      .from('fee_assessments')
      .select('id, student_id, amount_assessed, due_date, fee_types(id, name, class_id, term_id), students(first_name, surname, student_id_code)')
      .order('created_at', { ascending: false })
    if (studentId) query = query.eq('student_id', studentId)

    const { data: assessments, error: aErr } = await query
    if (aErr) return NextResponse.json({ ok: false, error: aErr.message }, { status: 500 })
    if (!assessments || assessments.length === 0) return NextResponse.json({ ok: true, assessments: [] })

    const ids = assessments.map((a: any) => a.id)
    const { data: payments, error: pErr } = await supabase
      .from('payments')
      .select('id, fee_assessment_id, amount, status')
      .in('fee_assessment_id', ids)

    if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 })

    const byAssessment = new Map<string, any[]>()
    for (const p of payments || []) {
      const list = byAssessment.get(p.fee_assessment_id) || []
      list.push(p)
      byAssessment.set(p.fee_assessment_id, list)
    }

    const rows = (assessments as any[]).map((a) => {
      const related = byAssessment.get(a.id) || []
      return {
        ...a,
        amount_paid: postedAmount(related),
        balance: assessmentBalance(a, related),
      }
    })

    return NextResponse.json({ ok: true, assessments: rows })
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
    const student_id = typeof body.student_id === 'string' ? body.student_id : ''
    const fee_type_id = typeof body.fee_type_id === 'string' ? body.fee_type_id : ''
    const amount_assessed = Number(body.amount_assessed)
    const due_date = typeof body.due_date === 'string' && body.due_date ? body.due_date : null

    if (!student_id || !fee_type_id || !Number.isFinite(amount_assessed) || amount_assessed <= 0) {
      return NextResponse.json({ ok: false, error: 'student_id, fee_type_id, amount_assessed (>0) required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('fee_assessments')
      .insert([{ student_id, fee_type_id, amount_assessed, due_date }])
      .select('*')
      .single()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, assessment: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}
