"use client"
import * as React from "react"
import { Button } from "@/components/ui/Button"
import { saveScore, submitScoresheet, updateScoresheetConfigWeights } from "@/lib/actions/scores"
import { calculateFinalGrade, RAW_MAX_SCORES, validateWeights, AssessmentWeights, DEFAULT_WEIGHTS } from "@/lib/scoring/weighted"
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
  hwWeight?: number
  cwWeight?: number
  ctWeight?: number
  examWeight?: number
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

export function ScoreEntryList({
  students,
  subjectId,
  classId,
  termId,
  hwWeight: initHwWeight = DEFAULT_WEIGHTS.hwWeight,
  cwWeight: initCwWeight = DEFAULT_WEIGHTS.cwWeight,
  ctWeight: initCtWeight = DEFAULT_WEIGHTS.ctWeight,
  examWeight: initExamWeight = DEFAULT_WEIGHTS.examWeight,
  submissionStatus,
  subjectName,
  className,
  termName,
}: ScoreEntryListProps) {
  const router = useRouter()

  const [weights, setWeights] = React.useState<AssessmentWeights>({
    hwWeight: initHwWeight,
    cwWeight: initCwWeight,
    ctWeight: initCtWeight,
    examWeight: initExamWeight,
  })

  const [showAdjuster, setShowAdjuster] = React.useState(false)
  const [savingWeights, setSavingWeights] = React.useState(false)
  const [weightErr, setWeightErr] = React.useState<string | null>(null)

  const [scores, setScores] = React.useState<Record<string, StudentScoreState>>(
    () => Object.fromEntries(students.map(s => [
      s.id,
      {
        classwork_score: s.scores?.classwork_score !== null && s.scores?.classwork_score !== undefined ? String(s.scores.classwork_score) : "",
        homework_score:  s.scores?.homework_score !== null && s.scores?.homework_score !== undefined ? String(s.scores.homework_score) : "",
        classtest_score: s.scores?.classtest_score !== null && s.scores?.classtest_score !== undefined ? String(s.scores.classtest_score) : "",
        exam_score:      s.scores?.exam_score !== null && s.scores?.exam_score !== undefined ? String(s.scores.exam_score) : "",
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

  const isLocked = submissionStatus === "LOCKED"

  const totalWeightPercent = (weights.hwWeight || 0) + (weights.cwWeight || 0) + (weights.ctWeight || 0) + (weights.examWeight || 0)
  const isWeightValid = totalWeightPercent === 100

  const handleSaveWeights = async () => {
    const val = validateWeights(weights)
    if (!val.valid) {
      setWeightErr(val.error || "Weights must sum to exactly 100%")
      return
    }

    setSavingWeights(true)
    setWeightErr(null)
    const res = await updateScoresheetConfigWeights({
      termId,
      hwWeight: weights.hwWeight,
      cwWeight: weights.cwWeight,
      ctWeight: weights.ctWeight,
      examWeight: weights.examWeight,
    })
    setSavingWeights(false)
    if (res.success) {
      setShowAdjuster(false)
      router.refresh()
    } else {
      setWeightErr(res.error || "Failed to save weights")
    }
  }

  // Live order of merit: rank students by live calculated total
  const rankMap = React.useMemo(() => {
    const totals = students.map(s => {
      const sc = scores[s.id]
      const calc = calculateFinalGrade(
        {
          homework_score: sc.homework_score ? Number(sc.homework_score) : null,
          classwork_score: sc.classwork_score ? Number(sc.classwork_score) : null,
          classtest_score: sc.classtest_score ? Number(sc.classtest_score) : null,
          exam_score: sc.exam_score ? Number(sc.exam_score) : null,
        },
        weights
      )
      return { id: s.id, total: calc.totalScore ?? sc.total ?? null }
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

    const parseVal = (v: string, max: number, label: string) => {
      if (v === "" || v === undefined) return { num: null, err: null }
      const n = parseFloat(v)
      if (isNaN(n)) return { num: null, err: `${label} must be a valid number` }
      if (n < 0) return { num: null, err: `${label} cannot be negative` }
      if (n > max) return { num: null, err: `${label} cannot exceed ${max}` }
      return { num: n, err: null }
    }

    const cw = parseVal(s.classwork_score, RAW_MAX_SCORES.classwork, "Classwork")
    const hw = parseVal(s.homework_score, RAW_MAX_SCORES.homework, "Homework")
    const ct = parseVal(s.classtest_score, RAW_MAX_SCORES.classtest, "Class Test")
    const ex = parseVal(s.exam_score, RAW_MAX_SCORES.exam, "Exam")

    const firstErr = cw.err || hw.err || ct.err || ex.err
    if (firstErr) {
      setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], error: firstErr } }))
      return
    }

    // Only save if at least one field is provided
    if (cw.num === null && hw.num === null && ct.num === null && ex.num === null) return

    setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], saving: true, error: null } }))

    const res = await saveScore({
      student_id: studentId,
      subject_id: subjectId,
      term_id: termId,
      classwork_score: cw.num,
      homework_score: hw.num,
      classtest_score: ct.num,
      exam_score: ex.num,
    })

    setScores(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        saving: false,
        total: res.success ? res.total_score : prev[studentId].total,
        grade: res.success ? res.grade : prev[studentId].grade,
        error: res.success ? null : res.error,
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
    setSubmitResult(null)
    const res = await submitScoresheet(subjectId, classId, termId)
    setSubmitting(false)
    if (res.success) {
      setSubmitResult(`✓ Scoresheet submitted successfully. ${res.positions_updated} student positions calculated.`)
      router.refresh()
    } else {
      setSubmitResult(`Error: ${res.error}`)
    }
  }

  const scoreColor = (total: number | null) => {
    if (total === null) return "text-gray-400"
    if (total >= 80) return "text-emerald-600 font-bold"
    if (total >= 65) return "text-blue-600 font-bold"
    if (total >= 50) return "text-amber-600 font-bold"
    return "text-red-600 font-bold"
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-border rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded">
              {className}
            </span>
            <span className="text-xs font-semibold text-text-muted">{termName}</span>
          </div>
          <h2 className="text-xl font-bold text-text mt-1">{subjectName} Scoresheet</h2>
          <p className="text-xs text-text-muted mt-1">
            Progress: <strong>{enteredCount} / {students.length}</strong> students scored · Continuous Assessment ({weights.hwWeight + weights.cwWeight + weights.ctWeight}%) + Exam ({weights.examWeight}%)
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {!isLocked && (
            <Button
              variant="secondary"
              onClick={() => setShowAdjuster(!showAdjuster)}
              className="text-xs flex items-center gap-1.5"
            >
              <span>⚙️</span>
              <span>{showAdjuster ? "Close Weight Adjuster" : "Adjust Weights"}</span>
            </Button>
          )}

          {!isLocked && (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
            >
              {submitting ? "Submitting..." : "Submit Scoresheet"}
            </Button>
          )}

          {isLocked && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
              🔒 Submitted &amp; Locked
            </span>
          )}
        </div>
      </div>

      {/* Weighted Grading Adjuster Component */}
      {showAdjuster && !isLocked && (
        <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xl border border-slate-700 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2 text-white">
                <span>⚙️</span> Weighted Grading Adjuster
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Configure weight percentages for the 4 assessment sections. Raw scores are normalized automatically.
              </p>
            </div>

            {/* Strict 100% Real-Time Indicator */}
            <div className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border ${
              isWeightValid
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-red-500/20 text-red-300 border-red-500/40"
            }`}>
              Total Weight: {totalWeightPercent}% / 100%
            </div>
          </div>

          {/* Grid of Weight Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
            <div className="bg-slate-800 p-3.5 rounded-lg border border-slate-700">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-200">Homework Weight</label>
                <span className="text-xs font-mono text-primary-light">Max Raw: {RAW_MAX_SCORES.homework}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weights.hwWeight}
                  onChange={e => setWeights(prev => ({ ...prev, hwWeight: parseInt(e.target.value) || 0 }))}
                  className="w-full h-[38px] rounded-md bg-slate-900 border border-slate-600 px-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm font-bold text-slate-400">%</span>
              </div>
            </div>

            <div className="bg-slate-800 p-3.5 rounded-lg border border-slate-700">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-200">Classwork Weight</label>
                <span className="text-xs font-mono text-primary-light">Max Raw: {RAW_MAX_SCORES.classwork}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weights.cwWeight}
                  onChange={e => setWeights(prev => ({ ...prev, cwWeight: parseInt(e.target.value) || 0 }))}
                  className="w-full h-[38px] rounded-md bg-slate-900 border border-slate-600 px-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm font-bold text-slate-400">%</span>
              </div>
            </div>

            <div className="bg-slate-800 p-3.5 rounded-lg border border-slate-700">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-200">Class Test Weight</label>
                <span className="text-xs font-mono text-primary-light">Max Raw: {RAW_MAX_SCORES.classtest}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weights.ctWeight}
                  onChange={e => setWeights(prev => ({ ...prev, ctWeight: parseInt(e.target.value) || 0 }))}
                  className="w-full h-[38px] rounded-md bg-slate-900 border border-slate-600 px-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm font-bold text-slate-400">%</span>
              </div>
            </div>

            <div className="bg-slate-800 p-3.5 rounded-lg border border-slate-700">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-200">Exams Weight</label>
                <span className="text-xs font-mono text-primary-light">Max Raw: {RAW_MAX_SCORES.exam}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={weights.examWeight}
                  onChange={e => setWeights(prev => ({ ...prev, examWeight: parseInt(e.target.value) || 0 }))}
                  className="w-full h-[38px] rounded-md bg-slate-900 border border-slate-600 px-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm font-bold text-slate-400">%</span>
              </div>
            </div>
          </div>

          {!isWeightValid && (
            <p className="text-xs text-red-400 font-semibold mb-3">
              ⚠️ The 4 category weights must sum to exactly 100%. (Currently {totalWeightPercent}% - difference of {100 - totalWeightPercent > 0 ? `+${100 - totalWeightPercent}% needed` : `${totalWeightPercent - 100}% over`})
            </p>
          )}

          {weightErr && <p className="text-xs text-red-400 font-semibold mb-3">{weightErr}</p>}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setShowAdjuster(false)} className="text-xs h-[36px]">
              Cancel
            </Button>
            <Button
              onClick={handleSaveWeights}
              disabled={savingWeights || !isWeightValid}
              className="text-xs h-[36px] bg-primary text-white font-bold disabled:opacity-50"
            >
              {savingWeights ? "Saving Weights..." : "Apply & Save Weights (100%)"}
            </Button>
          </div>
        </div>
      )}

      {submitResult && (
        <div className={`p-4 rounded-xl text-sm font-medium border ${
          submitResult.startsWith("✓")
            ? "bg-emerald-50 text-emerald-900 border-emerald-200"
            : "bg-red-50 text-red-900 border-red-200"
        }`}>
          {submitResult}
        </div>
      )}

      {/* Live Order of Merit Summary Banner */}
      {rankMap.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-2">📊 Live Ranking Order of Merit</p>
          <div className="flex flex-wrap gap-2">
            {students
              .filter(s => rankMap.has(s.id))
              .sort((a, b) => (rankMap.get(a.id) ?? 99) - (rankMap.get(b.id) ?? 99))
              .slice(0, 10)
              .map(s => (
                <span key={s.id} className="text-xs bg-white border border-indigo-200 rounded-md px-2.5 py-1 font-semibold text-slate-800 shadow-2xs">
                  #{rankMap.get(s.id)} {s.surname} {s.first_name}
                </span>
              ))}
            {rankMap.size > 10 && <span className="text-xs text-indigo-500 self-center">+{rankMap.size - 10} more…</span>}
          </div>
        </div>
      )}

      {/* Score Entry Cards */}
      <div className="space-y-4">
        {students.map((student, idx) => {
          const s = scores[student.id]
          const calc = calculateFinalGrade(
            {
              homework_score: s.homework_score ? Number(s.homework_score) : null,
              classwork_score: s.classwork_score ? Number(s.classwork_score) : null,
              classtest_score: s.classtest_score ? Number(s.classtest_score) : null,
              exam_score: s.exam_score ? Number(s.exam_score) : null,
            },
            weights
          )
          const displayTotal = calc.totalScore ?? s.total
          const livePosition = rankMap.get(student.id)

          return (
            <div key={student.id} className="bg-white border border-border rounded-xl p-4 shadow-sm hover:border-slate-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {idx + 1}. {student.surname} {student.first_name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {livePosition && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full">
                      Rank #{livePosition}
                    </span>
                  )}
                  {s.grade && (
                    <span className="text-xs bg-slate-100 text-slate-800 font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
                      Grade: {s.grade}
                    </span>
                  )}
                </div>
              </div>

              {/* 4 Assessment Categories with Maximum Raw Values and Weighted Percentages */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">Homework</label>
                    <span className="text-[10px] font-bold text-slate-500">
                      /{RAW_MAX_SCORES.homework} ({weights.hwWeight}%)
                    </span>
                  </div>
                  <input
                    disabled={isLocked}
                    type="number"
                    min={0}
                    max={RAW_MAX_SCORES.homework}
                    step={0.5}
                    placeholder={`0-${RAW_MAX_SCORES.homework}`}
                    value={s.homework_score}
                    onChange={e => handleChange(student.id, "homework_score", e.target.value)}
                    onBlur={() => handleBlur(student.id)}
                    className="w-full h-[40px] rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100"
                  />
                  {calc.weighted.homework !== null && (
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Weighted: {calc.weighted.homework} pts
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">Classwork</label>
                    <span className="text-[10px] font-bold text-slate-500">
                      /{RAW_MAX_SCORES.classwork} ({weights.cwWeight}%)
                    </span>
                  </div>
                  <input
                    disabled={isLocked}
                    type="number"
                    min={0}
                    max={RAW_MAX_SCORES.classwork}
                    step={0.5}
                    placeholder={`0-${RAW_MAX_SCORES.classwork}`}
                    value={s.classwork_score}
                    onChange={e => handleChange(student.id, "classwork_score", e.target.value)}
                    onBlur={() => handleBlur(student.id)}
                    className="w-full h-[40px] rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100"
                  />
                  {calc.weighted.classwork !== null && (
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Weighted: {calc.weighted.classwork} pts
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">Class Test</label>
                    <span className="text-[10px] font-bold text-slate-500">
                      /{RAW_MAX_SCORES.classtest} ({weights.ctWeight}%)
                    </span>
                  </div>
                  <input
                    disabled={isLocked}
                    type="number"
                    min={0}
                    max={RAW_MAX_SCORES.classtest}
                    step={0.5}
                    placeholder={`0-${RAW_MAX_SCORES.classtest}`}
                    value={s.classtest_score}
                    onChange={e => handleChange(student.id, "classtest_score", e.target.value)}
                    onBlur={() => handleBlur(student.id)}
                    className="w-full h-[40px] rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100"
                  />
                  {calc.weighted.classtest !== null && (
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Weighted: {calc.weighted.classtest} pts
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">Exam</label>
                    <span className="text-[10px] font-bold text-slate-500">
                      /{RAW_MAX_SCORES.exam} ({weights.examWeight}%)
                    </span>
                  </div>
                  <input
                    disabled={isLocked}
                    type="number"
                    min={0}
                    max={RAW_MAX_SCORES.exam}
                    step={0.5}
                    placeholder={`0-${RAW_MAX_SCORES.exam}`}
                    value={s.exam_score}
                    onChange={e => handleChange(student.id, "exam_score", e.target.value)}
                    onBlur={() => handleBlur(student.id)}
                    className="w-full h-[40px] rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100"
                  />
                  {calc.weighted.exam !== null && (
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Weighted: {calc.weighted.exam} pts
                    </p>
                  )}
                </div>
              </div>

              {/* Status and Total */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4 text-xs">
                  {calc.classScore !== null && (
                    <span className="text-slate-600">
                      Class Score: <strong className="text-slate-900">{calc.classScore}</strong> / {weights.hwWeight + weights.cwWeight + weights.ctWeight}
                    </span>
                  )}
                  {calc.examScore !== null && (
                    <span className="text-slate-600">
                      Exam: <strong className="text-slate-900">{calc.examScore}</strong> / {weights.examWeight}
                    </span>
                  )}
                  <span className="text-sm">
                    Final Score:{" "}
                    <span className={`text-base ${scoreColor(displayTotal)}`}>
                      {displayTotal !== null ? displayTotal : "—"}
                    </span>
                    {displayTotal !== null && <span className="text-xs font-normal text-slate-500"> / 100</span>}
                  </span>
                </div>

                <div className="text-xs">
                  {s.saving && <span className="text-slate-500">Saving…</span>}
                  {s.error && <span className="text-red-600 font-semibold">{s.error}</span>}
                  {!s.saving && !s.error && displayTotal !== null && (
                    <span className="text-emerald-600 font-medium">✓ Saved</span>
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
