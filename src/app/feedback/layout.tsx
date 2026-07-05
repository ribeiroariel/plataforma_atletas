import { createClient } from "@/lib/supabase/server";
import { getPapel } from "@/lib/supabase/profile";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  IconeCalendario,
  IconeComparar,
  IconeFeed,
  IconeFeedback,
  IconeGrafico,
  IconeGrid,
  IconePessoas,
} from "@/components/layout/iconesNav";

export default async function FeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const papel = user ? await getPapel(supabase, user.id) : null;
  const ehCoach = papel === "coach";

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, avatar_url")
    .eq("user_id", user?.id ?? "")
    .single();

  const itens = ehCoach
    ? [
        { href: "/treinador", label: "Meus atletas", icon: IconePessoas, exato: true },
        { href: "/treinador/comparar", label: "Comparar", icon: IconeComparar },
        { href: "/feed", label: "Feed", icon: IconeFeed },
        { href: "/feedback", label: "Feedback", icon: IconeFeedback },
      ]
    : [
        { href: "/atleta", label: "Meus treinos", icon: IconeGrid, exato: true },
        { href: "/atleta/agenda", label: "Agenda", icon: IconeCalendario },
        { href: "/atleta/evolucao", label: "Evolução", icon: IconeGrafico },
        { href: "/feed", label: "Feed", icon: IconeFeed },
        { href: "/feedback", label: "Feedback", icon: IconeFeedback },
      ];

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <Sidebar
        variante={ehCoach ? "dark" : "light"}
        titulo={ehCoach ? "Treinador" : "Atleta"}
        nome={profile?.nome ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
        itens={itens}
      />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
