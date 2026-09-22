import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getUserRoleAndProfile, roleToPortalRoot } from "@/lib/auth/role";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { role } = await getUserRoleAndProfile(session.user.id, session.user.email);

  if (role === null) {
    redirect("/login?error=no_profile");
  }

  if (role !== "STUDENT") {
    redirect(roleToPortalRoot(role));
  }

  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 overflow-y-auto w-full pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
