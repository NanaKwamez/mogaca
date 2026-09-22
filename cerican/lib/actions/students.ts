"use server"

import { createServerClient } from "@/lib/supabase/server"
import { studentSchema } from "@/lib/validations/student.schema"

export type CreateStudentResult =
  | { success: true; student_id_code: string; student_id: string }
  | { success: false; error: string }

export async function createStudent(formData: unknown): Promise<CreateStudentResult> {
  // 1. Parse + validate
  const parsed = studentSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: "Validation failed: " + parsed.error.issues[0].message }
  }
  const data = parsed.data

  const supabase = createServerClient()

  // 2. Get session or fallback gracefully
  const { data: { session } } = await supabase.auth.getSession()

  // 3. Fallback context data
  let schoolId = "6caa6780-29ba-4e94-93b4-5a450fc7ccbc"
  let schoolCode = "MOGASCO01"
  let academicYearId = "d7d4c063-ce20-4e67-9aa8-9fec900df88e"

  const { data: ctx } = await supabase
    .from("school_current_context")
    .select("school_id, academic_year_id")
    .limit(1)
    .maybeSingle()

  if (ctx?.school_id) schoolId = ctx.school_id
  if (ctx?.academic_year_id) academicYearId = ctx.academic_year_id

  const { data: school } = await supabase
    .from("schools")
    .select("code")
    .eq("id", schoolId)
    .maybeSingle()

  if (school?.code) schoolCode = school.code

  // 4. Get class level_order for ID formatting
  const { data: cls } = await supabase
    .from("classes")
    .select("level_order")
    .eq("id", data.class_id)
    .maybeSingle()

  // 5. Allocate next ID atomically via RPC or count fallback
  let seqResult: number | null = null
  try {
    const { data: rpcRes } = await supabase.rpc("allocate_next_id", {
      p_school_id: schoolId,
      p_seq_type: "student",
    })
    seqResult = rpcRes
  } catch {
    seqResult = null
  }

  if (seqResult === null || seqResult === undefined) {
    const { count } = await supabase.from("students").select("*", { count: "exact", head: true })
    seqResult = (count ?? 0) + 1
  }

  const yearSuffix = new Date().getFullYear().toString().slice(2)
  const levelPadded = String(cls?.level_order ?? 0).padStart(2, "0")
  const seqPadded = String(seqResult).padStart(4, "0")
  const studentIdCode = `${schoolCode}/${levelPadded}/${yearSuffix}/${seqPadded}`

  // 6. Insert student
  const { data: newStudent, error: insertErr } = await supabase
    .from("students")
    .insert({
      school_id: schoolId,
      student_id_code: studentIdCode,
      surname: data.surname,
      first_name: data.first_name,
      other_names: data.other_names ?? null,
      gender: data.gender,
      date_of_birth: data.date_of_birth,
      class_id: data.class_id,
      enrollment_date: data.enrollment_date,
      created_by: session?.user?.id ?? null,
    })
    .select("id")
    .single()

  if (insertErr || !newStudent) {
    return { success: false, error: "Failed to save student: " + (insertErr?.message || "Unknown error") }
  }

  // 7. Record enrollment history
  await supabase.from("student_enrollments").insert({
    student_id: newStudent.id,
    academic_year_id: academicYearId,
    class_id: data.class_id,
    enrollment_status: "active",
    start_date: data.enrollment_date,
  })

  return { success: true, student_id_code: studentIdCode, student_id: newStudent.id }
}
