import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerClient } from "@/lib/supabase/server"

export default async function ParentHomePage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: guardian } = await supabase
    .from("guardians")
    .select("id, full_name")
    .eq("user_id", session.user.id)
    .maybeSingle()

  if (!guardian) redirect("/login?error=no_profile")

  const { data: links } = await supabase
    .from("student_guardians")
    .select("students(id, surname, first_name, student_id_code, classes(name), is_active)")
    .eq("guardian_id", (guardian as any).id)

  const children = (links ?? []).map((l: any) => l.students).filter(Boolean)

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">
          Welcome, {(guardian as any).full_name}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Parent / Guardian Portal · {children.length} linked child{children.length !== 1 ? "ren" : ""}
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children.length === 0 ? (
          <div className="bg-white border border-border rounded-lg p-6 md:col-span-2 text-center text-text-muted">
            No children are currently linked to your account. Please contact the school administration.
          </div>
        ) : (
          children.map((c: any) => (
            <div key={c.id} className="bg-white border border-border rounded-lg p-5">
              <p className="font-semibold text-lg">
                {c.surname}, {c.first_name}
              </p>
              <p className="text-xs font-mono text-text-muted mt-0.5">{c.student_id_code}</p>
              <p className="text-sm text-text-muted mt-1">
                Class: {c.classes?.name ?? "—"} · Status: {c.is_active ? "Active" : "Inactive"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="#"
                  className="text-sm text-primary hover:underline"
                  onClick={(e) => e.preventDefault()}
                >
                  Reports (coming soon)
                </Link>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  )
}
