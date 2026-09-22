import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { buildReceiptNumber } from '@/lib/finance/service'

export async function GET(req: Request) {
  try {
    const supabase = createServerClient()
    const url = new URL(req.url)
    const assessmentId = url.searchParams.get('fee_assessment_id')

    let query = supabase
      .from('payments')
      .select('id, fee_assessment_id, amount, payment_date, payment_method, receipt_number, status, created_at')
      .order('created_at', { ascending: false })
    if (assessmentId) query = query.eq('fee_assessment_id', assessmentId)

    const { data, error } = await query
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, payments: data || [] })
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
    const fee_assessment_id = typeof body.fee_assessment_id === 'string' ? body.fee_assessment_id : ''
    const amount = Number(body.amount)
    const payment_method = typeof body.payment_method === 'string' ? body.payment_method.trim() : ''
    const payment_date = typeof body.payment_date === 'string' && body.payment_date ? body.payment_date : new Date().toISOString().slice(0, 10)

    if (!fee_assessment_id || !Number.isFinite(amount) || amount <= 0 || !payment_method) {
      return NextResponse.json({ ok: false, error: 'fee_assessment_id, amount (>0), payment_method required' }, { status: 400 })
    }

    const { data: assessment, error: aErr } = await supabase
      .from('fee_assessments')
      .select('id, fee_type_id')
      .eq('id', fee_assessment_id)
      .single()

    if (aErr || !assessment) return NextResponse.json({ ok: false, error: 'fee assessment not found' }, { status: 404 })

    const { data: feeType } = await supabase.from('fee_types').select('school_id').eq('id', assessment.fee_type_id).single()
    const { data: school } = feeType?.school_id
      ? await supabase.from('schools').select('code').eq('id', feeType.school_id).single()
      : { data: null as any }

    const receipt = buildReceiptNumber(school?.code || null)
    const { data, error } = await supabase
      .from('payments')
      .insert([
        {
          fee_assessment_id,
          amount,
          payment_method,
          payment_date,
          status: 'posted',
          receipt_number: receipt,
          recorded_by: user.user.id,
        },
      ])
      .select('*')
      .single()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, payment: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}
