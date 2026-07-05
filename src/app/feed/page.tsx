import { createClient } from "@/lib/supabase/server";
import { PostComposer } from "@/components/feed/PostComposer";
import { PostCard, type Autor, type Comentario, type PostFeed } from "@/components/feed/PostCard";

function tempoRelativo(iso: string): string {
  const agora = Date.now();
  const t = new Date(iso).getTime();
  const seg = Math.floor((agora - t) / 1000);
  if (seg < 60) return "agora";
  const min = Math.floor(seg / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} dia${d > 1 ? "s" : ""}`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, author_id, texto, image_url, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const listaPosts = posts ?? [];
  const idsPosts = listaPosts.map((p) => p.id);

  const [{ data: likes }, { data: comentarios }] = await Promise.all([
    idsPosts.length
      ? supabase.from("post_likes").select("post_id, user_id").in("post_id", idsPosts)
      : Promise.resolve({ data: [] as { post_id: string; user_id: string }[] }),
    idsPosts.length
      ? supabase
          .from("post_comments")
          .select("id, post_id, user_id, texto, created_at")
          .in("post_id", idsPosts)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; post_id: string; user_id: string; texto: string; created_at: string }[] }),
  ]);

  // perfis de todos os autores (posts + comentários)
  const idsUsuarios = new Set<string>();
  listaPosts.forEach((p) => idsUsuarios.add(p.author_id));
  (comentarios ?? []).forEach((c) => idsUsuarios.add(c.user_id));

  const { data: perfis } = idsUsuarios.size
    ? await supabase.from("profiles").select("user_id, nome, avatar_url").in("user_id", [...idsUsuarios])
    : { data: [] as { user_id: string; nome: string; avatar_url: string | null }[] };

  const perfilDe = (id: string): Autor => {
    const p = (perfis ?? []).find((x) => x.user_id === id);
    return { nome: p?.nome ?? "Usuário", avatarUrl: p?.avatar_url ?? null };
  };

  const feed: PostFeed[] = listaPosts.map((p) => {
    const curtidasPost = (likes ?? []).filter((l) => l.post_id === p.id);
    const comentariosPost: Comentario[] = (comentarios ?? [])
      .filter((c) => c.post_id === p.id)
      .map((c) => ({
        id: c.id,
        texto: c.texto,
        autor: perfilDe(c.user_id),
        data: tempoRelativo(c.created_at),
      }));

    return {
      id: p.id,
      texto: p.texto,
      imageUrl: p.image_url,
      data: tempoRelativo(p.created_at),
      autor: perfilDe(p.author_id),
      curtidas: curtidasPost.length,
      curtidoPorMim: curtidasPost.some((l) => l.user_id === user?.id),
      doUsuario: p.author_id === user?.id,
      comentarios: comentariosPost,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 bg-lane-chalk px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-track-night">Feed</h1>
      <PostComposer />

      {feed.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-badge)] border border-dashed border-track-fog/40 bg-white px-4 py-10 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-track-fog" aria-hidden>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 9h18" strokeLinecap="round" />
            <circle cx="6.5" cy="6.5" r="0.6" fill="currentColor" />
          </svg>
          <p className="text-sm font-medium text-track-night">Ainda não há publicações</p>
          <p className="text-sm text-track-fog">
            Seja o primeiro a compartilhar um treino, uma conquista ou uma foto usando o campo acima.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {feed.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
