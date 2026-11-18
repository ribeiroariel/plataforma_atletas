import { Sidebar, type ItemNav } from "./Sidebar";
import {
  IconeCalendario,
  IconeComparar,
  IconeFeedback,
  IconeFerramentas,
  IconeGrafico,
  IconeHoje,
  IconePessoas,
  IconeTrofeu,
} from "./iconesNav";

const ITENS_ATLETA: ItemNav[] = [
  { href: "/atleta", label: "Hoje", icon: IconeHoje, exato: true, tambem: ["/atleta/treinos"] },
  { href: "/atleta/agenda", label: "Agenda", icon: IconeCalendario },
  { href: "/atleta/evolucao", label: "Evolução", icon: IconeGrafico, tambem: ["/atleta/exercicio"] },
  { href: "/atleta/provas", label: "Provas", icon: IconeTrofeu },
  { href: "/atleta/ferramentas", label: "Contas", icon: IconeFerramentas },
  { href: "/feedback", label: "Ideias", icon: IconeFeedback, soTopo: true },
];

const ITENS_TREINADOR: ItemNav[] = [
  { href: "/treinador", label: "Atletas", icon: IconePessoas, exato: true, tambem: ["/treinador/atletas"] },
  { href: "/treinador/comparar", label: "Comparar", icon: IconeComparar },
  { href: "/feedback", label: "Ideias", icon: IconeFeedback },
];

// Moldura comum das áreas logadas: menu lateral no computador, barra de abas
// embaixo no celular (o polegar alcança, e é onde o atleta está no treino).
export function AppShell({
  papel,
  nome,
  avatarUrl,
  alternar = false,
  children,
}: {
  papel: "athlete" | "coach";
  nome: string;
  avatarUrl: string | null;
  // Conta com os dois cadastros: mostra o atalho pra trocar de lado.
  alternar?: boolean;
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
        troca={alternar ? (ehCoach ? { href: "/atleta", label: "Ver como atleta" } : { href: "/treinador", label: "Voltar ao painel" }) : undefined}
      />
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>
    </div>
  );
}
