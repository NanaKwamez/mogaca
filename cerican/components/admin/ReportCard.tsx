"use client"

import React, { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export interface SubjectScoreItem {
  subject_id: string
  subject_name: string
  is_core?: boolean
  classwork_score?: number | null
  homework_score?: number | null
  classtest_score?: number | null
  class_score?: number | null // Out of 50% — stored in DB as cw+hw+ct combined
  exam_score?: number | null  // Out of 50%
  total_score?: number | null // Out of 100%
  grade?: string | null
  position?: number | null | string
}

export interface StudentReportData {
  schoolName?: string
  motto?: string
  address?: string
  officialNumbers?: string
  student: {
    id: string
    student_id_code: string
    surname: string
    first_name: string
    gender?: string
    photo_url?: string | null
  }
  className: string
  termName: string
  termNumber?: number | string
  academicYearLabel?: string
  vacationDate?: string
  reopeningDate?: string
  subjects: SubjectScoreItem[]
  totalAggregate: number | string
  rawScore?: number | string
  overallAverage: number
  classAverageScore?: number | string
  classRank: number | string
  totalStudentsInClass: number
  attendancePresent: number | string
  attendanceTotal: number | string
  promotedTo?: string
  conduct?: string
  interest?: string
  teacherRemark?: string
  headmasterRemark?: string
}

export function ReportCard({ data }: { data: StudentReportData }) {
  const {
    schoolName = "MORNING GLORY ACADEMY",
    motto = "GOD IS OUR LIGHT",
    address = "(SCC MEKOBE LANE)",
    officialNumbers = "0555551700 / 0244894340",
    student,
    className,
    termNumber = "1",
    academicYearLabel = "2026/2027",
    vacationDate = "Friday, 19th of December 2025.",
    reopeningDate = "Tuesday, 6th of January 2026.",
    subjects,
    totalAggregate,
    rawScore,
    classAverageScore,
    classRank,
    totalStudentsInClass,
    attendancePresent,
    attendanceTotal,
    promotedTo,
    conduct = "SATISFACTORY",
    interest = "NUMERACY & SCIENCE",
    teacherRemark = "REMARKABLE. KEEP IT UP",
    headmasterRemark = "COMMENDABLE PERFORMANCE",
  } = data

  const [photoUrl, setPhotoUrl] = useState<string | null>(student?.photo_url || null)
  const [uploading, setUploading] = useState(false)

  // Compute column totals using DB values
  // class_score from DB = cw + hw + ct combined (saved by teacher scoresheet).
  // Only fall back to summing individual parts if DB class_score is missing.
  let totalClassScoreSum = 0
  let totalExamScoreSum = 0
  let totalTotalScoreSum = 0

  subjects.forEach((sub) => {
    // Prefer DB class_score; only reconstruct from parts as last resort
    const cs = sub.class_score != null
      ? Number(sub.class_score)
      : (sub.classwork_score ?? 0) + (sub.homework_score ?? 0) + (sub.classtest_score ?? 0)
    const ex = sub.exam_score != null ? Number(sub.exam_score) : 0
    // Prefer DB total_score
    const tot = sub.total_score != null ? Number(sub.total_score) : (cs + ex)

    totalClassScoreSum += cs
    totalExamScoreSum += ex
    totalTotalScoreSum += tot
  })

  const computedRawScore = rawScore !== "—" ? rawScore : (totalTotalScoreSum > 0 ? totalTotalScoreSum : "—")
  const nextClass = getPromotedToText(className, termNumber, promotedTo)
  const department = getDepartment(className)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !student?.id) return

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file)
    setPhotoUrl(previewUrl)
    setUploading(true)

    try {
      const supabase = createClient()
      const ext = file.name.split(".").pop() || "jpg"
      const filePath = `${student.id}/${Date.now()}.${ext}`

      const { error: storageError } = await supabase.storage
        .from("student-photos")
        .upload(filePath, file, { upsert: true })

      if (storageError) {
        // Fallback: convert to base64 Data URL and save directly to students.photo_url and photo_url_new
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64data = reader.result as string
          setPhotoUrl(base64data)
          await supabase.from("students").update({ photo_url: base64data, photo_url_new: base64data }).eq("id", student.id)
        }
        reader.readAsDataURL(file)
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from("student-photos")
          .getPublicUrl(filePath)
        setPhotoUrl(publicUrl)
        await supabase.from("students").update({ photo_url: publicUrl, photo_url_new: publicUrl }).eq("id", student.id)
      }
    } catch (err) {
      console.error("Failed to upload student photo:", err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-[210mm] max-w-[210mm] min-h-[297mm] mx-auto bg-white p-6 shadow-xl border-2 border-slate-900 text-slate-900 text-xs font-sans print:shadow-none print:border-2 print:border-slate-900 print:p-3 print:m-0 print:w-full print:max-w-full print:min-h-0 break-after-page break-inside-avoid box-border flex flex-col justify-between">
      <div>
        {/* 1. Header Section */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5 mb-2.5">
          {/* Left: Official Gold Crest Logo */}
          <div className="w-44 h-44 flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/moggaca-logo.png"
              alt="Morning Glory Academy Logo"
              className="w-44 h-44 object-contain"
            />
          </div>

          {/* Center: School Details */}
          <div className="text-center flex-1 px-4">
            <h1 className="text-2xl font-black tracking-wide uppercase text-slate-900 leading-tight">{schoolName}</h1>
            <p className="text-xs font-bold uppercase text-slate-800 tracking-wider mt-0.5">MOTTO: {motto}</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">{address}</p>
            <p className="text-xs font-semibold text-slate-700">Official Numbers: {officialNumbers}</p>
          </div>

          {/* Right: Student Photo / Interactive Uploader */}
          <label
            className="w-24 h-28 border-2 border-slate-900 flex flex-col items-center justify-center text-center p-0.5 bg-slate-50 shrink-0 relative overflow-hidden cursor-pointer hover:bg-slate-100 transition-colors group"
            title="Click to add or change student photo"
          >
            {photoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt={`${student?.first_name} ${student?.surname}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity print:hidden">
                  <span className="text-[9px] font-bold text-white uppercase text-center px-1">Change Photo</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-1 text-slate-400 group-hover:text-slate-700">
                <svg className="w-6 h-6 mb-1 text-slate-400 print:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-[9px] font-bold uppercase leading-snug print:text-slate-400">
                  {uploading ? "Saving…" : "Add Photo"}
                </span>
                <span className="text-[8px] text-slate-400 print:hidden mt-0.5">Click/Tap</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={handlePhotoUpload}
            />
          </label>
        </div>

        {/* 2. Document Title */}
        <div className="text-center mb-2.5">
          <h2 className="inline-block border-2 border-slate-900 px-8 py-1 font-black text-sm uppercase tracking-widest bg-slate-100">
            TERMINAL REPORT SHEET
          </h2>
        </div>

        {/* 3. Student Profile Metadata Table */}
        <div className="border-2 border-slate-900 mb-2.5">
          <div className="grid grid-cols-2 divide-x-2 divide-slate-900 border-b-2 border-slate-900">
            <div className="p-1.5 font-bold uppercase text-xs">
              NAME: <span className="font-extrabold text-sm ml-1 text-slate-900">{(student?.surname ?? "").toUpperCase()} {(student?.first_name ?? "").toUpperCase()}</span>
            </div>
            <div className="p-1.5 font-bold uppercase text-xs">
              ACADEMIC TERM: <span className="font-extrabold text-sm ml-1 text-slate-900">{termNumber}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x-2 divide-slate-900 border-b-2 border-slate-900">
            <div className="p-1.5 font-bold uppercase text-xs">
              ID: <span className="font-mono font-bold text-sm ml-1 text-slate-900">{student?.student_id_code || "MOGASCO01/03/25/1169"}</span>
            </div>
            <div className="p-1.5 font-bold uppercase text-xs">
              ACADEMIC YEAR: <span className="font-bold text-sm ml-1 text-slate-900">{academicYearLabel}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x-2 divide-slate-900 border-b-2 border-slate-900">
            <div className="p-1.5 font-bold uppercase text-xs">
              LEVEL: <span className="font-bold text-sm ml-1 text-slate-900">{className.toUpperCase()}</span>
            </div>
            <div className="p-1.5 font-bold uppercase text-xs">
              NUMBER ON ROLL: <span className="font-mono font-bold text-sm ml-1 text-slate-900">{totalStudentsInClass}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x-2 divide-slate-900">
            <div className="p-1.5 font-bold uppercase text-xs">
              VACATION DATE: <span className="font-medium text-xs ml-1 text-slate-800">{vacationDate}</span>
            </div>
            <div className="p-1.5 font-bold uppercase text-xs">
              REOPENING DATE: <span className="font-medium text-xs ml-1 text-slate-800">{reopeningDate}</span>
            </div>
          </div>
        </div>

        {/* 4. Aggregate & Summary Table */}
        <div className="border-2 border-slate-900 mb-2.5">
          <div className="grid grid-cols-2 divide-x-2 divide-slate-900 border-b-2 border-slate-900">
            <div className="p-1.5 font-bold uppercase text-xs">
              AGGREGATE: <span className="font-mono font-extrabold text-sm ml-1 text-slate-900">{String(totalAggregate).padStart(2, "0")}</span>
            </div>
            <div className="p-1.5 font-bold uppercase text-xs">
              RAW SCORE: <span className="font-mono font-extrabold text-sm ml-1 text-slate-900">{computedRawScore}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x-2 divide-slate-900 border-b-2 border-slate-900">
            <div className="p-1.5 font-bold uppercase text-xs">
              POSITION IN CLASS: <span className="font-mono font-extrabold text-sm text-indigo-900 ml-1">{typeof classRank === 'number' ? `${classRank}${getOrdinalSuffix(classRank)}` : classRank}</span>
            </div>
            <div className="p-1.5 font-bold uppercase text-xs">
              CLASS AVERAGE SCORE: <span className="font-mono font-bold text-sm ml-1 text-slate-900">{classAverageScore ?? Math.round(totalTotalScoreSum / (subjects.length || 1))}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x-2 divide-slate-900">
            <div className="p-1.5 font-bold uppercase text-xs">
              DEPARTMENT: <span className="font-bold text-sm ml-1 text-slate-900">{department}</span>
            </div>
            <div className="p-1.5 font-bold uppercase bg-slate-50">
              {/* Omitted web link per user request */}
            </div>
          </div>
        </div>

        {/* 5. Subject Scores Table */}
        <div className="border-2 border-slate-900 mb-2.5">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 font-black text-center uppercase text-xs">
                <th className="py-1 px-3 text-left border-r-2 border-slate-900 w-1/3 text-xs">SUBJECT TITLE</th>
                <th className="py-1 px-2 border-r-2 border-slate-900 w-1/6 text-xs">CLASS SCORE<br/><span className="text-[10px] font-semibold">50%</span></th>
                <th className="py-1 px-2 border-r-2 border-slate-900 w-1/6 text-xs">EXAM SCORE<br/><span className="text-[10px] font-semibold">50%</span></th>
                <th className="py-1 px-2 border-r-2 border-slate-900 w-1/6 text-xs">TOTAL SCORE<br/><span className="text-[10px] font-semibold">100%</span></th>
                <th className="py-1 px-2 border-r-2 border-slate-900 w-12 text-xs">GRADE</th>
                <th className="py-1 px-2 w-16 text-xs">POSITION</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((sub, idx) => {
                // Use DB class_score directly — it's already the sum of cw+hw+ct saved by teacher
                const cs = sub.class_score != null ? Number(sub.class_score) :
                  ((sub.classwork_score ?? 0) + (sub.homework_score ?? 0) + (sub.classtest_score ?? 0))
                const ex = sub.exam_score != null ? Number(sub.exam_score) : 0
                const tot = sub.total_score != null ? Number(sub.total_score) : (cs > 0 || ex > 0 ? cs + ex : 0)
                const posStr = typeof sub.position === 'number' ? `${sub.position}${getOrdinalSuffix(sub.position)}` : (sub.position ?? "—")
                const hasScore = sub.total_score != null || sub.class_score != null || sub.exam_score != null

                return (
                  <tr key={sub.subject_id || idx} className="border-b border-slate-900">
                    <td className="py-1 px-3 font-bold uppercase border-r-2 border-slate-900 text-xs">{sub.subject_name}</td>
                    <td className="py-1 px-2 text-center font-mono font-semibold border-r-2 border-slate-900 text-xs">{hasScore && cs > 0 ? cs : "—"}</td>
                    <td className="py-1 px-2 text-center font-mono font-semibold border-r-2 border-slate-900 text-xs">{hasScore && ex > 0 ? ex : "—"}</td>
                    <td className="py-1 px-2 text-center font-mono font-bold border-r-2 border-slate-900 text-xs">{hasScore && tot > 0 ? tot : "—"}</td>
                    <td className="py-1 px-2 text-center font-bold border-r-2 border-slate-900 text-xs">{sub.grade ?? "—"}</td>
                    <td className="py-1 px-2 text-center font-bold text-indigo-900 text-xs">{posStr}</td>
                  </tr>
                )
              })}
              {/* TOTALS ROW */}
              <tr className="border-t-2 border-slate-900 bg-slate-100 font-black text-xs">
                <td className="py-1 px-3 uppercase border-r-2 border-slate-900 text-xs">TOTALS</td>
                <td className="py-1 px-2 text-center font-mono border-r-2 border-slate-900 text-xs">{totalClassScoreSum}</td>
                <td className="py-1 px-2 text-center font-mono border-r-2 border-slate-900 text-xs">{totalExamScoreSum}</td>
                <td className="py-1 px-2 text-center font-mono border-r-2 border-slate-900 text-xs">{totalTotalScoreSum}</td>
                <td className="py-1 px-2 border-r-2 border-slate-900"></td>
                <td className="py-1 px-2"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 6. Attendance, Conduct & Remarks Table */}
        <div className="border-2 border-slate-900 mb-3 space-y-0 text-xs">
          <div className="grid grid-cols-2 divide-x-2 divide-slate-900 border-b-2 border-slate-900">
            <div className="p-1.5 font-bold uppercase text-xs">
              ATTENDANCE: <span className="font-mono font-extrabold text-sm ml-1 text-slate-900">
                {attendanceTotal && attendanceTotal !== "—" && attendanceTotal !== 0
                  ? `${attendancePresent} OUT OF ${attendanceTotal}`
                  : (attendancePresent ? `${attendancePresent} DAYS` : "—")}
              </span>
            </div>
            <div className="p-1.5 font-bold uppercase text-xs">
              PROMOTED TO: <span className="font-extrabold text-sm ml-1 text-slate-900">{nextClass.toUpperCase()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x-2 divide-slate-900 border-b-2 border-slate-900">
            <div className="p-1.5 font-bold uppercase text-xs">
              CONDUCT: <span className="font-semibold text-xs ml-1 text-slate-800">{conduct}</span>
            </div>
            <div className="p-1.5 font-bold uppercase text-xs">
              INTEREST: <span className="font-semibold text-xs ml-1 text-slate-800">{interest}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x-2 divide-slate-900 border-b-2 border-slate-900">
            <div className="p-1.5 font-bold uppercase min-h-[32px] text-xs">
              CLASS TEACHER'S REMARKS: <span className="font-semibold text-xs text-slate-800 ml-1 block mt-0.5">{teacherRemark}</span>
            </div>
            <div className="p-1.5 font-bold uppercase min-h-[32px] text-xs">
              HEADTEACHER'S REMARKS: <span className="font-semibold text-xs text-slate-800 ml-1 block mt-0.5">{headmasterRemark}</span>
            </div>
          </div>

          <div className="p-1.5 font-bold uppercase flex justify-between items-center text-xs">
            <span>HEADTEACHER'S SIGNATURE: ___________________________</span>
          </div>
        </div>
      </div>

      {/* 7. Footer Notice */}
      <div className="text-[10px] text-slate-600 border-t border-slate-300 pt-1.5 text-center mt-auto">
        Software Powered By MOGGACA. For assistance and enquiries, kindly call or WhatsApp our Help Desk via 054-553-6530.
      </div>
    </div>
  )
}

function getDepartment(className: string): string {
  const c = className.toUpperCase()
  if (c.includes("NURSERY") || c.includes("KG") || c.includes("KINDERGARTEN")) return "PRESCHOOL"
  if (c.includes("JHS") || c.includes("BASIC 7") || c.includes("BASIC 8") || c.includes("BASIC 9") || c.includes("FORM")) return "J.H.S."
  return "PRIMARY"
}

function getPromotedToText(className: string, termNumber: string | number, promotedToOverride?: string): string {
  if (promotedToOverride) return promotedToOverride.toUpperCase()
  // User Rule: Only show promotion in Term 3. In Term 1 and 2, leave blank / N/A.
  const termStr = String(termNumber).trim()
  if (termStr !== "3") {
    return "—"
  }

  const c = className.trim().toUpperCase()
  // For Form 3 / JHS 3 / Basic 9, no class 10, write BECE
  if (c.includes("9") || c.includes("JHS 3") || c.includes("BASIC 9") || c.includes("FORM 3") || c.includes("CLASS 9")) {
    return "BECE"
  }
  if (c.includes("NURSERY 1")) return "NURSERY 2"
  if (c.includes("NURSERY 2")) return "KG 1"
  if (c.includes("KG 1") || c.includes("KG1")) return "KG 2"
  if (c.includes("KG 2") || c.includes("KG2")) return "BASIC 1"
  if (c.includes("BASIC 1") || c.includes("CLASS 1") || c.includes("PRIMARY 1")) return "BASIC 2"
  if (c.includes("BASIC 2") || c.includes("CLASS 2") || c.includes("PRIMARY 2")) return "BASIC 3"
  if (c.includes("BASIC 3") || c.includes("CLASS 3") || c.includes("PRIMARY 3")) return "BASIC 4"
  if (c.includes("BASIC 4") || c.includes("CLASS 4") || c.includes("PRIMARY 4")) return "BASIC 5"
  if (c.includes("BASIC 5") || c.includes("CLASS 5") || c.includes("PRIMARY 5")) return "BASIC 6"
  if (c.includes("BASIC 6") || c.includes("CLASS 6") || c.includes("PRIMARY 6")) return "BASIC 7 (JHS 1)"
  if (c.includes("BASIC 7") || c.includes("JHS 1")) return "BASIC 8 (JHS 2)"
  if (c.includes("BASIC 8") || c.includes("JHS 2")) return "BASIC 9 (JHS 3)"

  const match = c.match(/\d+/)
  if (match) {
    const num = parseInt(match[0], 10)
    if (num < 9) return `BASIC ${num + 1}`
    return "BECE"
  }
  return "PROMOTED"
}

function getOrdinalSuffix(i: number): string {
  const j = i % 10
  const k = i % 100
  if (j === 1 && k !== 11) return "ST"
  if (j === 2 && k !== 12) return "ND"
  if (j === 3 && k !== 13) return "RD"
  return "TH"
}
