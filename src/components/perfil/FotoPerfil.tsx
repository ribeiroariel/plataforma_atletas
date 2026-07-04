"use client";

import { useActionState, useRef } from "react";
import { atualizarFotoPerfil } from "@/lib/actions/perfil";

export function FotoPerfil({
  nome,
  avatarUrl,
  tamanho = 40,
}: {
  nome: string;
  avatarUrl: string | null;
  tamanho?: number;
}) {
  const [estado, formAction] = useActionState(atualizarFotoPerfil, null);
  const formRef = useRef<HTMLFormElement>(null);

  const iniciais = nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");

  const urlAtual = estado && "url" in estado ? estado.url : avatarUrl;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col items-center gap-1">
      <label
        className="group relative block shrink-0 cursor-pointer overflow-hidden rounded-full border border-white/20"
        style={{ width: tamanho, height: tamanho }}
        title="Trocar foto de perfil"
      >
        {urlAtual ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlAtual} alt={nome} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-stadium-blue text-sm font-semibold text-white">
            {iniciais || "?"}
          </span>
        )}
        <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-[10px] font-medium text-white group-hover:flex">
          Trocar
        </span>
        <input
          type="file"
          name="foto"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={() => formRef.current?.requestSubmit()}
        />
      </label>
      {estado && "erro" in estado && (
        <p className="max-w-[120px] text-center text-[10px] text-split-ember">{estado.erro}</p>
      )}
    </form>
  );
}
