"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAthleteId } from "@/lib/supabase/athlete";
import { paceParaMinutos, numero } from "./valores";

type Resultado = { ok: true } | { erro: string };

export async function registrarTreino(
  _estadoAnterior: unknown,
  formData: FormData,
): Promise<Resultado> {
  const tipo = String(formData.get("tipo") ?? "");
  const data = String(formData.get("data") ?? "");
  const valorBruto = String(formData.get("valor") ?? "");

  if (!["academia", "corrida", "bicicleta", "cardio"].includes(tipo)) {
    return { erro: "Escolha o tipo de treino." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return { erro: "Informe uma data válida." };
  }
  const hoje = new Date().toISOString().slice(0, 10);
  if (data > hoje) {
    return { erro: "A data não pode ser no futuro." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const athleteId = await getAthleteId(supabase, user.id);
  if (!athleteId) return { erro: "Cadastro de atleta não encontrado." };

  let linhas: { athlete_id: string; data: string; tipo: string; variavel: string; valor: number; unidade: string }[];

  if (tipo === "academia" || tipo === "cardio") {
    const variavel = tipo === "academia" ? "volume_carga" : "tempo";
    const unidade = tipo === "academia" ? "kg" : "min";
    const valor = numero(valorBruto);
    if (valor === null || valor <= 0) {
      return { erro: "O valor precisa ser um número positivo." };
    }
    linhas = [{ athlete_id: athleteId, data, tipo, variavel, valor, unidade }];
  } else {
    // corrida/bicicleta: distância é sempre obrigatória, junto com tempo OU
    // pace — nunca só o pace isolado, que sozinho não diz nada sobre volume.
    // O valor que faltar (pace a partir do tempo) é calculado aqui.
    const distanciaBruta = String(formData.get("distancia") ?? "");
    const modoSegundo = String(formData.get("modoSegundo") ?? "tempo");
    const segundoBruto = String(formData.get("segundo") ?? "");

    const distancia = numero(distanciaBruta);
    if (distancia === null || distancia <= 0) {
      return { erro: "Informe uma distância válida." };
    }

    let pace: number | null;
    if (modoSegundo === "pace") {
      pace = paceParaMinutos(segundoBruto);
    } else {
      const tempo = numero(segundoBruto);
      pace = tempo !== null && tempo > 0 ? tempo / distancia : null;
    }
    if (pace === null || pace <= 0) {
      return { erro: "Informe um tempo ou pace válido." };
    }

    linhas = [
      { athlete_id: athleteId, data, tipo, variavel: "distancia", valor: distancia, unidade: "km" },
      { athlete_id: athleteId, data, tipo, variavel: "pace", valor: pace, unidade: "min/km" },
    ];
  }

  const { error } = await supabase
    .from("training_data")
    .upsert(linhas, { onConflict: "athlete_id,data,tipo,variavel" });

  if (error) return { erro: "Não deu para salvar o registro. Tente de novo." };

  revalidatePath("/atleta/evolucao");
  return { ok: true };
}
