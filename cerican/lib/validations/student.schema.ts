import { z } from 'zod'

export const studentSchema = z.object({
  surname: z.string().min(1, 'Surname is required'),
  first_name: z.string().min(1, 'First Name is required'),
  other_names: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']),
  date_of_birth: z.string().min(1, 'Date of Birth is required'),
  class_id: z.string().uuid('Class selection is required'),
  enrollment_date: z.string().min(1, 'Enrollment Date is required'),
  photo_url: z.string().optional()
})

export type StudentFormValues = z.infer<typeof studentSchema>
