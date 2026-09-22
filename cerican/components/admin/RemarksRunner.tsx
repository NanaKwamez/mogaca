'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function RemarksRunner() {
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
      if (data) {
        setClasses(data)
        if (data.length > 0) setClassId(data[0].id)
      }
    }

    const fetchTerms = async () => {
      const { data: ctx } = await supabase
        .from('school_current_context')
        .select('academic_year_id, term_id')
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
        if (ctx?.term_id) setTermId(ctx.term_id)
        else if (data.length > 0) setTermId(data[0].id)
      }
    }

    fetchClasses()
    fetchTerms()
  }, [])

  async function run() {
    if (!classId || !termId) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/remarks/generate-all/${encodeURIComponent(classId)}/${encodeURIComponent(termId)}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to execute remark generation')
      setResult(json.summary ?? json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedClass = classes.find(c => c.id === classId)?.name ?? "Class"

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Deterministic Remarks Engine (Admin)</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Auto-generate professional teacher and headmaster remarks for students based on their terminal score aggregates.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Class</label>
            <select
              className="w-full h-[42px] border border-border rounded-md px-3 text-sm bg-white"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">Select Class...</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Term</label>
            <select
              className="w-full h-[42px] border border-border rounded-md px-3 text-sm bg-white"
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
            >
              <option value="">Select Term...</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              className="w-full h-[42px] bg-primary text-white font-semibold rounded-md hover:bg-primary-dark transition-colors text-sm shadow-sm"
              disabled={loading || !classId || !termId}
              onClick={run}
            >
              {loading ? 'Generating Remarks...' : 'Run Remark Engine'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">Error: {error}</div>}

      {result && (
        <div className="bg-white border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Generation Result for {selectedClass}</h3>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">✓ Completed</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
            <div>
              <span className="text-xs text-slate-500 font-medium block">Total Enrolled</span>
              <span className="text-xl font-bold text-slate-900 font-mono">{result.total ?? 0}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Newly Generated</span>
              <span className="text-xl font-bold text-emerald-600 font-mono">{result.generated ?? 0}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Already Approved</span>
              <span className="text-xl font-bold text-blue-600 font-mono">{result.skipped_already_generated_or_approved ?? 0}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Manual Review</span>
              <span className="text-xl font-bold text-amber-600 font-mono">{result.manual_review_required ?? 0}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href={`/admin/academic/reports/print?class_id=${classId}&term_id=${termId}`}
              className="px-4 py-2 bg-slate-900 text-white font-medium rounded-md hover:bg-slate-800 text-sm flex items-center gap-2"
            >
              <span>🖨️ Mass Print Report Cards →</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
