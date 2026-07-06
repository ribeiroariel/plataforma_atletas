"use client";

export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden rounded-[var(--radius-badge)] bg-stadium-blue px-4 py-2 text-sm font-medium text-white hover:bg-deep-lane"
    >
      Imprimir / Salvar PDF
    </button>
  );
}
