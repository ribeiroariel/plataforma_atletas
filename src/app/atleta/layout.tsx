import { createClient } from "@/lib/supabase/server";
import { getPapel } from "@/lib/supabase/profile";
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

  // Só treinador chega aqui sem ser atleta "puro" — e só se tiver os dois cadastros.
  const papel = user ? await getPapel(supabase, user.id) : null;

  return (
    <AppShell alternar={papel === "coach"} papel="athlete" nome={athlete?.nome ?? "Atleta"} avatarUrl={athlete?.avatar_url ?? null}>
      {children}
    </AppShell>
  );
}
