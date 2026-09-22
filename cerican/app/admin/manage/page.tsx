import Link from 'next/link'

const cards = [
  { href: '/admin/manage/classes', title: 'Classes', desc: 'Manage class rosters, streams, and assignments.' },
  { href: '/admin/manage/students', title: 'Students', desc: 'Manage student records and assignments.' },
  { href: '/admin/manage/staff', title: 'Staff', desc: 'Manage staff records, roles, and permissions.' },
]

export default function ManagePage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Manage</h1>
      <p className="text-sm text-gray-600 mb-6">Manage classes, students, and staff records.</p>
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
