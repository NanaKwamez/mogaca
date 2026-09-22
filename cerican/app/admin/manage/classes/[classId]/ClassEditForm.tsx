"use client"

import * as React from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface ClassData {
  id: string
  name: string
  max_students?: number | null
  class_teacher_id?: string | null
  sort_order?: number | null
}

interface StaffOption {
  id: string
  first_name: string
  surname: string
}

export function ClassEditForm({ cls, staff }: { cls: ClassData; staff: StaffOption[] }) {
  const router = useRouter()
  const [name, setName] = React.useState(cls.name)
  const [maxStudents, setMaxStudents] = React.useState(cls.max_students ?? 40)
  const [classTeacherId, setClassTeacherId] = React.useState(cls.class_teacher_id ?? "")
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
        .from("classes")
        .update({
          name: name.trim(),
          max_students: maxStudents,
          class_teacher_id: classTeacherId || null,
        })
        .eq("id", cls.id)

      if (error) throw error

      setSaveMsg("Class details updated successfully! Database saved.")
      router.refresh()
      setTimeout(() => setSaveMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save class updates.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 bg-surface border border-border rounded-lg p-6 shadow-sm">
      <h2 className="font-semibold text-text text-base">Class Details</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Class Name *" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          type="number"
          label="Max Students *"
          value={maxStudents}
          onChange={(e) => setMaxStudents(parseInt(e.target.value) || 0)}
          min={1}
          required
        />
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-sm font-semibold text-text">Class Teacher</label>
          <select
            value={classTeacherId}
            onChange={(e) => setClassTeacherId(e.target.value)}
            className={selectClass}
          >
            <option value="">Select Teacher...</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.surname}, {s.first_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
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
