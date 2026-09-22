"use client"
import * as React from "react"
import { Button } from "@/components/ui/Button"
import { saveScore, submitScoresheet, updateScoresheetConfigWeights } from "@/lib/actions/scores"
import { useRouter } from "next/navigation"

interface Student {
  id: string
  surname: string
  first_name: string
  scores?: {
    classwork_score: number | null
    homework_score: number | null
    classtest_score: number | null
    exam_score: number | null
    total_score: number | null
    grade: string | null
    position: number | null
  }
}

interface ScoreEntryListProps {
  students: Student[]
  subjectId: string
  classId: string
  termId: string
  classworkMax: number
  homeworkMax: number
  classtestMax: number
  examMax: number
  submissionStatus: string
  subjectName: string
  className: string
  termName: string
}

interface StudentScoreState {
  classwork_score: string
  homework_score: string
  classtest_score: string
  exam_score: string
  total: number | null
  grade: string | null
  position: number | null
  saving: boolean
  error: string | null
}

function computeLiveTotal(
  cw: string, hw: string, ct: string, ex: string,
  cwMax: number, hwMax: number, ctMax: number, exMax: number
): { total: number | null; error: string | null } {
  const parse = (v: string, label: string, max: number): { val: number | null; err: string | null } => {
    if (v === "" || v === undefined) return { val: null, err: null }
    const n = parseFloat(v)
    if (isNaN(n)) return { val: null, err: `${label} must be a number` }
    if (n < 0) return { val: null, err: `${label} cannot be negative` }
    if (n > max) return { val: null, err: `${label} cannot exceed ${max}` }
    return { val: n, err: null }
  }
  const r1 = parse(cw, "Classwork", cwMax)
  const r2 = parse(hw, "Homework", hwMax)
  const r3 = parse(ct, "Class Test", ctMax)
  const r4 = parse(ex, "Exam", exMax)

  for (const r of [r1, r2, r3, r4]) {
    if (r.err) return { total: null, error: r.err }
  }

  const vals = [r1.val, r2.val, r3.val, r4.val]
  if (vals.every(v => v === null)) return { total: null, error: null }
  
  const sum = vals.reduce<number>((acc, v) => acc + (v ?? 0), 0)
  if (sum > 100) return { total: null, error: "Total cannot exceed 100" }

  // Only compute final total if all 4 are filled
  if (vals.some(v => v === null)) return { total: null, error: null }
  return { total: Math.round(sum * 100) / 100, error: null }
}

export function ScoreEntryList({
  students, subjectId, classId, termId,
  classworkMax: initCwMax, homeworkMax: initHwMax, classtestMax: initCtMax, examMax: initExMax,
  submissionStatus, subjectName, className, termName,
}: ScoreEntryListProps) {
  const router = useRouter()
  const [weights, setWeights] = React.useState({
    cwMax: initCwMax,
    hwMax: initHwMax,
    ctMax: initCtMax,
    exMax: initExMax,
  })
  const [showDial, setShowDial] = React.useState(false)
  const [savingWeights, setSavingWeights] = React.useState(false)
  const [weightErr, setWeightErr] = React.useState<string | null>(null)

  const [scores, setScores] = React.useState<Record<string, StudentScoreState>>(
    () => Object.fromEntries(students.map(s => [
      s.id,
      {
        classwork_score: s.scores?.classwork_score?.toString() ?? "",
        homework_score:  s.scores?.homework_score?.toString() ?? "",
        classtest_score: s.scores?.classtest_score?.toString() ?? "",
        exam_score:      s.scores?.exam_score?.toString() ?? "",
        total:    s.scores?.total_score ?? null,
        grade:    s.scores?.grade ?? null,
        position: s.scores?.position ?? null,
        saving:   false,
        error:    null,
      }
    ]))
  )
  const [submitting, setSubmitting] = React.useState(false)
  const [submitResult, setSubmitResult] = React.useState<string | null>(null)

  const isLocked = submissionStatus === "SUBMITTED" || submissionStatus === "LOCKED"

  const handleSaveWeights = async () => {
    const sum = weights.cwMax + weights.hwMax + weights.ctMax + weights.exMax
    if (sum !== 100) {
      setWeightErr(`Total weight must equal 100. Current total: ${sum}`)
      return
    }
    setSavingWeights(true)
    setWeightErr(null)
    const res = await updateScoresheetConfigWeights({
      termId,
      classwork_max: weights.cwMax,
      homework_max: weights.hwMax,
      classtest_max: weights.ctMax,
      exam_max: weights.exMax,
    })
    setSavingWeights(false)
    if (res.success) {
      setShowDial(false)
      router.refresh()
    } else {
      setWeightErr(res.error || "Failed to save weights")
    }
  }

  // Live order of merit: rank students by their current total (or live sum)
  const rankMap = React.useMemo(() => {
    const totals = students.map(s => {
      const sc = scores[s.id]
      const live = computeLiveTotal(
        sc.classwork_score, sc.homework_score, sc.classtest_score, sc.exam_score,
        weights.cwMax, weights.hwMax, weights.ctMax, weights.exMax
      )
      return { id: s.id, total: live.total ?? sc.total ?? null }
    }).filter(x => x.total !== null) as { id: string; total: number }[]

    totals.sort((a, b) => b.total - a.total)

    const map = new Map<string, number>()
    let rank = 1
    for (let i = 0; i < totals.length; i++) {
      if (i > 0 && totals[i].total !== totals[i - 1].total) rank = i + 1
      map.set(totals[i].id, rank)
    }
    return map
  }, [scores, students, weights])

  const handleChange = (studentId: string, field: keyof StudentScoreState, value: string) => {
    if (isLocked) return
    setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value, error: null } }))
  }

  const handleBlur = async (studentId: string) => {
    if (isLocked) return
    const s = scores[studentId]

    // Validate live
    const { error: liveErr } = computeLiveTotal(
      s.classwork_score, s.homework_score, s.classtest_score, s.exam_score,
      weights.cwMax, weights.hwMax, weights.ctMax, weights.exMax
    )
    if (liveErr) {
      setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], error: liveErr } }))
      return
    }

    const parse = (v: string) => v === "" ? null : parseFloat(v)
    const cw = parse(s.classwork_score)
    const hw = parse(s.homework_score)
    const ct = parse(s.classtest_score)
    const ex = parse(s.exam_score)

    // Only save if at least one field is non-null
    if (cw === null && hw === null && ct === null && ex === null) return

    setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], saving: true, error: null } }))

    const res = await saveScore({
      student_id: studentId,
      subject_id: subjectId,
      term_id: termId,
      classwork_score: cw,
      homework_score: hw,
      classtest_score: ct,
      exam_score: ex,
    })

    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        saving: false,
        total:    res.success ? res.total_score : prev[studentId].total,
        grade:    res.success ? res.grade : prev[studentId].grade,
        position: res.success ? ((res as any).position ?? prev[studentId].position) : prev[studentId].position,
        error:    res.success ? null : res.error,
      }
    }))
  }

  const enteredCount = students.filter(s => {
    const sc = scores[s.id]
    return sc.classwork_score !== "" || sc.homework_score !== "" ||
           sc.classtest_score !== "" || sc.exam_score !== ""
  }).length

  const handleSubmit = async () => {
    setSubmitting(true)
    const res = await submitScoresheet(subjectId, classId, termId)
    setSubmitting(false)
    setSubmitResult(res.success
      ? `✓ Scoresheet submitted. ${res.positions_updated} positions finalised.`
      : res.error)
  }

  const scoreColor = (total: number | null) => {
    if (total === null) return "text-gray-400"
    if (total >= 80) return "text-emerald-600"
    if (total >= 65) return "text-blue-600"
    if (total >= 50) return "text-amber-600"
    return "text-red-600"
  }

  const totalScheme = weights.cwMax + weights.hwMax + weights.ctMax + weights.exMax

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <p className="text-sm font-medium text-text">{className} · {subjectName} · {termName}</p>
          <p className="text-xs text-text-muted mt-0.5">
            Progress: <strong>{enteredCount} / {students.length}</strong> students entered
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            Weights: Classwork <strong>{weights.cwMax}</strong> · Homework <strong>{weights.hwMax}</strong> · Class Test <strong>{weights.ctMax}</strong> · Exam <strong>{weights.exMax}</strong> = <strong>{totalScheme}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isLocked && (
            <Button variant="secondary" onClick={() => setShowDial(!showDial)} className="text-xs flex items-center gap-1.5">
              <span>⚙️</span>
              <span>{showDial ? "Close Weight Config" : "Adjust Weights"}</span>
            </Button>
          )}
          {!isLocked && (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Scoresheet"}
            </Button>
          )}
          {isLocked && <span className="text-sm font-semibold text-warning">🔒 {submissionStatus}</span>}
        </div>
      </div>

      {/* Teacher Weight Adjustment Dial Box */}
      {showDial && !isLocked && (
        <div className="mb-5 bg-slate-900 text-white rounded-xl p-5 shadow-lg border border-slate-700 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <span>⚙️</span> Customize Component Max Weights for This Scoresheet
            </h3>
            <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${totalScheme === 100 ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
              Total: {totalScheme} / 100
            </span>
          </div>
          <p className="text-xs text-slate-300 mb-4">
            Adjust the maximum score allocated for each component. The 4 sections must sum to exactly 100.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {[
              { label: "Classwork Max", key: "cwMax" as const },
              { label: "Homework Max", key: "hwMax" as const },
              { label: "Class Test Max", key: "ctMax" as const },
              { label: "Exam Max", key: "exMax" as const },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-slate-300 block mb-1">{label}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weights[key]}
                  onChange={e => setWeights(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                  className="w-full h-[38px] rounded-md bg-slate-800 border border-slate-600 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            ))}
          </div>

          {weightErr && <p className="text-xs text-red-400 font-semibold mb-3">{weightErr}</p>}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDial(false)} className="text-xs h-[36px]">
              Cancel
            </Button>
            <Button onClick={handleSaveWeights} disabled={savingWeights} className="text-xs h-[36px] bg-primary text-white">
              {savingWeights ? "Saving Weights..." : "Apply New Weights"}
            </Button>
          </div>
        </div>
      )}

      {submitResult && (
        <div className="mb-4 p-3 rounded-md bg-background border border-border text-sm text-text">{submitResult}</div>
      )}

      {/* Order of Merit Summary Banner */}
      {rankMap.size > 0 && (
        <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-2">📊 Live Order of Merit</p>
          <div className="flex flex-wrap gap-2">
            {students
              .filter(s => rankMap.has(s.id))
              .sort((a, b) => (rankMap.get(a.id) ?? 99) - (rankMap.get(b.id) ?? 99))
              .slice(0, 10)
              .map(s => (
                <span key={s.id} className="text-xs bg-white border border-indigo-200 rounded px-2 py-1 font-medium">
                  #{rankMap.get(s.id)} {s.surname} {s.first_name}
                </span>
              ))}
            {rankMap.size > 10 && <span className="text-xs text-indigo-500">+{rankMap.size - 10} more…</span>}
          </div>
        </div>
      )}

      {/* Score entry cards */}
      <div className="space-y-3">
        {students.map((student, idx) => {
          const s = scores[student.id]
          const liveCalc = computeLiveTotal(
            s.classwork_score, s.homework_score, s.classtest_score, s.exam_score,
            weights.cwMax, weights.hwMax, weights.ctMax, weights.exMax
          )
          const displayTotal = liveCalc.total ?? s.total
          const livePosition = rankMap.get(student.id)

          return (
            <div key={student.id} className="bg-surface border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-semibold text-text">
                  {idx + 1}. {student.surname} {student.first_name}
                </p>
                <div className="flex items-center gap-2">
                  {livePosition && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                      #{livePosition}
                    </span>
                  )}
                  {s.grade && (
                    <span className="text-xs bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-full">
                      {s.grade}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Classwork", field: "classwork_score" as const, max: weights.cwMax },
                  { label: "Homework",  field: "homework_score" as const,  max: weights.hwMax  },
                  { label: "Class Test",field: "classtest_score" as const, max: weights.ctMax },
                  { label: "Exam",      field: "exam_score" as const,      max: weights.exMax  },
                ].map(({ label, field, max }) => (
                  <div key={field}>
                    <label className="text-xs text-text-muted block mb-1">
                      {label} <span className="text-xs font-bold text-primary">/ {max}</span>
                    </label>
                    <input
                      disabled={isLocked}
                      type="number"
                      min={0}
                      max={max}
                      step={0.5}
                      value={s[field]}
                      onChange={e => handleChange(student.id, field, e.target.value)}
                      onBlur={() => handleBlur(student.id)}
                      className="w-full h-[40px] rounded-md border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-background"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm">
                  Total:{" "}
                  <span className={`font-bold text-base ${scoreColor(displayTotal)}`}>
                    {displayTotal !== null ? displayTotal : "—"}
                    {displayTotal !== null && <span className="text-xs font-normal text-text-muted"> / 100</span>}
                  </span>
                </div>
                <div className="text-xs">
                  {s.saving && <span className="text-text-muted">Saving…</span>}
                  {liveCalc.error && <span className="text-danger">{liveCalc.error}</span>}
                  {s.error && !liveCalc.error && <span className="text-danger">{s.error}</span>}
                  {!s.saving && !s.error && !liveCalc.error && displayTotal !== null && (
                    <span className="text-success">✓ Saved</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
