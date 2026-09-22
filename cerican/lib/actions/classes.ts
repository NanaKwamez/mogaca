"use server"

import { createServerClient } from "@/lib/supabase/server"
import { z } from "zod"

const classSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  level_order: z.coerce.number().int().min(1),
  division_id: z.string().uuid().optional().or(z.literal("")),
  max_students: z.coerce.number().int().min(1).default(40),
  class_teacher_id: z.string().uuid().optional().or(z.literal("")),
})

export type ClassFormValues = z.infer<typeof classSchema>

export type CreateClassResult =
  | { success: true; class_id: string }
  | { success: false; error: string }

export async function createClass(formData: unknown): Promise<CreateClassResult> {
  const parsed = classSchema.safeParse(formData)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const data = parsed.data

  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: "Unauthenticated" }

  const { data: ctx } = await supabase.from("school_current_context").select("school_id").limit(1).single()
  if (!ctx) return { success: false, error: "Could not load school context." }

  const { data: newClass, error } = await supabase
    .from("classes")
    .insert({
      school_id: ctx.school_id,
      name: data.name,
      level_order: data.level_order,
      division_id: data.division_id || null,
      max_students: data.max_students,
      class_teacher_id: data.class_teacher_id || null,
    })
    .select("id")
    .single()

  if (error || !newClass) return { success: false, error: "Failed to create class: " + error?.message }

  await supabase.from("audit_log").insert({
    school_id: ctx.school_id,
    user_id: session.user.id,
    action: "CLASS_CREATED",
    table_name: "classes",
    record_id: newClass.id,
    new_values: { name: data.name },
  })

  return { success: true, class_id: newClass.id }
}

const subjectAssignSchema = z.object({
  subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  academic_year_id: z.string().uuid(),
  term_id: z.string().uuid(),
})

export type SubjectAssignValues = z.infer<typeof subjectAssignSchema>

export type AssignResult =
  | { success: true }
  | { success: false; error: string }

export async function assignSubjectTeacher(formData: unknown): Promise<AssignResult> {
  const parsed = subjectAssignSchema.safeParse(formData)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const data = parsed.data

  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: "Unauthenticated" }

  const { error } = await supabase
    .from("subject_teacher_assignments")
    .upsert(data, { onConflict: "subject_id,teacher_id,term_id" })

  if (error) return { success: false, error: "Assignment failed: " + error.message }
  return { success: true }
}
