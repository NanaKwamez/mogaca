"use client"
import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { staffSchema, StaffFormValues } from "@/lib/validations/staff.schema"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { createStaff } from "@/lib/actions/staff"

export function StaffForm() {
  const [result, setResult] = React.useState<{ staff_id_code: string; temp_password: string } | null>(null)
  const [serverError, setServerError] = React.useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      gender: "Male",
      staff_type: "Teacher",
    },
  })

  const onSubmit = async (data: StaffFormValues) => {
    setServerError(null)
    const res = await createStaff(data)
    if (res.success) {
      setResult({ staff_id_code: res.staff_id_code, temp_password: res.temp_password })
      reset()
    } else {
      setServerError(res.error)
    }
  }

  const selectClass = "flex h-[44px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-surface p-6 rounded-lg shadow-card border border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Surname *" {...register("surname")} error={errors.surname?.message} />
          <Input label="First Name *" {...register("first_name")} error={errors.first_name?.message} />
          <Input label="Other Names" {...register("other_names")} />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-text">Gender *</label>
            <select {...register("gender")} className={selectClass}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            {errors.gender && <span className="text-xs text-danger">{errors.gender.message}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-text">Staff Type *</label>
            <select {...register("staff_type")} className={selectClass}>
              <option value="Teacher">Teacher</option>
              <option value="Head Teacher">Head Teacher</option>
              <option value="Admin">Admin</option>
              <option value="Accountant">Accountant</option>
              <option value="Other">Other</option>
            </select>
            {errors.staff_type && <span className="text-xs text-danger">{errors.staff_type.message}</span>}
          </div>

          <Input label="Email (optional)" type="email" {...register("email")} error={errors.email?.message} />
          <Input label="Contact One" {...register("contact_one")} />
          <Input label="Contact Two" {...register("contact_two")} />
          <Input label="Date Joined" type="date" {...register("date_joined")} />
        </div>

        {serverError && (
          <div className="rounded-md bg-red-50 border border-danger p-3 text-sm text-danger">{serverError}</div>
        )}

        <div className="flex justify-end pt-4 border-t border-border">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Staff Member"}
          </Button>
        </div>
      </form>

      {/* One-time credential modal */}
      <Modal
        isOpen={!!result}
        onClose={() => setResult(null)}
        title="Staff Member Registered"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            The staff member has been registered successfully. Share the temporary credentials below.
            This password will <strong>not</strong> be shown again.
          </p>
          <div className="bg-background rounded-md p-4 space-y-2 border border-border">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-text-muted">Staff ID</span>
              <span className="text-sm font-mono font-bold text-text">{result?.staff_id_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-text-muted">Temp. Password</span>
              <span className="text-sm font-mono font-bold text-text">{result?.temp_password}</span>
            </div>
          </div>
          <p className="text-xs text-warning">Staff must change their password on first login.</p>
          <div className="flex justify-end">
            <Button onClick={() => setResult(null)}>Done</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
