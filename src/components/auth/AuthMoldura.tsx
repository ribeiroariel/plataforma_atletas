import Image from "next/image";
import Link from "next/link";
import { Marca } from "@/components/layout/Sidebar";

// Moldura das telas de entrada: foto de pista de um lado, formulário do
// outro. No celular a foto vira uma faixa no topo.
export function AuthMoldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-bone lg:flex-row">
      <div className="relative isolate flex h-44 shrink-0 flex-col justify-between overflow-hidden bg-ink p-5 text-white sm:h-56 lg:h-auto lg:min-h-screen lg:w-[46%] lg:p-10">
        <Image
          src="/fotos/corrida-402.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 46vw, 100vw"
          className="foto-zoom -z-10 object-cover object-[50%_22%]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/40 to-ink/30" />
        <Link href="/" aria-label="Voltar para o início">
          <Marca />
        </Link>
        <p className="font-display hidden text-6xl leading-[0.9] font-black uppercase lg:block xl:text-7xl">
          Treino feito
          <br />é treino <span className="text-tartan">anotado.</span>
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10 sm:py-16">
        <div className="animate-subir flex w-full justify-center">{children}</div>
      </div>
    </div>
  );
}
