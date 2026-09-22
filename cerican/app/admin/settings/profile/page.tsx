import { createServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { SchoolProfileForm } from "./SchoolProfileForm"

export default async function SchoolProfileSettingsPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: school } = await supabase
    .from("schools")
    .select("*")
    .limit(1)
    .maybeSingle()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/admin/settings" className="text-sm text-primary hover:underline mb-2 inline-block">
          ← Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">School Profile</h1>
        <p className="text-xs text-slate-600 mt-1">Manage official institution details, contact information, and branding motto.</p>
      </div>

      <SchoolProfileForm initialSchool={school} />
    </div>
  )
}
