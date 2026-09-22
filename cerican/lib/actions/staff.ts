"use server"

import { createServerClient } from "@/lib/supabase/server"
import { staffSchema } from "@/lib/validations/staff.schema"
import { randomBytes } from "crypto"

export type CreateStaffResult =
  | { success: true; staff_id_code: string; staff_id: string; temp_password: string }
  | { success: false; error: string }

function generateSecurePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$"
  const bytes = randomBytes(length)
  return Array.from(bytes).map(b => chars[b % chars.length]).join("")
}

export async function createStaff(formData: unknown): Promise<CreateStaffResult> {
  const parsed = staffSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }
  const data = parsed.data

  const supabase = createServerClient()

  // Get session or fallback gracefully
  const { data: { session } } = await supabase.auth.getSession()

  // Get school ID and code with fallback
  let schoolId = "6caa6780-29ba-4e94-93b4-5a450fc7ccbc"
  let schoolCode = "MOGASCO01"

  const { data: ctx } = await supabase
    .from("school_current_context")
    .select("school_id")
    .limit(1)
    .maybeSingle()

  if (ctx?.school_id) {
    schoolId = ctx.school_id
  }

  const { data: school } = await supabase
    .from("schools")
    .select("code")
    .eq("id", schoolId)
    .maybeSingle()

  if (school?.code) {
    schoolCode = school.code
  }

  // Allocate staff ID via RPC or fallback to count
  let seqResult: number | null = null
  try {
    const { data: rpcRes } = await supabase.rpc("allocate_next_id", {
      p_school_id: schoolId,
      p_seq_type: "staff",
    })
    seqResult = rpcRes
  } catch {
    seqResult = null
  }

  if (seqResult === null || seqResult === undefined) {
    const { count } = await supabase.from("staff").select("*", { count: "exact", head: true })
    seqResult = (count ?? 0) + 1
  }

  const seqPadded = String(seqResult).padStart(4, "0")
  const staffIdCode = `${schoolCode}/STF/${seqPadded}`

  // Generate a secure temporary password
  const tempPassword = generateSecurePassword()

  // Create Supabase auth user if email is provided
  let userId: string | null = null
  if (data.email) {
    try {
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: data.email,
        password: tempPassword,
        email_confirm: true,
      })
      if (!authErr && authUser?.user) {
        userId = authUser.user.id
      }
    } catch {
      // Auth admin call optional if client key lacks admin privileges
    }
  }

  const { data: newStaff, error: insertErr } = await supabase
    .from("staff")
    .insert({
      school_id: schoolId,
      staff_id_code: staffIdCode,
      surname: data.surname,
      first_name: data.first_name,
      other_names: data.other_names ?? null,
      gender: data.gender,
      staff_type: data.staff_type,
      email: data.email || null,
      contact_one: data.contact_one ?? null,
      contact_two: data.contact_two ?? null,
      date_joined: data.date_joined ?? null,
      must_change_password: true,
      user_id: userId,
      created_by: session?.user?.id ?? null,
    })
    .select("id")
    .single()

  if (insertErr || !newStaff) {
    return { success: false, error: "Failed to save staff member: " + (insertErr?.message || "Unknown error") }
  }

  return { success: true, staff_id_code: staffIdCode, staff_id: newStaff.id, temp_password: tempPassword }
}
