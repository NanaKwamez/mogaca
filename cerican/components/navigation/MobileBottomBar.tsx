import Link from "next/link"
import { Home, BookOpen, Users, Settings, Menu } from "lucide-react"

export function MobileBottomBar() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around bg-nav py-2 border-t border-border z-40">
      <Link href="/admin" className="flex flex-col items-center p-2 text-text-inv hover:text-primary-light">
        <Home className="w-6 h-6" />
        <span className="text-[10px] mt-1 font-medium">Home</span>
      </Link>
      <Link href="/admin/academic" className="flex flex-col items-center p-2 text-text-inv hover:text-primary-light">
        <BookOpen className="w-6 h-6" />
        <span className="text-[10px] mt-1 font-medium">Academic</span>
      </Link>
      <Link href="/admin/manage" className="flex flex-col items-center p-2 text-text-inv hover:text-primary-light">
        <Users className="w-6 h-6" />
        <span className="text-[10px] mt-1 font-medium">Manage</span>
      </Link>
      <Link href="/admin/settings" className="flex flex-col items-center p-2 text-text-inv hover:text-primary-light">
        <Settings className="w-6 h-6" />
        <span className="text-[10px] mt-1 font-medium">Settings</span>
      </Link>
      <Link href="/admin/more" className="flex flex-col items-center p-2 text-text-inv hover:text-primary-light">
        <Menu className="w-6 h-6" />
        <span className="text-[10px] mt-1 font-medium">More</span>
      </Link>
    </nav>
  )
}
