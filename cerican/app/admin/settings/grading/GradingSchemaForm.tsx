"use client"

import React, { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export interface GradeBand {
  grade: string
  min: number
  max: number
  remark: string
}

export function GradingSchemaForm({ initialBands }: { initialBands: GradeBand[] }) {
  const router = useRouter()
  const [bands, setBands] = useState<GradeBand[]>(initialBands)
  const [loading, setLoading] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleBandChange = (index: number, field: keyof GradeBand, value: any) => {
    const updated = [...bands]
    if (field === "min" || field === "max") {
      updated[index][field] = parseInt(value) || 0
    } else {
      updated[index][field] = value
    }
    setBands(updated)
  }

  const addBand = () => {
    setBands([...bands, { grade: "NEW", min: 0, max: 100, remark: "Pass" }])
  }

  const removeBand = (index: number) => {
    if (bands.length <= 1) return
    setBands(bands.filter((_, i) => i !== index))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveMsg(null)
    setErrorMsg(null)

    try {
      const supabase = createClient()
      const { data: ctx } = await supabase.from("school_current_context").select("school_id").limit(1).maybeSingle()
      const sId = ctx?.school_id ?? "6caa6780-29ba-4e94-93b4-5a450fc7ccbc"

      const { error } = await supabase.from("grading_schemas").upsert(
        {
          school_id: sId,
          name: "Standard GES Grading Scale",
          bands: bands,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "school_id" }
      )

      if (error) throw error

      setSaveMsg("✓ Grading schema saved successfully!")
      router.refresh()
      setTimeout(() => setSaveMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save grading schema.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h2 className="font-bold text-slate-900 text-base">Active Grade Scale Bands</h2>
        <button
          type="button"
          onClick={addBand}
          className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          + Add Grade Band
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-900 text-white font-bold text-xs uppercase">
              <th className="py-2.5 px-4 w-24">Grade</th>
              <th className="py-2.5 px-4 w-32 text-center">Min Score (%)</th>
              <th className="py-2.5 px-4 w-32 text-center">Max Score (%)</th>
              <th className="py-2.5 px-4">Descriptor</th>
              <th className="py-2.5 px-4 text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bands.map((b, idx) => (
              <tr key={idx} className={`border-b border-slate-200 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                <td className="py-2 px-3">
                  <input
                    type="text"
                    value={b.grade}
                    onChange={(e) => handleBandChange(idx, "grade", e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </td>
                <td className="py-2 px-3 text-center">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={b.min}
                    onChange={(e) => handleBandChange(idx, "min", e.target.value)}
                    className="w-20 border border-slate-300 rounded px-2 py-1 font-mono text-center text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </td>
                <td className="py-2 px-3 text-center">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={b.max}
                    onChange={(e) => handleBandChange(idx, "max", e.target.value)}
                    className="w-20 border border-slate-300 rounded px-2 py-1 font-mono text-center text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </td>
                <td className="py-2 px-3">
                  <input
                    type="text"
                    value={b.remark}
                    onChange={(e) => handleBandChange(idx, "remark", e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </td>
                <td className="py-2 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => removeBand(idx)}
                    className="text-red-600 hover:text-red-800 text-xs font-bold px-2 py-1"
                    title="Delete band"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-slate-900 text-white font-semibold text-sm rounded-md hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? "Saving Schema…" : "Save Grading Schema"}
        </button>
      </div>

      {saveMsg && (
        <div className="rounded-md bg-emerald-50 border border-emerald-300 p-3 text-sm text-emerald-800 font-semibold">
          {saveMsg}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-md bg-red-50 border border-red-300 p-3 text-sm text-red-700 font-semibold">
          ❌ {errorMsg}
        </div>
      )}
    </form>
  )
}
