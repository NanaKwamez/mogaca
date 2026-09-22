"use server"

import { createServerClient } from "@/lib/supabase/server"

export interface SaveAttendanceParams {
  student_id: string
  class_id: string
  term_id: string
  date: string // YYYY-MM-DD
  status: "Present" | "Absent"
  feeding_paid?: boolean
}

export async function saveStudentAttendance(params: SaveAttendanceParams) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: "Unauthenticated" }

  const { student_id, class_id, term_id, date, status, feeding_paid = true } = params

  // 1. Upsert attendance record
  const { error: attErr } = await supabase
    .from("attendance")
    .upsert({
      student_id,
      class_id,
      term_id,
      date,
      status,
      recorded_by: session.user.id,
    }, { onConflict: "student_id,date" })

  if (attErr) return { success: false, error: "Attendance save failed: " + attErr.message }

  // 2. Sync feeding_fees record
  if (status === "Present" && feeding_paid) {
    await supabase
      .from("feeding_fees")
      .upsert({
        student_id,
        class_id,
        term_id,
        payment_date: date,
        amount: 5.00, // Standard daily feeding fee
        payment_method: "CASH",
        collected_by: session.user.id,
      }, { onConflict: "student_id,payment_date" })
  } else {
    // If absent or unpaid, remove or zero feeding fee row for that date
    await supabase
      .from("feeding_fees")
      .delete()
      .eq("student_id", student_id)
      .eq("payment_date", date)
  }

  return { success: true }
}

export async function getAttendanceForDate(classId: string, date: string) {
  const supabase = createServerClient()
  const { data } = await supabase
    .from("attendance")
    .select("student_id, status")
    .eq("class_id", classId)
    .eq("date", date)

  const map = new Map<string, "Present" | "Absent">()
  for (const row of data ?? []) {
    map.set(row.student_id, row.status as "Present" | "Absent")
  }
  return map
}
