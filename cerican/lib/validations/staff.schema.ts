import { z } from "zod"

export const staffSchema = z.object({
  surname: z.string().min(1, "Surname is required"),
  first_name: z.string().min(1, "First Name is required"),
  other_names: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]),
  staff_type: z.string().min(1, "Staff type is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  contact_one: z.string().optional(),
  contact_two: z.string().optional(),
  date_joined: z.string().optional(),
})

export type StaffFormValues = z.infer<typeof staffSchema>
