"use client"

import * as React from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface StudentData {
  id: string
  student_id_code?: string
  surname: string
  first_name: string
  other_names?: string | null
  gender?: string | null
  date_of_birth?: string | null
  class_id?: string | null
  enrollment_date?: string | null
  is_active?: boolean
}

interface ClassOption {
  id: string
  name: string
}

export function StudentEditForm({ student, classes }: { student: StudentData; classes: ClassOption[] }) {
  const router = useRouter()
  const [surname, setSurname] = React.useState(student.surname)
  const [firstName, setFirstName] = React.useState(student.first_name)
  const [otherNames, setOtherNames] = React.useState(student.other_names ?? "")
  const [gender, setGender] = React.useState(student.gender ?? "Male")
  const [dateOfBirth, setDateOfBirth] = React.useState(student.date_of_birth ?? "")
  const [classId, setClassId] = React.useState(student.class_id ?? "")
  const [enrollmentDate, setEnrollmentDate] = React.useState(student.enrollment_date ?? "")
  const [isActive, setIsActive] = React.useState(student.is_active ?? true)
  const [loading, setLoading] = React.useState(false)
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const selectClass = "flex h-[44px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveMsg(null)
    setErrorMsg(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("students")
        .update({
          surname: surname.trim(),
          first_name: firstName.trim(),
          other_names: otherNames.trim() || null,
          gender: gender || null,
          date_of_birth: dateOfBirth || null,
          class_id: classId || null,
          enrollment_date: enrollmentDate || null,
          is_active: isActive,
        })
        .eq("id", student.id)

      if (error) throw error

      setSaveMsg("Student record updated successfully! Database saved.")
      router.refresh()
      setTimeout(() => setSaveMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save student updates.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 bg-surface border border-border rounded-lg p-6 shadow-sm">
      <h2 className="font-semibold text-text text-base">Student Details</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Surname *" value={surname} onChange={(e) => setSurname(e.target.value)} required />
        <Input label="First Name *" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <Input label="Other Names / Middle Name" value={otherNames} onChange={(e) => setOtherNames(e.target.value)} />
        <Input type="date" label="Date of Birth" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-text">Gender</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)} className={selectClass}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <Input type="date" label="Enrollment Date" value={enrollmentDate} onChange={(e) => setEnrollmentDate(e.target.value)} />
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-sm font-semibold text-text">Class</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className={selectClass}>
            <option value="">Select Class...</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-border pt-4 flex items-center justify-between">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-text">Student is Active</span>
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving to DB…" : "Save Changes"}
        </Button>
      </div>

      {saveMsg && (
        <div className="rounded-md bg-green-50 border border-success p-3 text-sm text-success font-medium">
          {saveMsg}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-md bg-red-50 border border-red-300 p-3 text-sm text-red-700 font-medium">
          ❌ {errorMsg}
        </div>
      )}
    </form>
  )
}
