"use client"

import React, { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface SchoolData {
  id?: string
  name?: string | null
  motto?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
}

export function SchoolProfileForm({ initialSchool }: { initialSchool: SchoolData | null }) {
  const router = useRouter()
  const [name, setName] = useState(initialSchool?.name ?? "MORNING GLORY ACADEMY")
  const [motto, setMotto] = useState(initialSchool?.motto ?? "GOD IS OUR LIGHT")
  const [email, setEmail] = useState(initialSchool?.email ?? "info@mogasco.edu.gh")
  const [phone, setPhone] = useState(initialSchool?.phone ?? "0555551700 / 0244894340")
  const [address, setAddress] = useState(initialSchool?.address ?? "(SCC MEKOBE LANE)")
  const [loading, setLoading] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaveMsg(null)
    setErrorMsg(null)

    try {
      const supabase = createClient()
      const { data: existing } = await supabase.from("schools").select("id").limit(1).maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from("schools")
          .update({
            name: name.trim(),
            motto: motto.trim(),
            email: email.trim(),
            phone: phone.trim(),
            address: address.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("schools").insert({
          name: name.trim(),
          motto: motto.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
        })

        if (error) throw error
      }

      setSaveMsg("✓ School profile updated successfully!")
      router.refresh()
      setTimeout(() => setSaveMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update school profile.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
      <h2 className="font-bold text-slate-900 text-base border-b border-slate-200 pb-2">Institution Information</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">School Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full h-[42px] px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Motto / Tagline</label>
          <input
            type="text"
            value={motto}
            onChange={(e) => setMotto(e.target.value)}
            className="w-full h-[42px] px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Official Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-[42px] px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Official Phone Numbers</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full h-[42px] px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-slate-700 block mb-1">Postal / Campus Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full h-[42px] px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-200">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-slate-900 text-white font-semibold text-sm rounded-md hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? "Saving Profile…" : "Save School Profile"}
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
