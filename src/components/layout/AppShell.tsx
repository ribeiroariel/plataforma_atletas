import { Sidebar, type ItemNav } from "./Sidebar";
import {
  IconeCalendario,
  IconeComparar,
  IconeFeed,
  IconeFeedback,
  IconeGrafico,
  IconeHoje,
  IconePessoas,
} from "./iconesNav";

const ITENS_ATLETA: ItemNav[] = [
  { href: "/atleta", label: "Hoje", icon: IconeHoje, exato: true, tambem: ["/atleta/treinos"] },
  { href: "/atleta/agenda", label: "Agenda", icon: IconeCalendario },
  { href: "/atleta/evolucao", label: "Evolução", icon: IconeGrafico },
  { href: "/feed", label: "Feed", icon: IconeFeed },
  { href: "/feedback", label: "Ideias", icon: IconeFeedback },
];

const ITENS_TREINADOR: ItemNav[] = [
  { href: "/treinador", label: "Atletas", icon: IconePessoas, exato: true, tambem: ["/treinador/atletas"] },
  { href: "/treinador/comparar", label: "Comparar", icon: IconeComparar },
  { href: "/feed", label: "Feed", icon: IconeFeed },
  { href: "/feedback", label: "Ideias", icon: IconeFeedback },
];

// Moldura comum das áreas logadas: menu lateral no computador, barra de abas
// embaixo no celular (o polegar alcança, e é onde o atleta está no treino).
export function AppShell({
  papel,
  nome,
  avatarUrl,
  children,
}: {
  papel: "athlete" | "coach";
  nome: string;
  avatarUrl: string | null;
  children: React.ReactNode;
}) {
  const ehCoach = papel === "coach";
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <Sidebar
        titulo={ehCoach ? "Treinador" : "Atleta"}
        nome={nome}
        avatarUrl={avatarUrl}
        itens={ehCoach ? ITENS_TREINADOR : ITENS_ATLETA}
      />
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>
    </div>
  );
}
