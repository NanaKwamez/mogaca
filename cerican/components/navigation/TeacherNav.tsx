'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Home, FileCheck, Users, User, LogOut, GraduationCap } from "lucide-react"

export function TeacherNav({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden md:flex flex-col w-64 bg-nav text-text-inv h-full shrink-0 overflow-y-auto">
        <div className="p-6 flex items-center gap-3">
          <GraduationCap className="w-7 h-7 text-primary-light" />
          <div>
            <h1 className="text-xl font-display font-bold text-white">MOGGACA</h1>
            <p className="text-xs text-gray-300">Teacher Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/teacher" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-primary-dark transition-colors">
            <Home className="w-5 h-5 outline-none" /> Dashboard
          </Link>
          <Link href="/teacher/scoresheets" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-primary-dark transition-colors">
            <FileCheck className="w-5 h-5 outline-none" /> Scoresheets
          </Link>
          <Link href="/teacher/master-sheet" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-primary-dark transition-colors">
            <GraduationCap className="w-5 h-5 outline-none" /> Master Sheet
          </Link>
          <Link href="/teacher/my-class" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-primary-dark transition-colors">
            <Users className="w-5 h-5 outline-none" /> My Class
          </Link>
          <Link href="/teacher/account" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-primary-dark transition-colors">
            <User className="w-5 h-5 outline-none" /> My Account
          </Link>
        </nav>
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-left"
          >
            <LogOut className="w-5 h-5 outline-none" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between shadow-sm shrink-0 z-30">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary md:hidden" />
            <span className="font-bold text-text text-base">MOGGACA Teacher</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-text font-medium text-xs md:text-sm transition-colors"
            >
              <LogOut className="w-4 h-4 text-red-600 outline-none" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full pb-16 md:pb-0">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around bg-nav py-2 border-t border-border z-40">
          <Link href="/teacher" className="flex flex-col items-center p-2 text-text-inv hover:text-primary-light">
            <Home className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-medium">Home</span>
          </Link>
          <Link href="/teacher/scoresheets" className="flex flex-col items-center p-2 text-text-inv hover:text-primary-light">
            <FileCheck className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-medium">Scores</span>
          </Link>
          <Link href="/teacher/my-class" className="flex flex-col items-center p-2 text-text-inv hover:text-primary-light">
            <Users className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-medium">Class</span>
          </Link>
          <Link href="/teacher/account" className="flex flex-col items-center p-2 text-text-inv hover:text-primary-light">
            <User className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-medium">Account</span>
          </Link>
        </nav>
      </main>
    </div>
  )
}
