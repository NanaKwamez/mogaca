'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

const ADMIN_STAFF_TYPES = ['Admin', 'Head Teacher', 'Accountant', 'Bursar', 'Administrator', 'Headteacher']

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const queryError = searchParams.get('error')

  function clearQueryErrorIfNeeded() {
    if (queryError) {
      router.replace('/login')
    }
  }

  async function resolvePortalRoot(userId: string, userEmail?: string | null): Promise<string> {
    const supabase = createClient()

    let { data: staffRow, error: staffErr } = await supabase
      .from('staff')
      .select('staff_type')
      .eq('user_id', userId)
      .maybeSingle()
    if (!staffErr && !staffRow && userEmail) {
      const fallbackStaff = await supabase
        .from('staff')
        .select('staff_type')
        .ilike('email', userEmail)
        .maybeSingle()
      if (!fallbackStaff.error && fallbackStaff.data) {
        staffRow = fallbackStaff.data
      }
    }
    if (!staffErr && staffRow) {
      const type = (staffRow.staff_type ?? '').trim()
      if (ADMIN_STAFF_TYPES.includes(type)) return '/admin'
      return '/teacher'
    }

    const { data: studentRow, error: studentErr } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (!studentErr && studentRow) return '/student'

    let { data: guardianRow, error: guardianErr } = await supabase
      .from('guardians')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (!guardianErr && !guardianRow && userEmail) {
      const fallbackGuardian = await supabase
        .from('guardians')
        .select('id')
        .ilike('email', userEmail)
        .maybeSingle()
      if (!fallbackGuardian.error && fallbackGuardian.data) {
        guardianRow = fallbackGuardian.data
      }
    }
    if (!guardianErr && guardianRow) return '/parent'

    const { data: upRow, error: upErr } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    if (!upErr && upRow) {
      const upRole = String((upRow as any).role ?? '').toLowerCase()
      if (upRole === 'proprietress' || upRole === 'headmaster' || upRole === 'accountant' || upRole === 'bursar') return '/admin'
      if (upRole === 'teacher') return '/teacher'
    }

    return '/login?error=no_profile'
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: signInError, data: { user } } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      if (!user) throw new Error('No user returned after sign-in')
      const root = await resolvePortalRoot(user.id, user.email)
      router.push(root)
      router.refresh()
    } catch (err: any) {
      setError(err.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  function queryErrorText(code: string | null) {
    if (!code) return null
    if (code === 'no_profile') return 'Your account does not have a matching staff/student/guardian record. Please contact the administrator.'
    if (code === 'unauthorized') return 'You are not authorized to access that page.'
    return null
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-lg border bg-white p-6 space-y-4">
        <h1 className="text-2xl font-bold">MOGGACA Login</h1>
        <p className="text-sm text-gray-600">Sign in to continue.</p>
        <input
          className="w-full border rounded p-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            clearQueryErrorIfNeeded()
            setEmail(e.target.value)
          }}
          required
        />
        <input
          className="w-full border rounded p-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            clearQueryErrorIfNeeded()
            setPassword(e.target.value)
          }}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {queryErrorText(queryError) && !error && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">
            {queryErrorText(queryError)}
          </p>
        )}
        <button disabled={loading} className="w-full bg-blue-600 text-white rounded p-2 disabled:opacity-60">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center bg-gray-50 p-4"><div className="w-full max-w-md rounded-lg border bg-white p-6 text-sm text-gray-500">Loading…</div></main>}>
      <LoginContent />
    </Suspense>
  )
}
