import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerClient } from "@/lib/supabase/server"

export default async function StudentHomePage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: student } = await supabase
    .from("students")
    .select("id, surname, first_name, student_id_code, classes(name)")
    .eq("user_id", session.user.id)
    .maybeSingle()

  if (!student) redirect("/login?error=no_profile")

  const { data: reports } = await supabase
    .from("student_reports")
    .select("id, status, terms(id, term_number, academic_years(label))")
    .eq("student_id", (student as any).id)
    .eq("status", "PUBLISHED")
    .order("generated_at", { ascending: false })

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">
          Welcome, {(student as any).first_name} 👋
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {(student as any).classes?.name ?? "—"} · Student ID: {(student as any).student_id_code}
        </p>
      </header>

      <section className="bg-white border border-border rounded-lg p-5">
        <h2 className="font-semibold mb-3">Published Reports</h2>
        {(reports ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">
            No published reports available yet. Check back later this term.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {(reports ?? []).map((r: any) => (
              <li key={r.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {r.terms?.academic_years?.label ?? "Academic Year"} · Term {r.terms?.term_number ?? "?"}
                  </p>
                  <p className="text-xs text-text-muted">{r.status}</p>
                </div>
                <Link href={`/student/reports/${r.id}`} className="text-sm text-primary hover:underline">
                  View Report →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
