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

  let variavel: string;
  let unidade: string;
  let valor: number | null;

  if (tipo === "academia") {
    variavel = "volume_carga";
    unidade = "kg";
    valor = numero(valorBruto);
  } else if (tipo === "corrida" || tipo === "bicicleta") {
    const modo = String(formData.get("modo") ?? "distancia");
    if (modo === "pace") {
      variavel = "pace";
      unidade = "min/km";
      valor = paceParaMinutos(valorBruto);
    } else {
      variavel = "distancia";
      unidade = "km";
      valor = numero(valorBruto);
    }
  } else {
    variavel = "tempo";
    unidade = "min";
    valor = numero(valorBruto);
  }

  if (valor === null || valor <= 0) {
    return { erro: "O valor precisa ser um número positivo." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: "Sessão expirada. Entre novamente." };

  const athleteId = await getAthleteId(supabase, user.id);
  if (!athleteId) return { erro: "Cadastro de atleta não encontrado." };

  const { error } = await supabase
    .from("training_data")
    .upsert(
      { athlete_id: athleteId, data, tipo, variavel, valor, unidade },
      { onConflict: "athlete_id,data,tipo,variavel" },
    );

  if (error) return { erro: "Não deu para salvar o registro. Tente de novo." };

  revalidatePath("/atleta/evolucao");
  return { ok: true };
}
