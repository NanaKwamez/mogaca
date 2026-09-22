'use client'

import { useState } from 'react'

export default function FinanceRunner() {
  const [feeType, setFeeType] = useState({ name: '', class_id: '', term_id: '', is_mandatory: true })
  const [assessment, setAssessment] = useState({ student_id: '', fee_type_id: '', amount_assessed: '', due_date: '' })
  const [payment, setPayment] = useState({ fee_assessment_id: '', amount: '', payment_method: 'cash', payment_date: '' })
  const [arrearsArgs, setArrearsArgs] = useState({ classId: '', termId: '' })

  const [feeTypes, setFeeTypes] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [arrears, setArrears] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function safeFetch(url: string, init?: RequestInit) {
    const res = await fetch(url, init)
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error || 'Request failed')
    return json
  }

  async function loadFeeTypes() {
    setLoading(true)
    setError(null)
    try {
      const json = await safeFetch('/api/finance/fee-types')
      setFeeTypes(json.feeTypes || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function createFeeType() {
    setLoading(true)
    setError(null)
    try {
      await safeFetch('/api/finance/fee-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...feeType,
          class_id: feeType.class_id || null,
          term_id: feeType.term_id || null,
        }),
      })
      setFeeType({ name: '', class_id: '', term_id: '', is_mandatory: true })
      await loadFeeTypes()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function createAssessment() {
    setLoading(true)
    setError(null)
    try {
      await safeFetch('/api/finance/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...assessment,
          amount_assessed: Number(assessment.amount_assessed),
          due_date: assessment.due_date || null,
        }),
      })
      setAssessment({ student_id: '', fee_type_id: '', amount_assessed: '', due_date: '' })
      const json = await safeFetch('/api/finance/assessments')
      setAssessments(json.assessments || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function createPayment() {
    setLoading(true)
    setError(null)
    try {
      await safeFetch('/api/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payment,
          amount: Number(payment.amount),
          payment_date: payment.payment_date || null,
        }),
      })
      setPayment({ fee_assessment_id: '', amount: '', payment_method: 'cash', payment_date: '' })
      const json = await safeFetch('/api/finance/payments')
      setPayments(json.payments || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadArrears() {
    setLoading(true)
    setError(null)
    try {
      const json = await safeFetch(`/api/finance/arrears/${encodeURIComponent(arrearsArgs.classId)}/${encodeURIComponent(arrearsArgs.termId)}`)
      setArrears(json.arrears || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function voidPayment(paymentId: string) {
    const reason = window.prompt('Reason for voiding this payment?')
    if (!reason) return
    setLoading(true)
    setError(null)
    try {
      await safeFetch(`/api/finance/payments/${paymentId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const json = await safeFetch('/api/finance/payments')
      setPayments(json.payments || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">Error: {error}</div>}

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-lg font-semibold">1) Fee Type Setup</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input className="border p-2" placeholder="Name" value={feeType.name} onChange={(e) => setFeeType((s) => ({ ...s, name: e.target.value }))} />
          <input className="border p-2" placeholder="Class ID (optional)" value={feeType.class_id} onChange={(e) => setFeeType((s) => ({ ...s, class_id: e.target.value }))} />
          <input className="border p-2" placeholder="Term ID (optional)" value={feeType.term_id} onChange={(e) => setFeeType((s) => ({ ...s, term_id: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={feeType.is_mandatory} onChange={(e) => setFeeType((s) => ({ ...s, is_mandatory: e.target.checked }))} />
            Mandatory
          </label>
        </div>
        <div className="flex gap-2">
          <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded" onClick={createFeeType}>Create Fee Type</button>
          <button disabled={loading} className="border px-4 py-2 rounded" onClick={loadFeeTypes}>Refresh Fee Types</button>
        </div>
        {feeTypes.length > 0 && <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">{JSON.stringify(feeTypes, null, 2)}</pre>}
      </section>

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-lg font-semibold">2) Create Assessment</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input className="border p-2" placeholder="Student ID" value={assessment.student_id} onChange={(e) => setAssessment((s) => ({ ...s, student_id: e.target.value }))} />
          <input className="border p-2" placeholder="Fee Type ID" value={assessment.fee_type_id} onChange={(e) => setAssessment((s) => ({ ...s, fee_type_id: e.target.value }))} />
          <input className="border p-2" placeholder="Amount" value={assessment.amount_assessed} onChange={(e) => setAssessment((s) => ({ ...s, amount_assessed: e.target.value }))} />
          <input className="border p-2" type="date" value={assessment.due_date} onChange={(e) => setAssessment((s) => ({ ...s, due_date: e.target.value }))} />
        </div>
        <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded" onClick={createAssessment}>Create Assessment</button>
        {assessments.length > 0 && <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">{JSON.stringify(assessments, null, 2)}</pre>}
      </section>

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-lg font-semibold">3) Record Payment / Void</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input className="border p-2" placeholder="Assessment ID" value={payment.fee_assessment_id} onChange={(e) => setPayment((s) => ({ ...s, fee_assessment_id: e.target.value }))} />
          <input className="border p-2" placeholder="Amount" value={payment.amount} onChange={(e) => setPayment((s) => ({ ...s, amount: e.target.value }))} />
          <input className="border p-2" placeholder="Method (cash/mobile money/bank)" value={payment.payment_method} onChange={(e) => setPayment((s) => ({ ...s, payment_method: e.target.value }))} />
          <input className="border p-2" type="date" value={payment.payment_date} onChange={(e) => setPayment((s) => ({ ...s, payment_date: e.target.value }))} />
        </div>
        <div className="flex gap-2">
          <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded" onClick={createPayment}>Record Payment</button>
          <button
            disabled={loading}
            className="border px-4 py-2 rounded"
            onClick={async () => {
              const json = await safeFetch('/api/finance/payments')
              setPayments(json.payments || [])
            }}
          >
            Refresh Payments
          </button>
        </div>
        {payments.length > 0 && (
          <div className="space-y-2">
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">{JSON.stringify(payments, null, 2)}</pre>
            <div className="flex flex-wrap gap-2">
              {payments
                .filter((p) => p.status === 'posted')
                .slice(0, 8)
                .map((p) => (
                  <button key={p.id} disabled={loading} className="bg-red-600 text-white text-xs px-3 py-2 rounded" onClick={() => voidPayment(p.id)}>
                    Void {p.receipt_number}
                  </button>
                ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-lg font-semibold">4) Arrears Report</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input className="border p-2" placeholder="Class ID" value={arrearsArgs.classId} onChange={(e) => setArrearsArgs((s) => ({ ...s, classId: e.target.value }))} />
          <input className="border p-2" placeholder="Term ID" value={arrearsArgs.termId} onChange={(e) => setArrearsArgs((s) => ({ ...s, termId: e.target.value }))} />
        </div>
        <button disabled={loading || !arrearsArgs.classId || !arrearsArgs.termId} className="bg-blue-600 text-white px-4 py-2 rounded" onClick={loadArrears}>
          Load Arrears
        </button>
        {arrears.length > 0 && <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">{JSON.stringify(arrears, null, 2)}</pre>}
      </section>
    </div>
  )
}
