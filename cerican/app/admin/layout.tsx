import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/navigation/AdminNav";
import { getUserRoleAndProfile, roleToPortalRoot } from "@/lib/auth/role";

export default async function AdminLayout({
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

  if (role !== "ADMIN") {
    redirect(roleToPortalRoot(role));
  }

  return <AdminNav>{children}</AdminNav>;
}
