"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { FotoPerfil } from "@/components/perfil/FotoPerfil";
import { IconeSair } from "./iconesNav";

export type ItemNav = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exato?: boolean;
  // Outros prefixos de rota que também deixam esse item aceso.
  tambem?: string[];
};

export function Marca({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span aria-hidden className="flex h-7 w-7 items-end gap-[3px] rounded-[6px] bg-tartan p-[6px]">
        <span className="h-2 w-[3px] rounded-full bg-white" />
        <span className="h-3 w-[3px] rounded-full bg-white" />
        <span className="h-full w-[3px] rounded-full bg-white" />
      </span>
      <span className="font-display text-lg leading-none font-extrabold tracking-wide text-white uppercase">
        Treinos
      </span>
    </span>
  );
}

export function Sidebar({
  titulo,
  nome,
  avatarUrl,
  itens,
}: {
  titulo: string;
  nome: string;
  avatarUrl: string | null;
  itens: ItemNav[];
}) {
  const pathname = usePathname();

  function ativo(item: ItemNav) {
    if (item.tambem?.some((p) => pathname.startsWith(p))) return true;
    return item.exato ? pathname === item.href : pathname.startsWith(item.href);
  }

  return (
    <>
      {/* Topo — celular */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ink px-4 py-2.5 md:hidden">
        <Marca />
        <div className="flex items-center gap-2">
          <FotoPerfil nome={nome} avatarUrl={avatarUrl} tamanho={32} />
          <form action={logout}>
            <button
              type="submit"
              aria-label="Sair da conta"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              {IconeSair}
            </button>
          </form>
        </div>
      </header>

      {/* Abas — celular */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {itens.map((item) => {
          const on = ativo(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`relative flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                on ? "text-white" : "text-white/45"
              }`}
            >
              <span
                aria-hidden
                className={`absolute top-0 h-[3px] w-8 rounded-b-full bg-tartan transition-opacity ${on ? "opacity-100" : "opacity-0"}`}
              />
              <span className={on ? "text-tartan" : ""} aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Lateral — computador */}
      <aside className="raias sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-ink p-5 text-white md:flex">
        <div className="pt-1 pb-8">
          <Marca />
        </div>

        <nav className="flex flex-col gap-1" aria-label="Navegação principal">
          {itens.map((item) => {
            const on = ativo(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`flex items-center gap-3 rounded-[var(--radius-badge)] px-3 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-tartan focus-visible:outline-none ${
                  on ? "bg-white text-ink" : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className={on ? "text-tartan" : ""} aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center gap-3 border-t border-white/10 pt-4">
          <FotoPerfil nome={nome} avatarUrl={avatarUrl} tamanho={38} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{nome || titulo}</p>
            <p className="rotulo text-white/40">{titulo}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              aria-label="Sair da conta"
              title="Sair"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              {IconeSair}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
