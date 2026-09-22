"use client"

import React, { useState } from "react"
import { saveStudentAttendance, getAttendanceForDate } from "@/lib/actions/attendance"
import { Button } from "@/components/ui/Button"

interface Student {
  id: string
  student_id_code: string
  surname: string
  first_name: string
  gender?: string
  days_present?: number
  total_days?: number
}

interface Props {
  students: Student[]
  classId: string
  termId: string
  initialAttendanceMap: Record<string, "Present" | "Absent">
}

export function DailyAttendanceTracker({ students, classId, termId, initialAttendanceMap }: Props) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0])
  const [attMap, setAttMap] = useState<Record<string, "Present" | "Absent">>(initialAttendanceMap)
  const [loading, setLoading] = useState(false)
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleDateChange = async (newDate: string) => {
    setSelectedDate(newDate)
    setLoading(true)
    try {
      const freshMap = await getAttendanceForDate(classId, newDate)
      const converted: Record<string, "Present" | "Absent"> = {}
      freshMap.forEach((status, id) => {
        converted[id] = status
      })
      setAttMap(converted)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const toggleAttendance = async (studentId: string) => {
    const current = attMap[studentId] ?? "Absent"
    const nextStatus = current === "Present" ? "Absent" : "Present"

    setSavingStudentId(studentId)
    setAttMap(prev => ({ ...prev, [studentId]: nextStatus }))

    const res = await saveStudentAttendance({
      student_id: studentId,
      class_id: classId,
      term_id: termId,
      date: selectedDate,
      status: nextStatus,
    })

    setSavingStudentId(null)
    if (!res.success) {
      setMessage(`Error: ${res.error}`)
      // Revert state on failure
      setAttMap(prev => ({ ...prev, [studentId]: current }))
    } else {
      setMessage(null)
    }
  }

  const markAllPresent = async () => {
    setLoading(true)
    let errCount = 0
    const newMap = { ...attMap }

    for (const student of students) {
      newMap[student.id] = "Present"
      const res = await saveStudentAttendance({
        student_id: student.id,
        class_id: classId,
        term_id: termId,
        date: selectedDate,
        status: "Present",
      })
      if (!res.success) errCount++
    }

    setAttMap(newMap)
    setLoading(false)
    setMessage(errCount === 0 ? "✓ All students marked Present for " + selectedDate : `Completed with ${errCount} errors.`)
  }

  const presentCount = students.filter(s => attMap[s.id] === "Present").length

  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-text">Daily Attendance &amp; Feeding Tracker</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Marking students present automatically registers daily feeding fee attendance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-text-muted">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => handleDateChange(e.target.value)}
              className="h-[38px] px-3 rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
          </div>

          <Button onClick={markAllPresent} disabled={loading} variant="secondary" className="text-xs h-[38px]">
            {loading ? "Processing..." : "Mark All Present"}
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
          {message}
        </div>
      )}

      <div className="flex items-center justify-between text-xs font-semibold text-text-muted bg-slate-50 p-3 rounded-lg border border-border">
        <span>Attendance for {selectedDate}</span>
        <span className="text-primary font-bold">{presentCount} / {students.length} Present</span>
      </div>

      <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
        {students.map((s, idx) => {
          const status = attMap[s.id] ?? "Absent"
          const isPresent = status === "Present"
          const isSaving = savingStudentId === s.id

          return (
            <div key={s.id} className={`p-3.5 flex items-center justify-between gap-3 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"} hover:bg-slate-100/50 transition-colors`}>
              <div>
                <span className="text-sm font-semibold text-text">{s.surname}, {s.first_name}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-text-muted">{s.student_id_code}</span>
                  {s.days_present !== undefined && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      · Cumulative: <strong>{s.days_present}</strong> days
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleAttendance(s.id)}
                disabled={isSaving || loading}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                  isPresent
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                <span>{isPresent ? "✓ Present" : "✗ Absent"}</span>
                {isSaving && <span className="animate-spin text-[10px]">⏳</span>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
