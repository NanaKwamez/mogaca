import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { getUserRoleAndProfile } from "@/lib/auth/role"
import { PrintButton } from "@/components/ui/PrintButton"
import Link from "next/link"

function getShortSubjectName(name: string): string {
  const n = name.trim().toLowerCase()
  if (n.includes("religious") || n.includes("rme") || n.includes("moral")) return "R.M.E"
  if (n.includes("creative art") || n.includes("cad") || n.includes("creative")) return "C. ARTS"
  if (n.includes("career")) return "CAREER TECH"
  if (n.includes("integrated science") || n.includes("science")) return "SCIENCE"
  if (n.includes("ghanaian") || n.includes("twi")) return "TWI"
  if (n.includes("social")) return "SOC. STUDIES"
  if (n.includes("computing") || n.includes("ict")) return "COMPUTING"
  if (n.includes("english")) return "ENGLISH"
  if (n.includes("mathematics") || n.includes("math")) return "MATHS"
  if (n.includes("french")) return "FRENCH"
  if (n.includes("physical") || n.includes("pe")) return "P.E"
  if (n.includes("phonetics") || n.includes("phoenix") || n.includes("sound")) return "PHONICS"
  if (n.includes("literacy")) return "LITERACY"
  if (n.includes("numeracy")) return "NUMERACY"
  if (n.includes("creativity")) return "CREATIVITY"
  if (n.includes("colouring") || n.includes("coloring")) return "COLOURING"
  if (n.includes("world") || n.includes("owop")) return "OWOP"
  if (n.includes("storytelling") || n.includes("picture")) return "STORYTELL"
  if (n.includes("painting")) return "PAINTING"
  if (n.includes("singing") || n.includes("dancing")) return "SING/DANCE"
  return name.toUpperCase()
}

export default async function TeacherMasterSheetPage({
  searchParams,
}: {
  searchParams: { class_id?: string; term_id?: string; academic_year_id?: string }
}) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { staff, role } = await getUserRoleAndProfile(session.user.id, session.user.email)
  if (role !== "TEACHER" || !staff) redirect("/login?error=unauthorized")

  const { data: ctx } = await supabase
    .from("school_current_context")
    .select("school_id, term_id, academic_year_id")
    .limit(1)
    .single()

  const { data: years } = await supabase.from("academic_years").select("id, label").order("label", { ascending: false })
  const selectedYearId = searchParams.academic_year_id ?? ctx?.academic_year_id ?? years?.[0]?.id ?? ""

  const { data: terms } = selectedYearId
    ? await supabase.from("terms").select("id, term_number, is_current").eq("academic_year_id", selectedYearId).order("term_number")
    : { data: [] }

  const termList = terms ?? []
  const selectedTermId = searchParams.term_id ?? (termList.find(t => t.is_current)?.id || termList[0]?.id || ctx?.term_id || "")

  // Get classes where teacher is Class Teacher ONLY (Homeroom Teacher)
  const [{ data: classTeacherClasses }, { data: upProfile }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, sort_order")
      .eq("class_teacher_id", staff.id),
    supabase
      .from("user_profiles")
      .select("class_id")
      .eq("id", session.user.id)
      .maybeSingle()
  ])

  const classMap = new Map<string, { id: string; name: string; sort_order: number }>()
  for (const c of classTeacherClasses ?? []) {
    classMap.set(c.id, c)
  }

  if (upProfile?.class_id) {
    const { data: profileClass } = await supabase
      .from("classes")
      .select("id, name, sort_order")
      .eq("id", upProfile.class_id)
      .maybeSingle()
    if (profileClass) classMap.set(profileClass.id, profileClass)
  }

  const availableClasses = Array.from(classMap.values()).sort((a, b) => a.sort_order - b.sort_order)

  if (availableClasses.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center bg-white border border-border rounded-xl p-8 shadow-sm">
        <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
          🔒
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Class Teacher Access Restricted</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          The Master Score Sheet is strictly accessible to Class Teachers (Homeroom Teachers) for their assigned class.
        </p>
        <p className="text-xs text-slate-500 mt-3">
          As a Subject Teacher, you can enter scores for your subjects under the <strong>Scoresheets</strong> tab.
        </p>
        <div className="mt-6">
          <Link href="/teacher/scoresheets" className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark">
            Go to My Subject Scoresheets →
          </Link>
        </div>
      </div>
    )
  }

  const selectedClassId = searchParams.class_id ?? availableClasses[0].id
  const selectedClass = availableClasses.find(c => c.id === selectedClassId) ?? availableClasses[0]

  let students: any[] = []
  let subjects: any[] = []
  let scoresMap: Record<string, number | null> = {}
  let studentTotals: Record<string, { total: number; count: number; avg: number; rank?: number }> = {}

  if (selectedClassId && selectedTermId) {
    const [{ data: sData }, { data: subjData }] = await Promise.all([
      supabase
        .from("students")
        .select("id, student_id_code, surname, first_name")
        .eq("class_id", selectedClassId)
        .eq("is_active", true)
        .order("surname"),
      supabase
        .from("subjects")
        .select("id, name, display_order")
        .eq("class_id", selectedClassId)
        .order("display_order"),
    ])

    students = sData ?? []
    subjects = subjData ?? []

    const subjectIds = subjects.map((s) => s.id)
    const studentIds = students.map((s) => s.id)

    if (subjectIds.length > 0 && studentIds.length > 0) {
      const { data: scoresData } = await supabase
        .from("scores")
        .select("student_id, subject_id, total_score")
        .eq("term_id", selectedTermId)
        .in("student_id", studentIds)
        .in("subject_id", subjectIds)

      for (const score of scoresData ?? []) {
        const sc: any = score
        scoresMap[`${sc.student_id}::${sc.subject_id}`] = sc.total_score
      }

      const totalsList: { studentId: string; total: number }[] = []

      for (const stu of students) {
        let sum = 0
        let cnt = 0
        for (const subj of subjects) {
          const val = scoresMap[`${stu.id}::${subj.id}`]
          if (val !== null && val !== undefined) {
            sum += Number(val)
            cnt++
          }
        }
        const avg = cnt > 0 ? Math.round((sum / cnt) * 10) / 10 : 0
        studentTotals[stu.id] = { total: sum, count: cnt, avg }
        totalsList.push({ studentId: stu.id, total: sum })
      }

      totalsList.sort((a, b) => b.total - a.total)
      totalsList.forEach((item, index) => {
        if (studentTotals[item.studentId]) {
          studentTotals[item.studentId].rank = index + 1
        }
      })
    }
  }

  const currentClassName = selectedClass?.name ?? ""
  const currentYearLabel = years?.find((y: any) => y.id === selectedYearId)?.label ?? ""
  const currentTermNumber = termList.find((t: any) => t.id === selectedTermId)?.term_number ?? "1"

  return (
    <div className="max-w-7xl mx-auto space-y-6 print:space-y-2 print:m-0 print:p-0 print:max-w-none">
      {/* Scoped Landscape Print Rules */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 8mm 6mm !important;
          }
        }
      `}} />

      {/* Official Print Header */}
      <div className="hidden print:block mb-3 text-center border-b-2 border-black pb-2">
        <h1 className="text-lg font-black uppercase tracking-wider text-black">MORNING GLORY ACADEMY</h1>
        <p className="text-[10px] font-bold text-black italic">"GOD IS OUR LIGHT" · (SCC MEKOBE LANE)</p>
        <p className="text-[10px] text-black">TEL: 0555551700 / 0244894340</p>
        <h2 className="text-xs font-black uppercase mt-1 text-black underline tracking-wide">
          CLASS MASTER SCORE SHEET
        </h2>
        <div className="flex justify-between items-center text-[10px] font-bold mt-2 px-1 text-black border-t border-black pt-1">
          <span>CLASS: {currentClassName}</span>
          <span>ACADEMIC YEAR: {currentYearLabel}</span>
          <span>TERM: TERM {currentTermNumber}</span>
          <span>TOTAL STUDENTS: {students.length}</span>
          <span>PRINTED: {new Date().toLocaleDateString('en-GB')}</span>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div>
          <Link href="/teacher/dashboard" className="text-sm text-primary hover:underline mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-text">Class Master Score Sheet</h1>
          <p className="text-text-muted mt-1">
            Master scoresheet overview for {selectedClass.name}.
          </p>
        </div>
        <PrintButton label="Print Class Master Sheet" />
      </div>

      <form className="bg-surface border border-border rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-text uppercase">Academic Year</label>
          <select
            name="academic_year_id"
            defaultValue={selectedYearId}
            className="h-[42px] rounded-md border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            {(years ?? []).map((y) => (
              <option key={y.id} value={y.id}>{y.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-text uppercase">Term</label>
          <select
            name="term_id"
            defaultValue={selectedTermId}
            className="h-[42px] rounded-md border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            {termList.map((t: any) => (
              <option key={t.id} value={t.id}>
                Term {t.term_number} {t.is_current ? " (Current)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-text uppercase">Class</label>
          <select
            name="class_id"
            defaultValue={selectedClassId}
            className="h-[42px] rounded-md border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            {availableClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3 flex justify-end pt-2 border-t border-border">
          <button type="submit" className="h-[42px] px-6 bg-slate-900 text-white font-bold rounded-md hover:bg-slate-800 transition-colors text-sm">
            Load Master Sheet
          </button>
        </div>
      </form>

      {students.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-border text-text-muted print:hidden">
          <p className="text-lg font-medium">No active students found in {selectedClass.name}</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-border text-text-muted print:hidden">
          <p className="text-lg font-medium">No subjects assigned to {selectedClass.name}</p>
        </div>
      ) : (
        <div className="overflow-x-auto print:overflow-visible bg-surface border border-border rounded-lg shadow-sm print:border-none print:shadow-none">
          <table className="w-full text-left border-collapse print:text-[10.5px]">
            <thead>
              <tr className="border-b-2 border-border bg-background print:bg-gray-100 print:border-black">
                <th className="py-2.5 px-2 text-xs print:text-[9.5px] font-bold uppercase tracking-wider text-text-muted print:text-black sticky left-0 print:static bg-background print:bg-transparent z-10 border-r border-border print:border-black w-[80px] min-w-[70px] text-center">
                  ID
                </th>
                <th className="py-2.5 px-3 text-xs print:text-[10px] font-bold uppercase tracking-wider text-text-muted print:text-black sticky left-[80px] print:static bg-background print:bg-transparent z-10 border-r border-border print:border-black w-[170px] min-w-[140px]">
                  Student Name
                </th>
                {subjects.map((subj: any) => (
                  <th
                    key={subj.id}
                    className="vertical-header border-r border-border print:border-black w-[38px] min-w-[34px] max-w-[42px]"
                    title={subj.name}
                  >
                    <span className="vertical-header-text text-slate-800 print:text-black">
                      {getShortSubjectName(subj.name)}
                    </span>
                  </th>
                ))}
                <th className="vertical-header border-r border-border print:border-black bg-primary-light/10 print:bg-transparent w-[42px] min-w-[38px]">
                  <span className="vertical-header-text text-primary print:text-black font-black">
                    TOTAL
                  </span>
                </th>
                <th className="vertical-header border-r border-border print:border-black bg-primary-light/10 print:bg-transparent w-[42px] min-w-[38px]">
                  <span className="vertical-header-text text-primary print:text-black font-black">
                    AVERAGE
                  </span>
                </th>
                <th className="vertical-header bg-primary-light/10 print:bg-transparent w-[38px] min-w-[34px]">
                  <span className="vertical-header-text text-primary print:text-black font-black">
                    POSITION
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((stu: any, idx: number) => {
                const stat = studentTotals[stu.id] || { total: 0, count: 0, avg: 0, rank: 0 }
                return (
                  <tr
                    key={stu.id}
                    className={`border-b border-border print:border-black ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50 print:bg-transparent"} hover:bg-amber-50/40 transition-colors`}
                  >
                    <td className="py-1.5 px-2 text-xs print:text-[9.5px] font-mono text-text-muted print:text-black sticky left-0 print:static bg-inherit z-10 whitespace-nowrap border-r border-border print:border-black text-center">
                      {stu.student_id_code}
                    </td>
                    <td className="py-1.5 px-3 text-sm print:text-[10px] font-semibold text-text print:text-black sticky left-[80px] print:static bg-inherit z-10 whitespace-nowrap border-r border-border print:border-black">
                      {stu.surname}, {stu.first_name}
                    </td>
                    {subjects.map((subj: any) => {
                      const key = `${stu.id}::${subj.id}`
                      const val = scoresMap[key]
                      return (
                        <td
                          key={subj.id}
                          className="py-1.5 px-1 text-sm print:text-[10px] text-text print:text-black text-center font-mono border-r border-border print:border-black"
                        >
                          {val !== null && val !== undefined ? (
                            <span className="font-medium text-gray-900 print:text-black">{val}</span>
                          ) : (
                            <span className="text-gray-300 print:text-gray-400">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="py-1.5 px-1 text-sm print:text-[10px] font-bold text-primary print:text-black text-center font-mono bg-primary-light/5 print:bg-transparent border-r border-border print:border-black">
                      {stat.total}
                    </td>
                    <td className="py-1.5 px-1 text-sm print:text-[10px] font-bold text-primary print:text-black text-center font-mono bg-primary-light/5 print:bg-transparent border-r border-border print:border-black">
                      {stat.avg}
                    </td>
                    <td className="py-1.5 px-1 text-sm print:text-[10px] font-bold text-indigo-700 print:text-black text-center font-mono bg-indigo-50/50 print:bg-transparent">
                      #{stat.rank}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
