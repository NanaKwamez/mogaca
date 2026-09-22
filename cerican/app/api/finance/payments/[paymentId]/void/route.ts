import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: { paymentId: string } }) {
  try {
    const supabase = createServerClient()
    const { data: user } = await supabase.auth.getUser()
    if (!user?.user) return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (!reason) return NextResponse.json({ ok: false, error: 'reason is required' }, { status: 400 })

    const { data: payment, error: fetchErr } = await supabase
      .from('payments')
      .select('id, status, fee_assessment_id, amount, receipt_number')
      .eq('id', params.paymentId)
      .single()

    if (fetchErr || !payment) return NextResponse.json({ ok: false, error: 'payment not found' }, { status: 404 })
    if (payment.status !== 'posted') return NextResponse.json({ ok: false, error: 'only posted payments can be voided' }, { status: 400 })

    const { data, error } = await supabase
      .from('payments')
      .update({ status: 'void' })
      .eq('id', params.paymentId)
      .select('*')
      .single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    await supabase.from('audit_log').insert({
      action: 'PAYMENT_VOIDED',
      table_name: 'payments',
      record_id: params.paymentId,
      user_id: user.user.id,
      old_values: { status: 'posted' },
      new_values: { status: 'void', reason },
    })

    return NextResponse.json({ ok: true, payment: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message ?? String(err) }, { status: 500 })
  }
}
