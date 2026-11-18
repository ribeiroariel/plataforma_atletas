import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTreino } from "@/lib/planilha/parseTreino";
import { gruposDaSemana, gruposDosBlocos, sessoesTreinaveis, type GrupoTela } from "@/lib/treino/montarSessoes";
import { segundaDaSemana, somarDias } from "@/lib/datas";

export type PlanoResumo = {
  id: string;
  athlete_id: string;
  nome_arquivo: string;
  arquivo_url: string;
  data_criacao: string;
  data_inicio: string | null;
  modo_treino: string | null;
  numero_semanas: number | null;
};

export type EstadoDia = "feito" | "parcial" | "perdido" | "planejado" | "descanso" | "vazio";

export type DiaResumo = {
  data: string;
  rotuloCurto: string;
  titulo: string;
  estado: EstadoDia;
  sessionKey?: string;
};

export type Alerta = {
  tipo: "mesociclo" | "inativo" | "atrasado" | "sem-plano" | "sobrecarga";
  texto: string;
  grave: boolean;
};

export type Recado = { id: string; athleteId: string; planoId: string; texto: string; data: string };

export type ResumoAtleta = {
  id: string;
  nome: string;
  avatarUrl: string | null;
  planos: PlanoResumo[];
  ativo: PlanoResumo | null;
  grupos: GrupoTela[] | null;
  semana: DiaResumo[];
  planejadosSemana: number;
  feitosSemana: number;
  // Treinos da semana que já deveriam ter sido feitos (dia já passou) e não foram.
  atrasadosSemana: number;
  feitosPlano: number;
  totalPlano: number;
  // Dias que faltam pro mesociclo acabar (negativo = já acabou).
  diasRestantes: number | null;
  ultimaAtividade: string | null;
  diasSemAtividade: number | null;
  kgSemana: number;
  kmSemana: number;
  // Média do esforço (1–10) nos últimos treinos com esforço informado.
  esforcoRecente: number | null;
  alertas: Alerta[];
};

function diasEntre(deIso: string, ateIso: string): number {
  return Math.round((new Date(`${ateIso}T00:00:00Z`).getTime() - new Date(`${deIso}T00:00:00Z`).getTime()) / 86_400_000);
}

// O plano "da vez": o mesociclo cujo período cobre hoje; na falta, o mais
// recente que foi enviado. (planos já vêm do mais novo pro mais antigo.)
export function escolherPlanoAtivo<P extends Pick<PlanoResumo, "modo_treino" | "numero_semanas" | "data_inicio" | "data_criacao">>(
  planos: P[],
  hoje: string,
): P | null {
  const emCurso = planos.find((p) => {
    if (p.modo_treino !== "semana" || !p.numero_semanas) return false;
    const inicio = segundaDaSemana(p.data_inicio ?? p.data_criacao);
    return hoje >= inicio && hoje < somarDias(inicio, p.numero_semanas * 7);
  });
  return emCurso ?? planos[0] ?? null;
}

export async function carregarGrupos(
  supabase: SupabaseClient,
  plano: Pick<PlanoResumo, "arquivo_url" | "data_inicio" | "data_criacao">,
): Promise<GrupoTela[] | null> {
  const { data: arquivo } = await supabase.storage.from("training-plans").download(plano.arquivo_url);
  if (!arquivo) return null;
  try {
    const treino = parseTreino(Buffer.from(await arquivo.arrayBuffer()));
    if (treino.tipo === "semana") return gruposDaSemana(treino, plano.data_inicio ?? plano.data_criacao);
    if (treino.tipo === "blocos") return gruposDosBlocos(treino);
    return null;
  } catch {
    return null;
  }
}

// Junta, pra cada atleta visível ao treinador, o que ele precisa saber de
// relance: como vai a semana, quanto do plano foi feito, quando foi a última
// atividade e o que pede atenção. Uma leva de consultas pra todos os atletas
// de uma vez, e só a planilha do plano ativo de cada um é aberta.
export async function resumirAtletas(
  supabase: SupabaseClient,
  hoje: string,
  apenasId?: string,
): Promise<{ atletas: ResumoAtleta[]; recados: Recado[] }> {
  let consulta = supabase.from("athletes").select("id, nome, avatar_url").order("nome");
  if (apenasId) consulta = consulta.eq("id", apenasId);
  const { data: atletasBrutos } = await consulta;
  const lista = atletasBrutos ?? [];
  const ids = lista.map((a) => a.id);
  if (ids.length === 0) return { atletas: [], recados: [] };

  const segunda = segundaDaSemana(hoje);

  const [{ data: planos }, { data: conclusoes }, { data: logs }, { data: dadosSemana }, { data: ultimos }, { data: obs }, { data: esforcos }] =
    await Promise.all([
      supabase
        .from("training_plans")
        .select("id, athlete_id, nome_arquivo, arquivo_url, data_criacao, data_inicio, modo_treino, numero_semanas")
        .in("athlete_id", ids)
        .order("data_criacao", { ascending: false }),
      supabase.from("training_completions").select("athlete_id, training_plan_id, session_key, completed_at").in("athlete_id", ids),
      supabase.from("exercise_logs").select("athlete_id, training_plan_id, session_key, data").in("athlete_id", ids),
      supabase.from("training_data").select("athlete_id, tipo, variavel, valor").in("athlete_id", ids).gte("data", segunda),
      supabase.from("training_data").select("athlete_id, data").in("athlete_id", ids).order("data", { ascending: false }).limit(400),
      supabase
        .from("observations")
        .select("id, athlete_id, training_plan_id, texto, data")
        .in("athlete_id", ids)
        .order("data", { ascending: false })
        .limit(apenasId ? 60 : 12),
      // Tabela nova (migração de 16/11/2026): se ainda não existe, vem vazio.
      supabase
        .from("session_feedback")
        .select("athlete_id, esforco, dor, data")
        .in("athlete_id", ids)
        .order("data", { ascending: false })
        .limit(400),
    ]);

  const atletas = await Promise.all(
    lista.map(async (a): Promise<ResumoAtleta> => {
      const planosDoAtleta = ((planos ?? []) as PlanoResumo[]).filter((p) => p.athlete_id === a.id);
      const ativo = escolherPlanoAtivo(planosDoAtleta, hoje);
      const grupos = ativo ? await carregarGrupos(supabase, ativo) : null;

      const concluidas = new Set(
        (conclusoes ?? []).filter((c) => c.training_plan_id === ativo?.id).map((c) => c.session_key),
      );
      const comRegistro = new Set((logs ?? []).filter((l) => l.training_plan_id === ativo?.id).map((l) => l.session_key));

      const treinaveis = grupos ? sessoesTreinaveis(grupos) : [];
      const grupoAtual = grupos?.find((g) => g.sessoes.some((s) => s.data && s.data >= segunda && s.data <= somarDias(segunda, 6)));

      const semana: DiaResumo[] = Array.from({ length: 7 }, (_, i) => {
        const data = somarDias(segunda, i);
        const sessao = grupoAtual?.sessoes.find((s) => s.data === data);
        const rotuloCurto = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i];
        if (!sessao) return { data, rotuloCurto, titulo: "", estado: "vazio" };
        if (sessao.descanso || sessao.roteiro.length === 0) return { data, rotuloCurto, titulo: "Descanso", estado: "descanso" };
        const estado: EstadoDia = concluidas.has(sessao.chave)
          ? "feito"
          : comRegistro.has(sessao.chave)
            ? "parcial"
            : data < hoje
              ? "perdido"
              : "planejado";
        return { data, rotuloCurto, titulo: sessao.titulo || sessao.rotulo, estado, sessionKey: sessao.chave };
      });

      const comTreino = semana.filter((d) => d.estado !== "vazio" && d.estado !== "descanso");
      const feitosSemana = comTreino.filter((d) => d.estado === "feito").length;
      const atrasadosSemana = comTreino.filter((d) => d.estado === "perdido").length;

      let diasRestantes: number | null = null;
      if (ativo?.modo_treino === "semana" && ativo.numero_semanas) {
        const fim = somarDias(segundaDaSemana(ativo.data_inicio ?? ativo.data_criacao), ativo.numero_semanas * 7);
        diasRestantes = diasEntre(hoje, fim);
      }

      const datas = [
        ...(logs ?? []).filter((l) => l.athlete_id === a.id).map((l) => l.data as string),
        ...(conclusoes ?? []).filter((c) => c.athlete_id === a.id).map((c) => String(c.completed_at).slice(0, 10)),
        ...(ultimos ?? []).filter((d) => d.athlete_id === a.id).map((d) => d.data as string),
      ].filter((d) => d <= hoje);
      const ultimaAtividade = datas.length ? datas.reduce((max, d) => (d > max ? d : max)) : null;
      const diasSemAtividade = ultimaAtividade ? diasEntre(ultimaAtividade, hoje) : null;

      const daSemana = (dadosSemana ?? []).filter((d) => d.athlete_id === a.id);
      const kgSemana = daSemana
        .filter((d) => d.tipo === "academia" && d.variavel === "volume_carga")
        .reduce((s, d) => s + Number(d.valor), 0);
      const kmSemana = daSemana.filter((d) => d.variavel === "distancia").reduce((s, d) => s + Number(d.valor), 0);

      // Sinais de sobrecarga: esforço lá em cima por três treinos seguidos,
      // ou dor forte no treino mais recente.
      const doAtleta = (esforcos ?? []).filter((e) => e.athlete_id === a.id).slice(0, 3);
      const esforcoRecente = doAtleta.length ? doAtleta.reduce((t, e) => t + e.esforco, 0) / doAtleta.length : null;
      const dorRecente = doAtleta[0]?.dor ?? null;

      const alertas: Alerta[] = [];
      if (dorRecente !== null && dorRecente >= 7) {
        alertas.push({ tipo: "sobrecarga", texto: `Relatou dor ${dorRecente}/10 no último treino`, grave: true });
      }
      if (doAtleta.length === 3 && esforcoRecente !== null && esforcoRecente >= 9) {
        alertas.push({
          tipo: "sobrecarga",
          texto: `Esforço médio ${esforcoRecente.toFixed(1).replace(".", ",")}/10 nos 3 últimos treinos`,
          grave: false,
        });
      }
      if (!ativo) {
        alertas.push({ tipo: "sem-plano", texto: "Ainda sem nenhum plano enviado", grave: false });
      } else {
        if (diasRestantes !== null && diasRestantes <= 0) {
          alertas.push({
            tipo: "mesociclo",
            texto: diasRestantes === 0 ? "Mesociclo termina hoje" : `Mesociclo encerrou há ${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) > 1 ? "s" : ""}`,
            grave: true,
          });
        } else if (diasRestantes !== null && diasRestantes <= 7) {
          alertas.push({ tipo: "mesociclo", texto: `Mesociclo termina em ${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}`, grave: false });
        }
        if (atrasadosSemana >= 2) {
          alertas.push({ tipo: "atrasado", texto: `${atrasadosSemana} treinos da semana sem registro`, grave: false });
        }
        if (diasSemAtividade === null) {
          alertas.push({ tipo: "inativo", texto: "Nunca registrou um treino", grave: false });
        } else if (diasSemAtividade >= 6) {
          alertas.push({ tipo: "inativo", texto: `Sem registrar há ${diasSemAtividade} dias`, grave: diasSemAtividade >= 12 });
        }
      }

      return {
        id: a.id,
        nome: a.nome,
        avatarUrl: a.avatar_url,
        planos: planosDoAtleta,
        ativo,
        grupos,
        semana,
        planejadosSemana: comTreino.length,
        feitosSemana,
        atrasadosSemana,
        feitosPlano: treinaveis.filter((s) => concluidas.has(s.chave)).length,
        totalPlano: treinaveis.length,
        diasRestantes,
        ultimaAtividade,
        diasSemAtividade,
        kgSemana,
        kmSemana,
        esforcoRecente,
        alertas,
      };
    }),
  );

  const recados: Recado[] = (obs ?? []).map((o) => ({
    id: o.id,
    athleteId: o.athlete_id,
    planoId: o.training_plan_id,
    texto: o.texto,
    data: o.data,
  }));

  return { atletas, recados };
}

export function haQuanto(dias: number | null): string {
  if (dias === null) return "sem registros";
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}
