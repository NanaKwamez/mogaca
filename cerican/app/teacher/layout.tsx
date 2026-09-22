import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { TeacherNav } from "@/components/navigation/TeacherNav";
import { getUserRoleAndProfile, roleToPortalRoot } from "@/lib/auth/role";

export default async function TeacherLayout({
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

  if (role !== "TEACHER") {
    redirect(roleToPortalRoot(role));
  }

  return <TeacherNav>{children}</TeacherNav>;
}
