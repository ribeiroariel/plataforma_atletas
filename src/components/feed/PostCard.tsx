"use client";

import { useState, useTransition } from "react";
import { alternarCurtida, apagarPost, comentar } from "@/lib/actions/feed";

export type Autor = { nome: string; avatarUrl: string | null };
export type Comentario = { id: string; texto: string; autor: Autor; data: string };
export type PostFeed = {
  id: string;
  texto: string | null;
  imageUrl: string | null;
  data: string;
  autor: Autor;
  curtidas: number;
  curtidoPorMim: boolean;
  doUsuario: boolean;
  comentarios: Comentario[];
};

function Avatar({ autor, tamanho = 36 }: { autor: Autor; tamanho?: number }) {
  const inicial = autor.nome?.[0]?.toUpperCase() ?? "?";
  if (autor.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={autor.avatarUrl} alt="" width={tamanho} height={tamanho} className="rounded-full object-cover" style={{ width: tamanho, height: tamanho }} />;
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-stadium-blue text-sm font-semibold text-white"
      style={{ width: tamanho, height: tamanho }}
    >
      {inicial}
    </span>
  );
}

export function PostCard({ post }: { post: PostFeed }) {
  const [curtido, setCurtido] = useState(post.curtidoPorMim);
  const [totalCurtidas, setTotalCurtidas] = useState(post.curtidas);
  const [comentarios, setComentarios] = useState(post.comentarios);
  const [novoComentario, setNovoComentario] = useState("");
  const [apagado, setApagado] = useState(false);
  const [, iniciar] = useTransition();

  if (apagado) return null;

  function curtir() {
    const anterior = curtido;
    setCurtido(!anterior);
    setTotalCurtidas((n) => n + (anterior ? -1 : 1));
    iniciar(async () => {
      const r = await alternarCurtida(post.id, anterior);
      if ("erro" in r) {
        setCurtido(anterior);
        setTotalCurtidas((n) => n + (anterior ? 1 : -1));
      }
    });
  }

  function enviarComentario(e: React.FormEvent) {
    e.preventDefault();
    const texto = novoComentario.trim();
    if (!texto) return;
    setNovoComentario("");
    const otimista: Comentario = {
      id: `tmp-${Date.now()}`,
      texto,
      autor: { nome: "Você", avatarUrl: null },
      data: "agora",
    };
    setComentarios((c) => [...c, otimista]);
    iniciar(async () => {
      await comentar(post.id, texto);
    });
  }

  function apagar() {
    setApagado(true);
    iniciar(async () => {
      const r = await apagarPost(post.id);
      if ("erro" in r) setApagado(false);
    });
  }

  return (
    <article className="flex flex-col gap-3 rounded-[var(--radius-badge)] border border-track-fog/25 bg-white p-4">
      <header className="flex items-center gap-3">
        <Avatar autor={post.autor} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-track-night">{post.autor.nome}</p>
          <p className="text-xs text-track-fog">{post.data}</p>
        </div>
        {post.doUsuario && (
          <button
            type="button"
            onClick={apagar}
            className="text-xs text-track-fog hover:text-split-ember"
            aria-label="Apagar publicação"
          >
            Apagar
          </button>
        )}
      </header>

      {post.texto && <p className="whitespace-pre-line text-sm text-track-night/90">{post.texto}</p>}

      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imageUrl}
          alt=""
          className="max-h-[28rem] w-full rounded-[var(--radius-badge)] object-cover"
        />
      )}

      <div className="flex items-center gap-4 border-t border-track-fog/15 pt-2 text-sm">
        <button
          type="button"
          onClick={curtir}
          className={`flex items-center gap-1.5 font-medium transition-colors ${
            curtido ? "text-split-ember" : "text-track-fog hover:text-track-night"
          }`}
          aria-pressed={curtido}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={curtido ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M12 20.5S3 14.9 3 8.9C3 5.9 5.2 4 7.6 4c1.6 0 3.2.9 4.4 2.7C13.2 4.9 14.8 4 16.4 4 18.8 4 21 5.9 21 8.9c0 6-9 11.6-9 11.6z" strokeLinejoin="round" />
          </svg>
          {totalCurtidas > 0 ? totalCurtidas : "Curtir"}
        </button>
        <span className="text-track-fog">
          {comentarios.length > 0 ? `${comentarios.length} comentário${comentarios.length > 1 ? "s" : ""}` : "Sem comentários"}
        </span>
      </div>

      {comentarios.length > 0 && (
        <ul className="flex flex-col gap-2">
          {comentarios.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              <Avatar autor={c.autor} tamanho={26} />
              <div className="min-w-0 flex-1 rounded-[var(--radius-badge)] bg-lane-chalk px-3 py-1.5">
                <span className="mr-1 text-xs font-semibold text-track-night">{c.autor.nome}</span>
                <span className="text-sm text-track-night/90">{c.texto}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={enviarComentario} className="flex items-center gap-2">
        <input
          type="text"
          value={novoComentario}
          onChange={(e) => setNovoComentario(e.target.value)}
          maxLength={500}
          placeholder="Escreva um comentário..."
          className="flex-1 rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-1.5 text-sm text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
        />
        <button
          type="submit"
          disabled={!novoComentario.trim()}
          className="rounded-[var(--radius-badge)] bg-stadium-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-deep-lane disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </article>
  );
}
