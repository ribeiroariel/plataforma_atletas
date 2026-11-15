import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";

export default async function AtletaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: athlete } = await supabase
    .from("athletes")
    .select("nome, avatar_url")
    .eq("user_id", user?.id)
    .single();

  return (
    <AppShell papel="athlete" nome={athlete?.nome ?? "Atleta"} avatarUrl={athlete?.avatar_url ?? null}>
      {children}
    </AppShell>
  );
}
