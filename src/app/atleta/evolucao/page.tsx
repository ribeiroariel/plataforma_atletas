import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EvolucaoDashboard } from "@/components/evolucao/EvolucaoDashboard";
import { CartaoStrava } from "@/components/evolucao/CartaoStrava";
import { RegistroTreinoForm } from "@/components/evolucao/RegistroTreinoForm";
import { stravaConfigurado } from "@/lib/strava/config";

const MENSAGENS_STRAVA: Record<string, string> = {
  conectado: "Strava conectado e sincronizado.",
  negado: "Você não autorizou o acesso ao Strava.",
  erro: "Algo deu errado ao conectar o Strava. Tente de novo.",
  indisponivel: "Integração com o Strava ainda não configurada.",
};

export default async function EvolucaoPage({
  searchParams,
}: {
  searchParams: Promise<{ strava?: string }>;
}) {
  const { strava } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: athlete } = await supabase
    .from("athletes")
    .select("id, nome")
    .eq("user_id", user?.id)
    .single();

  const { data: dados } = await supabase
    .from("training_data")
    .select("data, tipo, variavel, valor")
    .eq("athlete_id", athlete?.id ?? "");

  const conexaoStrava = stravaConfigurado()
    ? (
        await supabase
          .from("strava_connections")
          .select("athlete_id")
          .eq("athlete_id", athlete?.id ?? "")
          .maybeSingle()
      ).data
    : null;

  return (
    <div className="flex flex-1 flex-col gap-6 bg-lane-chalk px-6 py-10">
      <div>
        <Link href="/atleta" className="text-sm text-stadium-blue hover:underline">
          ← Meus treinos
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-track-night">
          Sua evolução
        </h1>
      </div>

      <RegistroTreinoForm />

      {stravaConfigurado() && (
        <CartaoStrava
          conectado={Boolean(conexaoStrava)}
          disponivel
          ultimaMensagem={strava ? MENSAGENS_STRAVA[strava] : undefined}
        />
      )}

      <EvolucaoDashboard dados={dados ?? []} />
    </div>
  );
}
