"use client"

import * as React from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface StaffData {
  id: string
  staff_id_code?: string
  first_name: string
  surname: string
  other_names?: string | null
  email?: string | null
  staff_type?: string | null
  is_active?: boolean
}

const STAFF_TYPES = [
  "Teacher",
  "Headteacher",
  "Deputy Head",
  "Administrator",
  "Accountant",
  "Bursar",
  "Librarian",
  "Caretaker",
  "Support Staff",
  "Other",
]

export function StaffEditForm({ staff }: { staff: StaffData }) {
  const router = useRouter()
  const [firstName, setFirstName] = React.useState(staff.first_name)
  const [surname, setSurname] = React.useState(staff.surname)
  const [otherNames, setOtherNames] = React.useState(staff.other_names ?? "")
  const [email, setEmail] = React.useState(staff.email ?? "")
  const [staffType, setStaffType] = React.useState(staff.staff_type ?? "Teacher")
  const [isActive, setIsActive] = React.useState(staff.is_active ?? true)
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
        .from("staff")
        .update({
          first_name: firstName.trim(),
          surname: surname.trim(),
          other_names: otherNames.trim() || null,
          email: email.trim() || null,
          staff_type: staffType,
          is_active: isActive,
        })
        .eq("id", staff.id)

      if (error) throw error

      setSaveMsg("Staff record updated successfully! Database saved.")
      router.refresh()
      setTimeout(() => setSaveMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save staff updates.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 bg-surface border border-border rounded-lg p-6 shadow-sm">
      <h2 className="font-semibold text-text text-base">Staff Details</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="First Name *" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <Input label="Surname *" value={surname} onChange={(e) => setSurname(e.target.value)} required />
        <Input label="Other Names" value={otherNames} onChange={(e) => setOtherNames(e.target.value)} />
        <Input type="email" label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-sm font-semibold text-text">Staff Type</label>
          <select value={staffType} onChange={(e) => setStaffType(e.target.value)} className={selectClass}>
            {STAFF_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
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
          <span className="text-sm font-medium text-text">Staff Member is Active</span>
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
