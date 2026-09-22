// Wire real server action into the existing StudentForm
"use client"
import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { studentSchema, StudentFormValues } from "@/lib/validations/student.schema"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { createStudent } from "@/lib/actions/students"

interface SuccessState {
  student_id_code: string
  student_id: string
}

export function StudentForm({ classes = [] }: { classes?: { id: string; name: string }[] }) {
  const [success, setSuccess] = React.useState<SuccessState | null>(null)
  const [serverError, setServerError] = React.useState<string | null>(null)

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      enrollment_date: new Date().toISOString().split("T")[0],
      gender: "Male",
    },
  })

  const onSubmit = async (data: StudentFormValues) => {
    setServerError(null)
    setSuccess(null)
    const res = await createStudent(data)
    if (res.success) {
      setSuccess({ student_id_code: res.student_id_code, student_id: res.student_id })
      reset()
    } else {
      setServerError(res.error)
    }
  }

  const selectClass =
    "flex h-[44px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"

  if (success) {
    return (
      <div className="bg-surface border border-border rounded-lg p-6 text-center space-y-4">
        <div className="text-4xl">🎉</div>
        <h2 className="text-lg font-bold text-text">Student Registered Successfully</h2>
        <p className="text-text-muted text-sm">
          Student ID: <span className="font-mono font-bold text-primary">{success.student_id_code}</span>
        </p>
        <div className="flex gap-3 justify-center mt-4">
          <Button variant="secondary" onClick={() => setSuccess(null)}>Register Another</Button>
          <Button onClick={() => window.location.href = `/admin/manage/students`}>View Record</Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-surface p-6 rounded-lg shadow-card border border-border">
      <h2 className="font-semibold text-text">Section 1 — Identity</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Surname *" {...register("surname")} error={errors.surname?.message} />
        <Input label="First Name *" {...register("first_name")} error={errors.first_name?.message} />
        <Input label="Other Names / Middle Name" {...register("other_names")} />
        <Input type="date" label="Date of Birth *" {...register("date_of_birth")} error={errors.date_of_birth?.message} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-text">Gender *</label>
          <select {...register("gender")} className={selectClass}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errors.gender && <span className="text-xs text-danger">{errors.gender.message}</span>}
        </div>
      </div>

      <h2 className="font-semibold text-text border-t border-border pt-4">Section 2 — Academic Placement</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-text">Class *</label>
          <select {...register("class_id")} className={selectClass}>
            <option value="">Select Class...</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.class_id && <span className="text-xs text-danger">{errors.class_id.message}</span>}
        </div>
        <Input type="date" label="Enrollment Date *" {...register("enrollment_date")} error={errors.enrollment_date?.message} />
      </div>

      {serverError && (
        <div className="rounded-md bg-red-50 border border-danger p-3 text-sm text-danger">{serverError}</div>
      )}

      <div className="flex justify-end pt-4 border-t border-border">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Student"}
        </Button>
      </div>
    </form>
  )
}
