"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/actions/auth";
import { FotoPerfil } from "@/components/perfil/FotoPerfil";

export type ItemNav = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exato?: boolean;
};

export function Sidebar({
  variante,
  titulo,
  nome,
  avatarUrl,
  itens,
}: {
  variante: "light" | "dark";
  titulo: string;
  nome: string;
  avatarUrl: string | null;
  itens: ItemNav[];
}) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  const escuro = variante === "dark";
  const base = escuro ? "bg-track-night text-white" : "bg-white text-track-night";
  const borda = escuro ? "border-white/10" : "border-track-fog/20";

  function ativo(item: ItemNav) {
    return item.exato ? pathname === item.href : pathname.startsWith(item.href);
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {itens.map((item) => {
        const on = ativo(item);
        const corAtiva = escuro
          ? "bg-white/10 text-white"
          : "bg-stadium-blue/10 text-stadium-blue";
        const corInativa = escuro
          ? "text-white/70 hover:bg-white/5"
          : "text-track-night/80 hover:bg-lane-chalk";
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setAberto(false)}
            className={`flex items-center gap-3 rounded-[var(--radius-badge)] px-3 py-2 text-sm font-medium transition-colors ${
              on ? corAtiva : corInativa
            }`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Topo mobile */}
      <div className={`flex items-center justify-between border-b ${borda} ${base} px-4 py-3 md:hidden`}>
        <div className="flex items-center gap-2">
          <FotoPerfil nome={nome} avatarUrl={avatarUrl} tamanho={32} />
          <span className="font-display text-sm font-bold">{titulo}</span>
        </div>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-label="Menu"
          className={`rounded-[var(--radius-badge)] border ${borda} px-2 py-1 text-sm`}
        >
          ☰
        </button>
      </div>
      {aberto && (
        <div className={`border-b ${borda} ${base} px-3 py-3 md:hidden`}>
          {nav}
          <form action={logout} className="mt-2">
            <button
              type="submit"
              className={`w-full rounded-[var(--radius-badge)] border ${borda} px-3 py-2 text-sm`}
            >
              Sair
            </button>
          </form>
        </div>
      )}

      {/* Sidebar desktop */}
      <aside className={`hidden w-56 shrink-0 flex-col border-r ${borda} ${base} p-4 md:flex`}>
        <div className="flex items-center gap-2 px-1 pb-4">
          <FotoPerfil nome={nome} avatarUrl={avatarUrl} tamanho={40} />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold">{titulo}</p>
            <p className={`truncate text-xs ${escuro ? "text-white/50" : "text-track-fog"}`}>{nome}</p>
          </div>
        </div>
        {nav}
        <form action={logout} className="mt-auto pt-4">
          <button
            type="submit"
            className={`w-full rounded-[var(--radius-badge)] border ${borda} px-3 py-2 text-sm ${
              escuro ? "hover:bg-white/10" : "hover:bg-lane-chalk"
            }`}
          >
            Sair
          </button>
        </form>
      </aside>
    </>
  );
}
