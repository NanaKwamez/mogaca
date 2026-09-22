import Link from "next/link"
import { MobileBottomBar } from "./MobileBottomBar"
import { Home, BookOpen, Users, Settings, LogOut, GraduationCap, Calendar, FileSpreadsheet } from "lucide-react"
import { SignOutButton } from "./SignOutButton"

export function AdminNav({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-nav text-text-inv h-full shrink-0 overflow-y-auto">
        <div className="p-6 flex items-center gap-3">
          <GraduationCap className="w-7 h-7 text-primary-light" />
          <div>
            <h1 className="text-xl font-display font-bold text-white">MOGGACA</h1>
            <p className="text-xs text-gray-300">Admin Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-white font-medium">
            <Home className="w-5 h-5 outline-none" /> Dashboard
          </Link>
          <Link href="/admin/manage/students" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-white font-medium">
            <Users className="w-5 h-5 outline-none" /> Students
          </Link>
          <Link href="/admin/academic/master-scoresheet" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-white font-medium">
            <FileSpreadsheet className="w-5 h-5 outline-none" /> Master Scoresheet
          </Link>
          <Link href="/admin/academic" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-white font-medium">
            <BookOpen className="w-5 h-5 outline-none" /> Academic
          </Link>
          <Link href="/admin/manage" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-white font-medium">
            <Users className="w-5 h-5 outline-none" /> Manage All
          </Link>
          <Link href="/admin/settings/calendar" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-white font-medium">
            <Calendar className="w-5 h-5 outline-none" /> School Calendar
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-primary-dark transition-colors text-white font-medium">
            <Settings className="w-5 h-5 outline-none" /> Settings
          </Link>
        </nav>
        <div className="px-4 pb-6 pt-4 mt-auto border-t border-white/10">
          <SignOutButton />
        </div>
      </aside>
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header Bar for easy Sign Out & Navigation Context */}
        <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between shadow-sm shrink-0 z-30">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary md:hidden" />
            <span className="font-bold text-text text-base">MOGGACA Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <SignOutButton variant="header" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full pb-16 md:pb-0">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </div>
        <MobileBottomBar />
      </main>
    </div>
  )
}

