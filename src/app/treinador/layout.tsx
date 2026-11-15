import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";

export default async function TreinadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, avatar_url")
    .eq("user_id", user?.id)
    .single();

  return (
    <AppShell papel="coach" nome={profile?.nome ?? "Treinador"} avatarUrl={profile?.avatar_url ?? null}>
      {children}
    </AppShell>
  );
}
