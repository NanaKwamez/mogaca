import Link from 'next/link'

const cards = [
  { href: '/admin/settings/calendar', title: 'School Calendar', desc: 'Set vacation/reopening dates and total school days for Preschool, Primary, and JHS.' },
  { href: '/admin/settings/reports', title: 'Report Settings', desc: 'Configure report display and publishing options.' },
  { href: '/admin/settings/grading', title: 'Grading Schema', desc: 'Define grading bands and score thresholds.' },
  { href: '/admin/settings/remark-templates', title: 'Remark Templates', desc: 'Create reusable comment templates for remarks.' },
  { href: '/admin/settings/profile', title: 'School Profile', desc: 'Update school name, logo, and contact details.' },
]

export default function SettingsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-sm text-gray-600 mb-6">Configure report display, grading, and remark settings.</p>
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
