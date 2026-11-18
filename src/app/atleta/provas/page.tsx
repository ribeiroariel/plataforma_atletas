import { createClient } from "@/lib/supabase/server";
import { dataCurta, diaDaSemanaLongo, diaDoMes, hojeBrasilIso, mesCurto } from "@/lib/datas";
import { agruparMarcas, buscarMarcas, buscarProvas, diasAte, formatarMarca, textoContagem } from "@/lib/treino/provas";
import { BotaoRemover, NovaMarcaForm, NovaProvaForm } from "@/components/provas/ProvasForms";

export default async function ProvasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: athlete } = await supabase.from("athletes").select("id").eq("user_id", user?.id).single();
  const ids = athlete ? [athlete.id] : [];

  const hoje = hojeBrasilIso();
  const [{ provas, disponivel }, marcas] = await Promise.all([buscarProvas(supabase, ids), buscarMarcas(supabase, ids)]);

  const futuras = provas.filter((p) => p.data >= hoje);
  const passadas = provas.filter((p) => p.data < hoje).reverse();
  const proxima = futuras[0];
  const grupos = agruparMarcas(marcas);

  return (
    <div className="flex flex-1 flex-col bg-bone">
      <header className="raias bg-ink px-5 pt-8 pb-7 text-white sm:px-8 sm:pt-12">
        <div className="mx-auto w-full max-w-4xl">
          <p className="rotulo text-tartan">Provas e marcas</p>
          {proxima ? (
            <>
              <h1 className="font-display mt-1 text-6xl leading-[0.9] font-black uppercase sm:text-8xl">
                {textoContagem(diasAte(proxima.data, hoje))}
              </h1>
              <p className="mt-3 text-lg font-semibold">{proxima.nome}</p>
              <p className="tabular-data text-xs text-white/55">
                {diaDaSemanaLongo(proxima.data)}, {dataCurta(proxima.data)}
                {proxima.local ? ` · ${proxima.local}` : ""}
              </p>
            </>
          ) : (
            <h1 className="font-display mt-1 text-5xl leading-[0.92] font-black uppercase sm:text-6xl">
              Qual é a
              <br />
              próxima?
            </h1>
          )}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-6 sm:px-8 sm:py-8">
        {!disponivel && (
          <p className="rounded-2xl bg-sinal/40 px-5 py-4 text-sm text-ink">
            Esta parte ainda está sendo ligada. Assim que o treinador concluir a configuração, você vai poder cadastrar
            provas e marcas aqui.
          </p>
        )}

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-extrabold uppercase">Próximas provas</h2>
          {futuras.length > 0 && (
            <ul className="flex flex-col gap-2">
              {futuras.map((p) => {
                const dias = diasAte(p.data, hoje);
                return (
                  <li key={p.id} className="flex items-center gap-4 rounded-2xl bg-white p-3 pr-2 ring-1 ring-ash">
                    <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl ${dias <= 7 ? "bg-tartan text-white" : "bg-bone"}`}>
                      <span className="font-display text-2xl leading-none font-extrabold tabular-nums">{diaDoMes(p.data)}</span>
                      <span className="rotulo text-[9px] opacity-80">{mesCurto(p.data)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display truncate text-xl leading-tight font-bold uppercase">{p.nome}</p>
                      <p className="tabular-data text-[11px] text-cinza">
                        {textoContagem(dias)}
                        {p.local ? ` · ${p.local}` : ""}
                      </p>
                    </div>
                    <BotaoRemover tipo="prova" id={p.id} rotulo={p.nome} />
                  </li>
                );
              })}
            </ul>
          )}
          {disponivel && (
            <div className="rounded-2xl bg-white p-4 ring-1 ring-ash sm:p-5">
              <NovaProvaForm hoje={hoje} />
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-extrabold uppercase">Suas marcas</h2>
          {grupos.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {grupos.map((g) => (
                <li key={`${g.prova}-${g.unidade}`} className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-ash">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="rotulo text-cinza">{g.prova}</p>
                      <p className="font-display text-4xl leading-none font-black tabular-nums">
                        {formatarMarca(g.melhor.valor, g.unidade)}
                      </p>
                      <p className="tabular-data mt-1 text-[11px] text-cinza">
                        melhor marca · {dataCurta(g.melhor.data)} {g.melhor.data.slice(0, 4)}
                      </p>
                    </div>
                    <span className="rotulo rounded-md bg-sinal px-2 py-1 text-[10px] text-ink">★ recorde</span>
                  </div>
                  <ol className="flex flex-col border-t border-ash">
                    {[...g.marcas].reverse().map((m) => (
                      <li key={m.id} className="flex items-center gap-3 border-b border-ash/60 py-1.5 last:border-0">
                        <span className="tabular-data w-20 shrink-0 text-[11px] text-cinza">
                          {dataCurta(m.data)} {m.data.slice(2, 4)}
                        </span>
                        <span className={`font-display text-lg font-bold tabular-nums ${m.id === g.melhor.id ? "text-tartan" : ""}`}>
                          {formatarMarca(m.valor, m.unidade)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-xs text-cinza">{m.competicao ?? ""}</span>
                        <BotaoRemover tipo="marca" id={m.id} rotulo={`a marca de ${dataCurta(m.data)}`} />
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          ) : (
            disponivel && (
              <p className="rounded-2xl bg-white px-5 py-6 text-center text-sm text-cinza ring-1 ring-ash">
                Nenhuma marca ainda. Registre seu resultado depois de cada competição e acompanhe a evolução por prova.
              </p>
            )
          )}
          {disponivel && (
            <div className="rounded-2xl bg-white p-4 ring-1 ring-ash sm:p-5">
              <NovaMarcaForm hoje={hoje} provasConhecidas={grupos.map((g) => g.prova)} />
            </div>
          )}
        </section>

        {passadas.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-extrabold uppercase">Provas que já passaram</h2>
            <ul className="flex flex-col gap-1">
              {passadas.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl bg-white/60 py-1 pr-1 pl-4 text-sm">
                  <span className="tabular-data w-24 shrink-0 text-[11px] text-cinza">
                    {dataCurta(p.data)} {p.data.slice(0, 4)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                  <BotaoRemover tipo="prova" id={p.id} rotulo={p.nome} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
