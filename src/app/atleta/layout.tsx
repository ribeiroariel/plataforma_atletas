import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  IconeCalendario,
  IconeFeed,
  IconeFeedback,
  IconeGrafico,
  IconeGrid,
} from "@/components/layout/iconesNav";

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

  const itens = [
    { href: "/atleta", label: "Meus treinos", icon: IconeGrid, exato: true },
    { href: "/atleta/agenda", label: "Agenda", icon: IconeCalendario },
    { href: "/atleta/evolucao", label: "Evolução", icon: IconeGrafico },
    { href: "/feed", label: "Feed", icon: IconeFeed },
    { href: "/feedback", label: "Feedback", icon: IconeFeedback },
  ];

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <Sidebar
        variante="light"
        titulo="Atleta"
        nome={athlete?.nome ?? "Atleta"}
        avatarUrl={athlete?.avatar_url ?? null}
        itens={itens}
      />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
