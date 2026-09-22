import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { ReportCard, StudentReportData, SubjectScoreItem } from "@/components/admin/ReportCard"
import { PrintButton } from "@/components/ui/PrintButton"
import { generateScoreBasedRemarks } from "@/lib/remarks/scoreRemark"
import { getBulkAttendanceSummaries, getSectionFromClass } from "@/lib/attendance/service"
import Link from "next/link"

// ── Ghana grading → aggregate grade point ───────────────────────────────────
function gradeToPoint(grade: string | null | undefined): number {
  if (!grade) return 9 // worst possible = not graded
  switch (grade.trim().toUpperCase()) {
    case "1": return 1
    case "2": return 2
    case "3": return 3
    case "4": return 4
    case "5": return 5
    case "6": return 6
    case "7": return 7
    case "8": return 8
    case "9": return 9
    case "A1": return 1
    case "B2": return 2
    case "B3": return 3
    case "C4": return 4
    case "C5": return 5
    case "C6": return 6
    case "D7": return 7
    case "E8": return 8
    case "F9": return 9
    default: return 9
  }
}

/**
 * Compute Ghana aggregate for a student's subjects.
 * Rule: ALL core subjects + best 2 elective subjects (by grade point, lower = better).
 * Returns null if no scores exist yet.
 */
function computeAggregate(
  studentSubjects: SubjectScoreItem[],
  subjectList: { id: string; name: string; is_core: boolean }[]
): number | null {
  const corePoints: number[] = []
  const electivePoints: number[] = []

  for (const sub of studentSubjects) {
    const meta = subjectList.find(s => s.id === sub.subject_id)
    const grade = sub.grade
    if (grade === null || grade === undefined) continue // no grade = skip
    const pt = gradeToPoint(grade)
    if (meta?.is_core) {
      corePoints.push(pt)
    } else {
      electivePoints.push(pt)
    }
  }

  if (corePoints.length === 0 && electivePoints.length === 0) return null

  // Best 2 electives = lowest 2 grade points
  electivePoints.sort((a, b) => a - b)
  const best2Electives = electivePoints.slice(0, 2)

  return [...corePoints, ...best2Electives].reduce((sum, p) => sum + p, 0)
}

export default async function PrintReportCardsPage({
  searchParams,
}: {
  searchParams: { class_id?: string; term_id?: string; student_id?: string }
}) {
  const { class_id, term_id, student_id } = searchParams
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: ctx } = await supabase
    .from("school_current_context")
    .select("term_id, terms(id, term_number, academic_years(label))")
    .limit(1)
    .single()

  const selectedTermId = term_id ?? ctx?.term_id ?? ""
  if (!class_id || !selectedTermId) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center bg-white border border-border rounded-lg p-8">
        <h2 className="text-xl font-bold text-red-600 mb-2">Class and Term Required</h2>
        <p className="text-sm text-text-muted mb-4">Please select a class and term to generate report cards.</p>
        <Link href="/admin/academic/reports" className="text-sm text-primary font-medium underline">
          ← Go back to Report Readiness
        </Link>
      </div>
    )
  }

  // ── Parallel fetches ──────────────────────────────────────────────────────
  const [
    { data: classRow },
    { data: termRow },
    { data: schoolRow },
    { data: calendarRows }
  ] = await Promise.all([
    supabase.from("classes").select("id, name, sort_order").eq("id", class_id).single(),
    supabase.from("terms").select("id, term_number, total_school_days, vacation_date, reopening_date, academic_years(label)").eq("id", selectedTermId).single(),
    supabase.from("schools").select("name, motto, email, phone, address").limit(1).maybeSingle(),
    supabase.from("school_calendar").select("*").eq("term_id", selectedTermId)
  ])

  const className = classRow?.name ?? "Class"
  const termNumber = termRow?.term_number ?? 1
  const academicYearLabel = (termRow as any)?.academic_years?.label ?? "2025/2026"
  const termName = `${academicYearLabel} · Term ${termNumber}`

  // Match calendar section specifically to this class (preschool, primary, jhs)
  const classSection = getSectionFromClass(className, classRow?.sort_order)
  const calendar = calendarRows?.find((r: any) => r.section === classSection) || calendarRows?.[0] || null

  const vacationDateVal = calendar?.vacation_date || (termRow as any)?.vacation_date
  const reopeningDateVal = calendar?.reopening_date || (termRow as any)?.reopening_date

  const vacationDateStr = vacationDateVal
    ? new Date(vacationDateVal).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : null
  const reopeningDateStr = reopeningDateVal
    ? new Date(reopeningDateVal).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : null

  // ── All Active Students in Class (Number on Roll is ALWAYS dynamic!) ──────
  const { data: allClassStudents } = await supabase
    .from("students")
    .select("id, student_id_code, surname, first_name, gender, photo_url, photo_url_new")
    .eq("class_id", class_id)
    .eq("is_active", true)
    .order("surname")

  if (!allClassStudents || allClassStudents.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center bg-white border border-border rounded-lg p-8">
        <h2 className="text-xl font-bold text-amber-700 mb-2">No Active Students Found</h2>
        <p className="text-sm text-text-muted mb-4">No active students were found for {className}.</p>
        <Link href="/admin/academic/reports" className="text-sm text-primary font-medium underline">
          ← Return to Reports
        </Link>
      </div>
    )
  }

  // Number on Roll accounts for every active student in the class dynamically
  const numberOnRoll = allClassStudents.length

  // Filter for display (mass print or individual report card)
  const displayStudents = student_id
    ? allClassStudents.filter(s => s.id === student_id)
    : allClassStudents

  // ── Subjects (with is_core flag) ──────────────────────────────────────────
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, display_order, is_core")
    .eq("class_id", class_id)
    .order("display_order")

  const subjectList = (subjects ?? []) as { id: string; name: string; display_order: number; is_core: boolean }[]
  const allStudentIds = allClassStudents.map(s => s.id)
  const subjectIds = subjectList.map(s => s.id)

  // ── Fetch Scores for ALL Class Students to compute true Class Rank & Average
  const scoresMap = new Map<string, any>()
  if (allStudentIds.length > 0 && subjectIds.length > 0) {
    const { data: scoreRows } = await supabase
      .from("scores")
      .select("student_id, subject_id, class_score, exam_score, total_score, grade, position, subject_remark")
      .eq("term_id", selectedTermId)
      .in("student_id", allStudentIds)
      .in("subject_id", subjectIds)

    for (const sc of scoreRows ?? []) {
      scoresMap.set(`${sc.student_id}::${sc.subject_id}`, sc)
    }
  }

  // ── Dynamic Attendance Service ────────────────────────────────────────────
  // Reads real attendance table records (present), feeding logs, and section calendar days
  const attendanceSummaries = await getBulkAttendanceSummaries(
    allStudentIds,
    selectedTermId,
    class_id,
    className
  )

  // ── Compute per-student totals and raw scores across entire class ──────────
  const studentTotals: { studentId: string; rawScore: number; count: number; avg: number }[] = []
  for (const stu of allClassStudents) {
    let rawSum = 0
    let cnt = 0
    for (const subj of subjectList) {
      const sc = scoresMap.get(`${stu.id}::${subj.id}`)
      if (sc && sc.total_score !== null && sc.total_score !== undefined) {
        rawSum += Number(sc.total_score)
        cnt++
      }
    }
    const avg = cnt > 0 ? Math.round((rawSum / cnt) * 10) / 10 : 0
    studentTotals.push({ studentId: stu.id, rawScore: rawSum, count: cnt, avg })
  }

  // ── Rank by raw score ─────────────────────────────────────────────────────
  const sortedForRank = [...studentTotals].sort((a, b) => b.rawScore - a.rawScore)
  const rankMap = new Map<string, number>()
  sortedForRank.forEach((item, index) => { rankMap.set(item.studentId, index + 1) })

  // ── Class average (mean of all students' averages) ────────────────────────
  const studentsWithScores = studentTotals.filter(t => t.count > 0)
  const classAverage = studentsWithScores.length > 0
    ? Math.round((studentsWithScores.reduce((s, t) => s + t.avg, 0) / studentsWithScores.length) * 10) / 10
    : null

  // ── Build ReportData array with Dynamic Attendance & Remarks ──────────────
  const reportsData: StudentReportData[] = await Promise.all(
    displayStudents.map(async (stu) => {
      const totalStat = studentTotals.find(t => t.studentId === stu.id) ?? { rawScore: 0, count: 0, avg: 0 }
      const rank = rankMap.get(stu.id) ?? numberOnRoll

      const studentSubjects: SubjectScoreItem[] = subjectList.map(subj => {
        const sc = scoresMap.get(`${stu.id}::${subj.id}`)
        let cw: number | null = null
        let hw: number | null = null
        let ct: number | null = null
        if (sc?.subject_remark) {
          try {
            const meta = JSON.parse(sc.subject_remark)
            cw = meta.cw ?? null
            hw = meta.hw ?? null
            ct = meta.ct ?? null
          } catch (_) {}
        }
        return {
          subject_id: subj.id,
          subject_name: subj.name,
          is_core: subj.is_core,
          classwork_score: cw,
          homework_score: hw,
          classtest_score: ct,
          class_score: sc?.class_score ?? null,
          exam_score: sc?.exam_score ?? null,
          total_score: sc?.total_score ?? null,
          grade: sc?.grade ?? null,
          position: sc?.position ?? null,
        }
      })

      // Aggregate: core + best 2 electives
      const aggregate = computeAggregate(studentSubjects, subjectList)

      // Dynamic Attendance per student
      const attSummary = attendanceSummaries.get(stu.id)
      const presentDays = attSummary?.days_present ?? 0
      const totalDays = attSummary?.total_days ?? 0
      const attendancePct = attSummary?.pct ?? (totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null)

      // Dynamic Remark Engine matching score rules & templates
      const remarkDetails = await generateScoreBasedRemarks(
        stu.id,
        stu.first_name,
        stu.gender ?? "Other",
        className,
        studentSubjects.map(s => ({
          subject_name: s.subject_name,
          total_score: s.total_score ?? null,
          grade: s.grade ?? null,
        })),
        attendancePct,
        numberOnRoll,
        rank
      )

      return {
        schoolName: schoolRow?.name ?? "MORNING GLORY ACADEMY",
        motto: schoolRow?.motto ?? "GOD IS OUR LIGHT",
        address: schoolRow?.address ?? "(SCC MEKOBE LANE)",
        officialNumbers: schoolRow?.phone ?? "0555551700 / 0244894340",
        student: {
          id: stu.id,
          student_id_code: stu.student_id_code ?? "",
          surname: stu.surname,
          first_name: stu.first_name,
          gender: stu.gender ?? "",
          photo_url: (stu as any).photo_url || (stu as any).photo_url_new || null,
        },
        className,
        termName,
        termNumber,
        academicYearLabel,
        vacationDate: vacationDateStr ?? undefined,
        reopeningDate: reopeningDateStr ?? undefined,
        subjects: studentSubjects,
        totalAggregate: aggregate ?? "—",
        rawScore: totalStat.rawScore > 0 ? totalStat.rawScore : "—",
        overallAverage: totalStat.avg,
        classAverageScore: classAverage ?? "—",
        classRank: rank,
        totalStudentsInClass: numberOnRoll, // DYNAMIC NUMBER ON ROLL
        attendancePresent: presentDays,
        attendanceTotal: totalDays > 0 ? totalDays : "—",
        conduct: remarkDetails.conduct,
        interest: remarkDetails.interest,
        teacherRemark: remarkDetails.teacherRemark,
        headmasterRemark: remarkDetails.headmasterRemark,
      }
    })
  )

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 print:p-0 print:m-0 print:bg-white">
      {/* Scoped Portrait Print Rules */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 6mm 6mm !important;
          }
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .report-card-page {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .report-card-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}} />

      {/* Top Bar (Hidden on print) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div>
          <Link href="/admin/academic/reports" className="text-sm text-primary hover:underline mb-1 inline-block">
            ← Back to Report Readiness
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            {student_id && displayStudents.length === 1
              ? `Report Card: ${displayStudents[0].surname} ${displayStudents[0].first_name}`
              : `Mass Print Report Cards — ${className}`}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            {reportsData.length} report card(s) generated for {termName}. Number on Roll: {numberOnRoll}.
          </p>
        </div>
        <PrintButton label={student_id && displayStudents.length === 1 ? "Print Report Card" : `Print All (${reportsData.length}) Report Cards`} />
      </div>

      {/* Render Stack of Report Cards */}
      <div className="space-y-8 print:space-y-0">
        {reportsData.map((data) => (
          <div key={data.student.id} className="report-card-page">
            <ReportCard data={data} />
          </div>
        ))}
      </div>
    </div>
  )
}
