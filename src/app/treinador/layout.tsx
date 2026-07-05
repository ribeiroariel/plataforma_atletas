import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { IconeComparar, IconeFeed, IconeFeedback, IconePessoas } from "@/components/layout/iconesNav";

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

  const itens = [
    { href: "/treinador", label: "Meus atletas", icon: IconePessoas, exato: true },
    { href: "/treinador/comparar", label: "Comparar", icon: IconeComparar },
    { href: "/feed", label: "Feed", icon: IconeFeed },
    { href: "/feedback", label: "Feedback", icon: IconeFeedback },
  ];

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <Sidebar
        variante="dark"
        titulo="Treinador"
        nome={profile?.nome ?? "Treinador"}
        avatarUrl={profile?.avatar_url ?? null}
        itens={itens}
      />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
