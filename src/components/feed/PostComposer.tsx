"use client";

import { useActionState, useRef, useState } from "react";
import { criarPost } from "@/lib/actions/feed";

export function PostComposer() {
  const [estado, formAction, pendente] = useActionState(criarPost, null);
  const [texto, setTexto] = useState("");
  const [previa, setPrevia] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function aoEscolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPrevia(file ? URL.createObjectURL(file) : null);
  }

  const sucesso = estado && "ok" in estado;
  if (sucesso && (texto || previa)) {
    // limpa após publicar
    formRef.current?.reset();
    setTexto("");
    setPrevia(null);
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-[var(--radius-badge)] border border-track-fog/25 bg-white p-4"
    >
      <textarea
        name="texto"
        rows={2}
        maxLength={1000}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Compartilhe um treino, uma conquista, uma foto..."
        className="resize-none rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 text-sm text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
      />

      {previa && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previa} alt="Prévia" className="max-h-64 w-full rounded-[var(--radius-badge)] object-cover" />
      )}

      <div className="flex items-center justify-between gap-3">
        <label className="cursor-pointer text-sm font-medium text-stadium-blue hover:underline">
          + Foto
          <input
            type="file"
            name="foto"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={aoEscolherFoto}
          />
        </label>
        <div className="flex items-center gap-3">
          {estado && "erro" in estado && <span className="text-xs text-split-ember">{estado.erro}</span>}
          <button
            type="submit"
            disabled={pendente}
            className="rounded-[var(--radius-badge)] bg-stadium-blue px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-deep-lane disabled:opacity-60"
          >
            {pendente ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </div>
    </form>
  );
}
