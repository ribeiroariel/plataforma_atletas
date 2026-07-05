"use client";

import { useActionState, useRef, useState } from "react";
import { criarPost } from "@/lib/actions/feed";

const MAX_IMG_MB = 5;

export function PostComposer() {
  const [estado, formAction, pendente] = useActionState(criarPost, null);
  const [texto, setTexto] = useState("");
  const [previa, setPrevia] = useState<string | null>(null);
  const [avisoFoto, setAvisoFoto] = useState<string | null>(null);
  // Guarda o último resultado de sucesso já "limpo" para não apagar o que o
  // usuário digitar DEPOIS de publicar (cada sucesso é um objeto novo).
  const [sucessoTratado, setSucessoTratado] = useState<unknown>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  function aoEscolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setAvisoFoto(null);
    if (!file) {
      setPrevia(null);
      return;
    }
    // Aviso client-side antes de enviar: fotos acima de 5 MB são recusadas
    // pela action, então avisamos aqui para não frustrar o envio.
    if (file.size > MAX_IMG_MB * 1024 * 1024) {
      setAvisoFoto(`Essa foto tem mais de ${MAX_IMG_MB} MB. Escolha uma menor.`);
      setPrevia(null);
      e.target.value = "";
      return;
    }
    setPrevia(URL.createObjectURL(file));
  }

  function removerFoto() {
    setPrevia(null);
    setAvisoFoto(null);
    if (inputFotoRef.current) inputFotoRef.current.value = "";
  }

  const sucesso = estado !== null && "ok" in estado;
  // Limpa uma única vez por publicação bem-sucedida (setState em render é o
  // padrão recomendado para ajustar estado quando outra fonte muda). O input
  // de arquivo (não controlado) é resetado automaticamente pelo React após a
  // form action.
  if (sucesso && estado !== sucessoTratado) {
    setTexto("");
    setPrevia(null);
    setAvisoFoto(null);
    setSucessoTratado(estado);
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-[var(--radius-badge)] border border-track-fog/25 bg-white p-4 shadow-sm"
    >
      <label htmlFor="composer-texto" className="text-sm font-semibold text-track-night">
        Nova publicação
      </label>
      <textarea
        id="composer-texto"
        name="texto"
        rows={3}
        maxLength={1000}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Compartilhe um treino, uma conquista, uma foto..."
        className="resize-none rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-sm text-track-night outline-none transition-colors placeholder:text-track-fog focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
      />

      {previa && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previa} alt="Prévia da foto" className="max-h-64 w-full rounded-[var(--radius-badge)] object-cover" />
          <button
            type="button"
            onClick={removerFoto}
            aria-label="Remover foto"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-track-night/70 text-white transition-colors hover:bg-split-ember"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-badge)] border border-track-fog/40 px-3 py-1.5 text-sm font-medium text-stadium-blue transition-colors hover:border-stadium-blue hover:bg-stadium-blue/5 focus-within:ring-2 focus-within:ring-stadium-blue/30">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="8.5" cy="10" r="1.6" />
            <path d="M21 16l-5-5-9 8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {previa ? "Trocar foto" : "Adicionar foto"}
          <input
            ref={inputFotoRef}
            type="file"
            name="foto"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={aoEscolherFoto}
          />
        </label>
        <div className="flex items-center gap-3">
          {estado !== null && "erro" in estado && (
            <span role="alert" className="text-xs font-medium text-split-ember">
              {estado.erro}
            </span>
          )}
          {avisoFoto && (
            <span role="alert" className="text-xs font-medium text-split-ember">
              {avisoFoto}
            </span>
          )}
          {sucesso && !texto && !previa && (
            <span className="text-xs font-medium text-stadium-blue">Publicado!</span>
          )}
          <button
            type="submit"
            disabled={pendente}
            className="rounded-[var(--radius-badge)] bg-stadium-blue px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-deep-lane focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stadium-blue/40 disabled:opacity-60"
          >
            {pendente ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </div>
    </form>
  );
}
