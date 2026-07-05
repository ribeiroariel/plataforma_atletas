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
    <nav className="flex flex-col gap-1" aria-label="Navegação principal">
      {itens.map((item) => {
        const on = ativo(item);
        // Item ativo ganha barra lateral + fundo destacado para ficar óbvio.
        const corAtiva = escuro
          ? "bg-white/10 text-white before:bg-sky-split"
          : "bg-stadium-blue/10 text-stadium-blue before:bg-stadium-blue";
        const corInativa = escuro
          ? "text-white/70 hover:bg-white/5 before:bg-transparent"
          : "text-track-night/80 hover:bg-lane-chalk before:bg-transparent";
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setAberto(false)}
            aria-current={on ? "page" : undefined}
            className={`relative flex items-center gap-3 rounded-[var(--radius-badge)] px-3 py-2 text-sm font-medium transition-colors before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stadium-blue/40 ${
              on ? `${corAtiva} font-semibold` : corInativa
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
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={aberto}
          className={`flex items-center gap-2 rounded-[var(--radius-badge)] border ${borda} px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stadium-blue/40 ${
            escuro ? "hover:bg-white/10" : "hover:bg-lane-chalk"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            {aberto ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
          Menu
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
