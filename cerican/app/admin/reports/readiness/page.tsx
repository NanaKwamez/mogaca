'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReadinessPage() {
  const [classId, setClassId] = useState('')
  const [termId, setTermId] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [terms, setTerms] = useState<{ id: string; label: string }[]>([])

  useEffect(() => {
    const supabase = createClient()

    const fetchClasses = async () => {
      const { data } = await supabase
        .from('classes')
        .select('id, name')
        .order('sort_order', { ascending: true })
      if (data) setClasses(data)
    }

    const fetchTerms = async () => {
      const { data: ctx } = await supabase
        .from('school_current_context')
        .select('academic_year_id')
        .limit(1)
        .maybeSingle()

      let query = supabase
        .from('terms')
        .select('id, term_number')

      if (ctx?.academic_year_id) {
        query = query.eq('academic_year_id', ctx.academic_year_id)
      }

      const { data } = await query
      if (data) {
        setTerms(data.map(t => ({
          id: t.id,
          label: `Term ${t.term_number}`
        })))
      }
    }

    fetchClasses()
    fetchTerms()
  }, [])

  async function check() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/readiness/${encodeURIComponent(classId)}/${encodeURIComponent(termId)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Unknown')
      setResult(json.result)
    } catch (err: any) {
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const att = result?.attendance_completeness

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Report Readiness</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        <select
          className="border p-2"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          <option value="">Select Class</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="border p-2"
          value={termId}
          onChange={(e) => setTermId(e.target.value)}
        >
          <option value="">Select Term</option>
          {terms.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded" disabled={!classId || !termId || loading} onClick={check}>
          {loading ? 'Checking…' : 'Check Readiness'}
        </button>
      </div>

      {att && (
        <div className="mt-6 bg-white p-5 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">Attendance Completeness</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border rounded-md p-4 bg-green-50 border-green-200">
              <div className="text-3xl font-bold text-green-700">{att.above_80_pct}</div>
              <div className="text-sm text-gray-600 mt-1">Students with ≥80% attendance</div>
            </div>
            <div className="border rounded-md p-4 bg-amber-50 border-amber-200">
              <div className="text-3xl font-bold text-amber-700">{att.below_80_pct}</div>
              <div className="text-sm text-gray-600 mt-1">Students with &lt;80% attendance</div>
            </div>
            <div className="border rounded-md p-4 bg-gray-50 border-gray-200">
              <div className="text-3xl font-bold text-gray-700">{att.no_records}</div>
              <div className="text-sm text-gray-600 mt-1">Students with no attendance records</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">Total active students in class: {att.total_students}</div>
        </div>
      )}

      {result && (
        <div className="mt-4 bg-white p-3 rounded shadow">
          <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </main>
  )
}
