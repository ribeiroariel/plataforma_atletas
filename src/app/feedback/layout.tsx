import { createClient } from "@/lib/supabase/server";
import { resolverVisao } from "@/lib/supabase/visao";
import { AppShell } from "@/components/layout/AppShell";

export default async function FeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { visao, duplo } = await resolverVisao(supabase, user?.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, avatar_url")
    .eq("user_id", user?.id ?? "")
    .single();

  return (
    <AppShell
      papel={visao}
      alternar={duplo}
      nome={profile?.nome ?? ""}
      avatarUrl={profile?.avatar_url ?? null}
    >
      {children}
    </AppShell>
  );
}
