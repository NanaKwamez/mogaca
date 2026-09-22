import Link from 'next/link'

const cards = [
  { href: '/admin/registration/student', title: 'Register Student', desc: 'Add a new student to the school registry.' },
  { href: '/admin/registration/staff', title: 'Register Staff', desc: 'Add a new staff member to the payroll.' },
]

export default function RegistrationPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Registration</h1>
      <p className="text-sm text-gray-600 mb-6">Register new students and staff members.</p>
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
