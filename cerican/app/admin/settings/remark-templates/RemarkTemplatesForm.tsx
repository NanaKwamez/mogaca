"use client"

import React, { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export interface TemplateItem {
  id?: string
  target: "TEACHER" | "HEADMASTER"
  category: string
  text: string
}

export function RemarkTemplatesForm({ initialTemplates }: { initialTemplates: TemplateItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState<TemplateItem[]>(initialTemplates)
  const [showAdd, setShowAdd] = useState(false)
  const [newTarget, setNewTarget] = useState<"TEACHER" | "HEADMASTER">("TEACHER")
  const [newCategory, setNewCategory] = useState("EXCELLENT")
  const [newText, setNewText] = useState("")
  const [loading, setLoading] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleItemChange = (index: number, field: keyof TemplateItem, value: string) => {
    const updated = [...items]
    ;(updated[index] as any)[field] = value
    setItems(updated)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newText.trim()) return
    setItems([
      ...items,
      {
        target: newTarget,
        category: newCategory.trim().toUpperCase(),
        text: newText.trim(),
      },
    ])
    setNewText("")
    setShowAdd(false)
  }

  const handleSave = async () => {
    setLoading(true)
    setSaveMsg(null)
    setErrorMsg(null)

    try {
      const supabase = createClient()
      const { data: ctx } = await supabase.from("school_current_context").select("school_id").limit(1).maybeSingle()
      const schoolId = ctx?.school_id ?? "6caa6780-29ba-4e94-93b4-5a450fc7ccbc"

      // Clear old & re-insert
      await supabase.from("remark_templates").delete().eq("school_id", schoolId)

      if (items.length > 0) {
        const rows = items.map((it) => ({
          school_id: schoolId,
          target: it.target,
          category: it.category,
          text: it.text,
        }))
        const { error } = await supabase.from("remark_templates").insert(rows)
        if (error) throw error
      }

      setSaveMsg("✓ Remark templates updated successfully!")
      router.refresh()
      setTimeout(() => setSaveMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save remark templates.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h2 className="font-bold text-slate-900 text-base">Standard Remark Comment Bank</h2>
          <p className="text-xs text-slate-500 mt-0.5">{items.length} templates configured</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          {showAdd ? "Cancel" : "+ Add Template"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-3">
          <h3 className="font-bold text-xs uppercase text-slate-700">Add New Template</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Target Role</label>
              <select
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value as any)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none"
              >
                <option value="TEACHER">TEACHER</option>
                <option value="HEADMASTER">HEADMASTER</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Performance Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none"
              >
                <option value="EXCELLENT">EXCELLENT</option>
                <option value="VERY_GOOD">VERY_GOOD</option>
                <option value="GOOD">GOOD</option>
                <option value="AVERAGE">AVERAGE</option>
                <option value="NEEDS_IMPROVEMENT">NEEDS_IMPROVEMENT</option>
                <option value="POOR">POOR</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Comment Text *</label>
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="e.g. Demonstrates outstanding leadership and consistency."
                required
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-1.5 rounded transition-colors"
            >
              Add to List
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={item.target}
                  onChange={(e) => handleItemChange(idx, "target", e.target.value)}
                  className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded uppercase tracking-wider focus:outline-none cursor-pointer"
                >
                  <option value="TEACHER">TEACHER</option>
                  <option value="HEADMASTER">HEADMASTER</option>
                </select>
                <input
                  type="text"
                  value={item.category}
                  onChange={(e) => handleItemChange(idx, "category", e.target.value.toUpperCase())}
                  className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase tracking-wider w-36 focus:outline-none border border-indigo-200"
                />
              </div>
              <textarea
                value={item.text}
                onChange={(e) => handleItemChange(idx, "text", e.target.value)}
                rows={2}
                className="w-full text-xs text-slate-800 italic bg-white border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="text-red-600 hover:text-red-800 text-sm font-bold p-1"
              title="Delete template"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2 border-t border-slate-200">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2.5 bg-slate-900 text-white font-semibold text-sm rounded-md hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? "Saving Templates…" : "Save All Templates"}
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
    </div>
  )
}
