import { createClient } from "@/lib/supabase/server";
import { getPapel } from "@/lib/supabase/profile";
import { AppShell } from "@/components/layout/AppShell";

export default async function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const papel = user ? await getPapel(supabase, user.id) : null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, avatar_url")
    .eq("user_id", user?.id ?? "")
    .single();

  return (
    <AppShell
      papel={papel === "coach" ? "coach" : "athlete"}
      nome={profile?.nome ?? ""}
      avatarUrl={profile?.avatar_url ?? null}
    >
      {children}
    </AppShell>
  );
}
