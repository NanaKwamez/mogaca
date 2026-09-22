import Link from 'next/link'

const cards = [
  { href: '/admin/registration', title: 'Registration', desc: 'Register new students and staff members.' },
  { href: '/admin/remarks', title: 'Remarks Engine', desc: 'Generate, edit and approve remarks.' },
  { href: '/admin/reports/readiness', title: 'Report Readiness', desc: 'Run readiness checks and report workflows.' },
  { href: '/admin/settings', title: 'Settings', desc: 'Configure report display, grading, and remark settings.' },
  { href: '/admin/reports/preview', title: 'Reports Preview', desc: 'Preview reports before publishing.' },
  { href: '/admin/academic/reports', title: 'Academic Reports', desc: 'Access and manage academic reports.' },
]

export default function MorePage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">More</h1>
      <p className="text-sm text-gray-600 mb-6">Additional administration modules.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="rounded border p-4 bg-white hover:bg-gray-50 transition-colors">
            <h2 className="font-semibold">{c.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
