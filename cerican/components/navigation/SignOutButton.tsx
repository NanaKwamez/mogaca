'use client'

import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export function SignOutButton({ variant = 'sidebar' }: { variant?: 'sidebar' | 'header' }) {
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (variant === 'header') {
    return (
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-text font-medium text-xs md:text-sm transition-colors"
      >
        <LogOut className="w-4 h-4 text-red-600 outline-none" />
        <span>Sign Out</span>
      </button>
    )
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex w-full items-center gap-3 px-3 py-2 rounded-md hover:bg-primary-dark text-white font-medium transition-colors text-left"
    >
      <LogOut className="w-5 h-5 outline-none text-red-300" />
      Sign Out
    </button>
  )
}

