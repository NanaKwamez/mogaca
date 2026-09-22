import { createServerClient } from '@/lib/supabase/server'

type FeeAssessmentRow = {
  id: string
  student_id: string
  amount_assessed: number
  due_date: string | null
  fee_types?: {
    id: string
    name: string
    term_id: string | null
    class_id: string | null
  } | null
}

type PaymentRow = {
  id: string
  fee_assessment_id: string
  amount: number
  status: string
}

export function buildReceiptNumber(schoolCode?: string | null) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')
  const prefix = (schoolCode || 'SCH').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  return `${prefix}-RCPT-${stamp}-${rand}`
}

export function postedAmount(payments: PaymentRow[]) {
  return payments
    .filter((p) => p.status === 'posted')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0)
}

export function assessmentBalance(assessment: FeeAssessmentRow, payments: PaymentRow[]) {
  return Number(assessment.amount_assessed || 0) - postedAmount(payments)
}

export async function listArrearsForClassTerm(classId: string, termId: string) {
  const supabase = createServerClient()
  const { data: assessments, error: aErr } = await supabase
    .from('fee_assessments')
    .select('id, student_id, amount_assessed, due_date, fee_types!inner(id, name, term_id, class_id), students!inner(first_name, surname, student_id_code)')
    .eq('fee_types.class_id', classId)
    .eq('fee_types.term_id', termId)

  if (aErr) throw new Error(aErr.message)

  if (!assessments || assessments.length === 0) return []

  const assessmentIds = assessments.map((a: any) => a.id)
  const { data: payments, error: pErr } = await supabase
    .from('payments')
    .select('id, fee_assessment_id, amount, status')
    .in('fee_assessment_id', assessmentIds)

  if (pErr) throw new Error(pErr.message)

  const byAssessment = new Map<string, PaymentRow[]>()
  for (const p of payments || []) {
    const list = byAssessment.get(p.fee_assessment_id) || []
    list.push(p as PaymentRow)
    byAssessment.set(p.fee_assessment_id, list)
  }

  const rows = (assessments as any[]).map((a) => {
    const related = byAssessment.get(a.id) || []
    const paid = postedAmount(related)
    const balance = Number(a.amount_assessed || 0) - paid
    return {
      assessment_id: a.id,
      student_id: a.student_id,
      student_name: `${a.students?.surname || ''}, ${a.students?.first_name || ''}`.trim(),
      student_id_code: a.students?.student_id_code || null,
      fee_type_name: a.fee_types?.name || '',
      amount_assessed: Number(a.amount_assessed || 0),
      amount_paid: paid,
      balance,
      due_date: a.due_date,
    }
  })

  return rows.filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance)
}
