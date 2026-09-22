'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PrintButton } from '@/components/ui/PrintButton'

interface MeritStudent {
  rank: number
  student_id_code: string
  surname: string
  first_name: string
  total_score: number
  average_score: number
  grade?: string
}

export default function OrderOfMerit() {
  const [classId, setClassId] = useState('')
  const [termId, setTermId] = useState('')
  const [loading, setLoading] = useState(false)
  const [meritList, setMeritList] = useState<MeritStudent[] | null>(null)
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
    setMeritList(null)
    try {
      const supabase = createClient()
      const [{ data: sData }, { data: subjData }] = await Promise.all([
        supabase.from("students").select("id, student_id_code, surname, first_name").eq("class_id", classId).eq("is_active", true).order("surname"),
        supabase.from("subjects").select("id").eq("class_id", classId),
      ])

      const studentList = sData ?? []
      const subjectIds = (subjData ?? []).map(s => s.id)
      const studentIds = studentList.map(s => s.id)

      if (studentIds.length === 0 || subjectIds.length === 0) {
        setMeritList([])
        return
      }

      const { data: scoresData } = await supabase
        .from("scores")
        .select("student_id, total_score")
        .eq("term_id", termId)
        .in("student_id", studentIds)
        .in("subject_id", subjectIds)

      const scoresByStudent = new Map<string, { sum: number; cnt: number }>()
      for (const sc of scoresData ?? []) {
        if (sc.total_score !== null && sc.total_score !== undefined) {
          const prev = scoresByStudent.get(sc.student_id) ?? { sum: 0, cnt: 0 }
          scoresByStudent.set(sc.student_id, { sum: prev.sum + Number(sc.total_score), cnt: prev.cnt + 1 })
        }
      }

      const list: MeritStudent[] = studentList.map(stu => {
        const stat = scoresByStudent.get(stu.id) ?? { sum: 0, cnt: 0 }
        const avg = stat.cnt > 0 ? Math.round((stat.sum / stat.cnt) * 10) / 10 : 0
        return {
          rank: 1,
          student_id_code: stu.student_id_code ?? "",
          surname: stu.surname,
          first_name: stu.first_name,
          total_score: stat.sum,
          average_score: avg,
        }
      })

      list.sort((a, b) => b.total_score - a.total_score)
      list.forEach((item, index) => {
        item.rank = index + 1
      })

      setMeritList(list)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedClassName = classes.find(c => c.id === classId)?.name ?? "Class"

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center print:hidden">
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <select
            className="h-[42px] border border-border rounded-md px-3 text-sm bg-white"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">Select Class...</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            className="h-[42px] border border-border rounded-md px-3 text-sm bg-white"
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
          >
            <option value="">Select Term...</option>
            {terms.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <button
            className="h-[42px] bg-primary text-white font-medium px-5 rounded-md hover:bg-primary-dark transition-colors text-sm"
            disabled={!classId || !termId || loading}
            onClick={run}
          >
            {loading ? 'Generating...' : 'Get Order of Merit'}
          </button>
        </div>

        {meritList && meritList.length > 0 && (
          <PrintButton label="Print Order of Merit" />
        )}
      </div>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">Error: {error}</div>}

      {meritList && (
        meritList.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-border text-slate-500">
            No active student score records found for {selectedClassName}.
          </div>
        ) : (
          <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Official Order of Merit — {selectedClassName}</h3>
                <p className="text-xs text-slate-300">Ranked by total aggregate score</p>
              </div>
              <span className="text-xs bg-slate-800 px-3 py-1 rounded-full font-mono font-bold">
                {meritList.length} Students
              </span>
            </div>

            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                  <th className="py-3 px-4 text-center w-16">Rank</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4 text-center">Total Score</th>
                  <th className="py-3 px-4 text-center">Average Score</th>
                </tr>
              </thead>
              <tbody>
                {meritList.map((stu, idx) => (
                  <tr key={idx} className={`border-b border-border ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-indigo-50/30 transition-colors`}>
                    <td className="py-3 px-4 text-center font-bold text-indigo-700 font-mono">
                      #{stu.rank}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{stu.student_id_code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{stu.surname}, {stu.first_name}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">{stu.total_score}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600">{stu.average_score}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
