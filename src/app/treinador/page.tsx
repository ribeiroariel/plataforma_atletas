import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";
import { FotoPerfil } from "@/components/perfil/FotoPerfil";

export default async function TreinadorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, avatar_url")
    .eq("user_id", user?.id)
    .single();

  const { data: atletas } = await supabase
    .from("athletes")
    .select("id, nome, avatar_url")
    .order("nome");

  return (
    <div className="flex flex-1 flex-col gap-4 bg-track-night px-6 py-10 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FotoPerfil nome={profile?.nome ?? "Treinador"} avatarUrl={profile?.avatar_url ?? null} />
          <h1 className="font-display text-2xl font-bold">
            Painel do treinador — {profile?.nome ?? ""}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/treinador/comparar"
            className="rounded-[var(--radius-badge)] bg-stadium-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-split hover:text-track-night"
          >
            Comparar atletas
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-[var(--radius-badge)] border border-white/30 px-3 py-1.5 text-sm hover:bg-white/10"
            >
              Sair
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-[var(--radius-badge)] border border-white/10 bg-deep-lane p-4">
        <h2 className="font-display text-lg font-semibold">Seus atletas</h2>
        {atletas && atletas.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1">
            {atletas.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/treinador/atletas/${a.id}`}
                  className="flex items-center gap-2 rounded-[var(--radius-badge)] px-2 py-1.5 text-sm text-sky-split hover:bg-white/5"
                >
                  {a.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-deep-lane text-[10px] font-semibold text-white">
                      {a.nome[0]?.toUpperCase()}
                    </span>
                  )}
                  {a.nome}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-track-fog">
            Nenhum atleta vinculado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
