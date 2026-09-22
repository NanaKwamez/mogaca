'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ReportsRunner() {
  const [classId, setClassId] = useState('')
  const [termId, setTermId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
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

  async function run() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/reports/generate/class/${encodeURIComponent(classId)}/${encodeURIComponent(termId)}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Unknown error')
      setResult(json.summary || json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Generate Report Snapshots</h2>
        <p className="text-sm text-slate-500 mt-1">
          Compile student terminal report cards into immutable official snapshots.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Target Class</label>
          <select
            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">-- Choose Class --</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Academic Term</label>
          <select
            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
          >
            <option value="">-- Choose Term --</option>
            {terms.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-2 flex items-center gap-3">
        <button
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-colors shadow"
          disabled={loading || !classId || !termId}
          onClick={run}
        >
          {loading ? '⚡ Compiling Snapshots…' : '🚀 Generate Report Snapshots'}
        </button>

        {classId && termId && (
          <Link
            href={`/admin/academic/reports/print?class_id=${classId}&term_id=${termId}`}
            className="border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            🖨️ View / Print Cards
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
          ❌ Error: {error}
        </div>
      )}

      {result && (
        <div className="mt-6 border border-emerald-200 bg-emerald-50/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-emerald-900 text-base">✓ Snapshot Generation Complete</h3>
            <span className="bg-emerald-600 text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">Success</span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-white border border-emerald-100 p-3 rounded-lg shadow-sm">
              <span className="text-xs text-slate-500 font-medium block">Total Students</span>
              <span className="text-xl font-bold text-slate-900 font-mono">{result.total ?? 0}</span>
            </div>
            <div className="bg-white border border-emerald-100 p-3 rounded-lg shadow-sm">
              <span className="text-xs text-slate-500 font-medium block">Snapshots Created</span>
              <span className="text-xl font-bold text-emerald-700 font-mono">{result.snapshots ?? 0}</span>
            </div>
            <div className="bg-white border border-emerald-100 p-3 rounded-lg shadow-sm">
              <span className="text-xs text-slate-500 font-medium block">Errors / Warnings</span>
              <span className="text-xl font-bold text-amber-600 font-mono">{result.errors?.length ?? 0}</span>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded border border-amber-200">
              <strong className="block mb-1 font-semibold">Notes / Issues:</strong>
              <ul className="list-disc pl-4 space-y-1">
                {result.errors.map((e: any, idx: number) => (
                  <li key={idx}>{typeof e === 'string' ? e : JSON.stringify(e)}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Link
              href={`/admin/academic/reports/print?class_id=${classId}&term_id=${termId}`}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase px-4 py-2 rounded-lg transition-colors shadow"
            >
              Print Class Report Cards →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
