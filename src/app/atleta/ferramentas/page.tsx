import { Ferramentas } from "@/components/ferramentas/Ferramentas";

export default async function FerramentasPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba } = await searchParams;
  const inicial = aba === "anilhas" || aba === "crono" ? aba : "rm";

  return (
    <div className="flex flex-1 flex-col bg-bone">
      <header className="raias bg-ink px-5 pt-8 pb-7 text-white sm:px-8 sm:pt-12">
        <div className="mx-auto w-full max-w-3xl">
          <p className="rotulo text-tartan">Ferramentas</p>
          <h1 className="font-display mt-1 text-5xl leading-[0.92] font-black uppercase sm:text-6xl">
            Conta feita,
            <br />
            barra montada.
          </h1>
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
        <Ferramentas inicial={inicial} />
      </div>
    </div>
  );
}
