'use client'

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/Button"

const ADMIN_STAFF_TYPES = ['Admin', 'Head Teacher', 'Accountant', 'Bursar', 'Administrator', 'Headteacher']

export default function TeacherAccountPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<{
    surname: string; first_name: string; other_names: string | null;
    staff_type: string; email: string | null; staff_id_code: string | null;
  } | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      const { data: staffRow } = await supabase
        .from("staff")
        .select("surname, first_name, other_names, staff_type, email, staff_id_code")
        .eq("user_id", user.id)
        .maybeSingle()
      setProfile(staffRow as any)
    }
    load()
  }, [router, supabase])

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">My Account</h1>
        <p className="text-sm text-text-muted mt-1">Teacher profile and sign-out options.</p>
      </header>

      <section className="bg-white border border-border rounded-lg p-6 space-y-3">
        <h2 className="font-semibold text-lg">Profile</h2>
        {profile ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
            <div>
              <dt className="text-text-muted">Full name</dt>
              <dd className="font-semibold">
                {profile.surname}, {profile.first_name}
                {profile.other_names ? ` ${profile.other_names}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Staff ID</dt>
              <dd className="font-mono">{profile.staff_id_code ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Role</dt>
              <dd>{profile.staff_type ?? "Teacher"}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Email</dt>
              <dd>{profile.email ?? "—"}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-text-muted">Loading profile…</p>
        )}
      </section>

      <section className="bg-white border border-border rounded-lg p-6">
        <h2 className="font-semibold text-lg mb-3">Credentials</h2>
        <p className="text-sm text-text-muted mb-4">
          Your email and passcode are shared with the school pay system.
          To reset your password, please contact the school administrator.
        </p>
        <div className="text-xs text-text-muted">
          Role note: {profile && ADMIN_STAFF_TYPES.includes(profile.staff_type)
            ? "You have administrator access."
            : "Standard teacher access."}
        </div>
      </section>

      <div className="flex justify-end">
        <Button variant="danger" onClick={handleSignOut} disabled={signingOut}>
          {signingOut ? "Signing out…" : "Sign Out"}
        </Button>
      </div>
    </div>
  )
}
