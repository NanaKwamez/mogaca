"use client"
import * as React from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

type CalendarSection = {
  section: "preschool" | "primary" | "jhs"
  vacation_date: string | null
  reopening_date: string | null
  total_school_days: number | null
}

type FormValues = {
  sections: CalendarSection[]
}

const SECTION_TITLES: Record<string, string> = {
  preschool: "PRESCHOOL DATES",
  primary: "PRIMARY SCHOOL DATES",
  jhs: "J.H.S. DATES",
}

export function SchoolCalendarForm({ sections }: { sections: CalendarSection[] }) {
  const [serverResult, setServerResult] = React.useState<{ ok: boolean; error?: string } | null>(null)

  const { control, handleSubmit, register, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      sections: sections.map((s) => ({
        ...s,
        vacation_date: s.vacation_date ?? "",
        reopening_date: s.reopening_date ?? "",
        total_school_days: s.total_school_days ?? 0,
      })) as CalendarSection[],
    },
  })

  const { fields } = useFieldArray({
    control,
    name: "sections",
  })

  const onSubmit = async (data: FormValues) => {
    setServerResult(null)
    try {
      const res = await fetch("/api/admin/school-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: data.sections }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.ok) {
        setServerResult({ ok: true })
      } else {
        setServerResult({ ok: false, error: json.error ?? "Failed to save" })
      }
    } catch (e: any) {
      setServerResult({ ok: false, error: e?.message ?? "Network error" })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {fields.map((field, index) => (
        <div key={field.id} className="bg-surface border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-bold tracking-wider text-text">{SECTION_TITLES[field.section]}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Vacation Date"
              type="date"
              {...register(`sections.${index}.vacation_date` as const)}
            />
            <Input
              label="Reopening Date"
              type="date"
              {...register(`sections.${index}.reopening_date` as const)}
            />
            <Input
              label="Total Times Opened"
              type="number"
              min={0}
              {...register(`sections.${index}.total_school_days` as const, { valueAsNumber: true })}
              error={errors.sections?.[index]?.total_school_days?.message}
            />
          </div>
          <input type="hidden" {...register(`sections.${index}.section` as const)} />
        </div>
      ))}

      {serverResult && (
        serverResult.ok ? (
          <div className="rounded-md bg-green-50 border border-green-500 p-3 text-sm text-green-700">
            School calendar saved successfully.
          </div>
        ) : (
          <div className="rounded-md bg-red-50 border border-danger p-3 text-sm text-danger">
            {serverResult.error}
          </div>
        )
      )}

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Calendar"}
        </Button>
      </div>
    </form>
  )
}
