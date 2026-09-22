import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { Search, Calendar, Users, BookOpen, Award, FileSpreadsheet, Settings } from 'lucide-react'

const cards = [
  { href: '/admin/academic/master-scoresheet', title: 'Master Score Sheet', desc: 'View full class score overview across all subjects.' },
  { href: '/admin/manage/students', title: 'Students Management', desc: 'Manage student records, assignments, and search.' },
  { href: '/admin/manage/classes', title: 'Manage Classes', desc: 'View and edit classes, class teachers, and rosters.' },
  { href: '/admin/manage/staff', title: 'Manage Staff', desc: 'View staff members, roles, and subject assignments.' },
  { href: '/admin/settings/calendar', title: 'School Calendar System', desc: 'Set vacation, reopening dates, and total school days.' },
  { href: '/admin/academic/reports', title: 'Academic Readiness', desc: 'Run readiness checks and report workflows.' },
  { href: '/admin/remarks', title: 'Remarks Engine', desc: 'Generate, edit and approve remarks.' },
  { href: '/admin/reports', title: 'Report Generation', desc: 'Create report snapshots and publishing outputs.' },
  { href: '/admin/reports/order-of-merit', title: 'Order of Merit', desc: 'View and export deterministic class ranking.' },
  { href: '/admin/settings', title: 'System Settings', desc: 'Configure grading schemas, remarks, and school details.' },
]

export default async function AdminDashboardPage() {
  const supabase = createServerClient()

  let studentCount = 0
  let staffCount = 0
  let classCount = 0
  let scoresheetsReady = 0
  let scoresheetsTotal = 0

  let ctx: { school_id: string | null; term_id: string | null } | null = null
  try {
    const ctxRes = await supabase
      .from('school_current_context')
      .select('school_id, term_id')
      .limit(1)
      .single()
    ctx = ctxRes.data as any
  } catch {
    ctx = null
  }

  const [{ count: sCount }, { count: stCount }, { count: cCount }] = await Promise.all([
    supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('classes')
      .select('*', { count: 'exact', head: true }),
  ])
  studentCount = sCount ?? 0
  staffCount = stCount ?? 0
  classCount = cCount ?? 0

  if (ctx?.term_id) {
    const allSubjectClasses = await supabase
      .from('subjects')
      .select('id, class_id')
    const allKeys = new Set<string>()
    for (const row of allSubjectClasses.data ?? []) {
      const r = row as any
      if (r.class_id) allKeys.add(`${r.id}::${r.class_id}`)
    }
    scoresheetsTotal = allKeys.size

    const submitted = await supabase
      .from('scoresheet_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('term_id', ctx.term_id)
      .in('status', ['SUBMITTED', 'LOCKED'])
    scoresheetsReady = submitted.count ?? 0
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">Overview & Management Portal</p>
        </div>

        {/* Quick Student Search Bar */}
        <form action="/admin/manage/students" method="GET" className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-1.5 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            name="search"
            placeholder="Search student by name or ID..."
            className="text-sm bg-transparent border-none outline-none w-48 md:w-64"
          />
          <button type="submit" className="text-xs bg-primary text-white px-2.5 py-1 rounded font-medium hover:bg-primary-dark">
            Search
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-border rounded-lg p-4">
          <div className="text-xs text-text-muted font-medium">Active Students</div>
          <div className="text-3xl font-bold mt-1 text-primary">{studentCount}</div>
        </div>
        <div className="bg-white border border-border rounded-lg p-4">
          <div className="text-xs text-text-muted font-medium">Active Staff</div>
          <div className="text-3xl font-bold mt-1 text-primary">{staffCount}</div>
        </div>
        <div className="bg-white border border-border rounded-lg p-4">
          <div className="text-xs text-text-muted font-medium">Classes</div>
          <div className="text-3xl font-bold mt-1 text-primary">{classCount}</div>
        </div>
        <div className="bg-white border border-border rounded-lg p-4">
          <div className="text-xs text-text-muted font-medium">Scoresheets Ready</div>
          <div className="text-3xl font-bold mt-1 text-primary">
            {scoresheetsReady}
            <span className="text-lg font-normal text-text-muted">/{scoresheetsTotal || '—'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-lg border border-border p-5 bg-white hover:border-primary hover:shadow-md transition-all">
            <h2 className="font-semibold text-text text-base">{c.title}</h2>
            <p className="text-sm text-text-muted mt-1.5 leading-relaxed">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

