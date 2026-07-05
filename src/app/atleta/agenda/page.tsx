import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconeAcademia, IconePista } from "@/components/icons/IconesTreino";

const ICONE_POR_MODO = {
  semana: IconeAcademia,
  blocos: IconePista,
  generico: IconeAcademia,
} as const;

const ROTULO_MODO: Record<string, string> = {
  semana: "Mesociclo semanal",
  blocos: "Sessão de pista",
  generico: "Plano de treino",
};

function mesAno(iso: string) {
  const [ano, mes] = iso.split("-");
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${meses[Number(mes) - 1]} de ${ano}`;
}

function tituloLegivel(nome: string) {
  return nome.replace(/\.xlsx$/i, "").replace(/[_-]+/g, " ").trim();
}

export default async function AgendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id")
    .eq("user_id", user?.id)
    .single();

  const { data: planos } = await supabase
    .from("training_plans")
    .select("id, nome_arquivo, data_criacao, modo_treino")
    .eq("athlete_id", athlete?.id ?? "")
    .order("data_criacao", { ascending: false });

  // agrupa por mês/ano de criação (visão de ciclo)
  const grupos = new Map<string, typeof planos>();
  (planos ?? []).forEach((p) => {
    const chave = mesAno(p.data_criacao);
    const lista = grupos.get(chave) ?? [];
    lista.push(p);
    grupos.set(chave, lista);
  });

  return (
    <div className="flex flex-1 flex-col gap-6 bg-lane-chalk px-6 py-10">
      <div>
        <h1 className="font-display text-2xl font-bold text-track-night">Agenda</h1>
        <p className="text-sm text-track-fog">
          Seus planos de treino ao longo do tempo — do mais recente para o mais antigo.
        </p>
      </div>

      {!planos || planos.length === 0 ? (
        <p className="rounded-[var(--radius-badge)] border border-track-fog/25 bg-white px-4 py-6 text-center text-sm text-track-fog">
          Nenhum plano ainda. Quando seu treinador subir um treino, ele aparece aqui.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {[...grupos.entries()].map(([mes, lista]) => (
            <section key={mes} className="flex flex-col gap-2">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-deep-lane">
                {mes}
              </h2>
              <div className="flex flex-col gap-2">
                {(lista ?? []).map((p) => {
                  const Icone =
                    ICONE_POR_MODO[p.modo_treino as keyof typeof ICONE_POR_MODO] ?? IconeAcademia;
                  const dia = p.data_criacao.split("-")[2];
                  return (
                    <Link
                      key={p.id}
                      href={`/atleta/treinos/${p.id}`}
                      className="flex items-center gap-4 rounded-[var(--radius-badge)] border border-track-fog/25 bg-white px-4 py-3 hover:border-stadium-blue/40"
                    >
                      <span className="tabular-data w-6 shrink-0 text-center font-display text-lg font-bold text-deep-lane">
                        {dia}
                      </span>
                      <Icone className="h-5 w-5 shrink-0 text-stadium-blue" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-track-night">
                          {tituloLegivel(p.nome_arquivo)}
                        </p>
                        <p className="text-xs text-track-fog">
                          {ROTULO_MODO[p.modo_treino ?? "generico"] ?? "Plano de treino"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
