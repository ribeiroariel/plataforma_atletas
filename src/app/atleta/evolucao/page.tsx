import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EvolucaoDashboard } from "@/components/evolucao/EvolucaoDashboard";

export default async function EvolucaoPage() {
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

      <EvolucaoDashboard dados={dados ?? []} />
    </div>
  );
}
