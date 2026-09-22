'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type StudentReportRow = {
  id: string
  student_id: { first_name: string; surname: string }
  class_id: { id: string; name: string }
  term_id: { id: string; term_number: number }
}

type ScoresheetRow = {
  id: string
  class_id: { id: string; name: string }
  term_id: { id: string; term_number: number }
}

export default function PreviewPage() {
  const [reportId, setReportId] = useState('')
  const [reports, setReports] = useState<{ id: string; label: string }[]>([])
  const [noReports, setNoReports] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const fetchReports = async () => {
      setLoading(true)
      setNoReports(false)

      try {
        const { data, error } = await supabase
          .from('student_reports')
          .select(`
            id,
            student_id (first_name, surname),
            class_id (id, name),
            term_id (id, term_number)
          `)
          .order('generated_at', { ascending: false })
          .limit(100)

        if (!error && data && data.length > 0) {
          const items: { id: string; label: string }[] = []
          for (const r of data as unknown as StudentReportRow[]) {
            const s = r.student_id
            const c = r.class_id
            const t = r.term_id
            if (s && c && t) {
              items.push({
                id: r.id,
                label: `${s.first_name} ${s.surname} · ${c.name} · Term ${t.term_number}`
              })
            }
          }
          if (items.length > 0) {
            setReports(items)
            setLoading(false)
            return
          }
        }
      } catch (e) {
      }

      try {
        const { data: ssData, error: ssError } = await supabase
          .from('scoresheet_submissions')
          .select(`
            id,
            class_id (id, name),
            term_id (id, term_number)
          `)
          .not('submitted_at', 'is', null)
          .order('submitted_at', { ascending: false })

        if (!ssError && ssData && ssData.length > 0) {
          const seen = new Map<string, string>()
          const rows = ssData as unknown as ScoresheetRow[]
          for (const row of rows) {
            const c = row.class_id
            const t = row.term_id
            if (c && t) {
              const key = `${c.id}-${t.id}`
              if (!seen.has(key)) {
                seen.set(key, row.id)
              }
            }
          }
          const items: { id: string; label: string }[] = []
          for (const row of rows) {
            const c = row.class_id
            const t = row.term_id
            if (c && t) {
              const key = `${c.id}-${t.id}`
              if (seen.get(key) === row.id) {
                items.push({
                  id: row.id,
                  label: `${c.name} · Term ${t.term_number}`
                })
              }
            }
          }
          if (items.length > 0) {
            setReports(items)
            setLoading(false)
            return
          }
        }
      } catch (e) {
      }

      setNoReports(true)
      setLoading(false)
    }

    void fetchReports()
  }, [])

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Preview Report PDF</h1>
      <div className="mb-4">
        {loading ? (
          <div className="text-gray-500 p-2 border">Loading reports…</div>
        ) : noReports ? (
          <div className="text-amber-700 p-3 border border-amber-200 rounded bg-amber-50">
            Generate reports first from Report Generation
          </div>
        ) : (
          <select
            className="border p-2 w-full"
            value={reportId}
            onChange={(e) => setReportId(e.target.value)}
          >
            <option value="">Select Report</option>
            {reports.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        )}
      </div>
      {reportId && (
        <iframe src={`/api/reports/pdf/${reportId}`} style={{ width: '100%', height: '80vh', border: '1px solid #ddd' }} />
      )}
    </main>
  )
}
