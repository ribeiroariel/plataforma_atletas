# Guia visual — Plataforma de Treino

Base para qualquer mudança **visual** do site (cores, tipografia, layout,
animação, fotos, textos de tela). A parte funcional já está estabelecida:
este guia não pede migração de stack nem troca de fluxo de deploy.

Consolidado em 25/11/2026 a partir do site como está publicado, das
preferências que o Ariel já deu e de um briefing de design (NotebookLM) —
só a parte visual do briefing foi aproveitada.

---

## 1. Para quem e como é usado

- **Quem usa**: atletas que recebem planilha do Ariel (e de quem mais usar a
  plataforma) e o treinador. Não é um produto comercial.
- **Onde**: no celular, na academia ou na pista, entre uma série e outra —
  mão suada, pouco tempo, às vezes sol forte. O computador é secundário
  (mais usado pelo treinador).
- **Ideia central**: registrar o treino tem que ser rápido. "Anotar leva dois
  toques."

## 2. Identidade

### Cores (tokens em `src/app/globals.css`)

| Token | Hex | Uso |
|---|---|---|
| `ink` | `#0d0f12` | Fundo dos cabeçalhos, menu, cartões escuros |
| `ink-2` / `ink-3` | `#1a1d23` / `#2a2e36` | Camadas sobre o escuro |
| `bone` | `#f5f3ee` | Fundo das páginas (papel cru, nunca branco puro) |
| `ash` | `#e3dfd5` | Bordas, divisórias, trilhos de progresso |
| `tartan` | `#e6411a` | **Único acento**: ação principal, item ativo, destaque |
| `sinal` | `#ffc83d` | Avisos, recordes, semana leve — pontual, nunca decorativo |
| `ok` | `#1f9d61` | Concluído / registrado |
| `erro` | `#c2182b` | Erro, treino perdido, dor alta |
| `cinza` | `#747880` | Texto secundário |

Regras:
- Uma página tem **um** laranja dominante (o botão ou o item ativo). Se tudo
  for laranja, nada é.
- Verde só significa "feito". Amarelo só significa "atenção". Não usar essas
  cores como enfeite.
- Fundo escuro com raias (`.raias`) nos cabeçalhos; conteúdo sobre `bone`.

### Tipografia

- **Big Shoulders** (`font-display`, caixa alta, peso 800–900): títulos e
  **todos os números grandes** (cargas, placar, contagens).
- **Archivo** (`font-body`): texto corrido, botões, rótulos de formulário.
- **IBM Plex Mono** (`.rotulo` e `.tabular-data`): sobretítulos pequenos em
  caixa alta espaçada e qualquer número em tabela/linha (datas, tempos).
- Números sempre com `tabular-nums` pra não "dançarem" quando mudam.

### Formas

- Cartões: `rounded-2xl`, fundo branco, `ring-1 ring-ash` (não sombra pesada).
- Botões principais: altura mínima 48–56 px, cantos `rounded-xl` ou pílula.
- Ícones do menu: grade de 24, traço 1,75, pontas arredondadas, com parte
  "cheia" que acende no item ativo (`src/components/layout/iconesNav.tsx`).

## 3. Regras de uso em campo (celular)

- Área de toque mínima de **48 × 48 px** em tudo que se toca durante o
  treino (+/−, ✓, abas de dia, cronômetro).
- Campos de carga com número grande (`text-2xl` display) e teclado numérico
  (`inputMode`).
- O que se usa no treino fica ao alcance do polegar: barra de abas embaixo
  no celular, menu lateral só no computador.
- Contraste alto o bastante pra ler no sol: texto secundário nunca mais
  claro que `cinza` sobre `bone`, nem abaixo de `white/45` sobre `ink`.

## 4. Movimento

- Sutil e com propósito: algo surge ao entrar na tela (`Revelar`), uma série
  confirmada "carimba" (`animate-carimbo`), anilhas deslizam na barra.
- **Uma** interação de destaque por área, não várias competindo.
- Nada se mexe sozinho sem motivo. A faixa rolando de palavras foi tirada a
  pedido do Ariel ("artificial demais") — não voltar com letreiro em loop.
- Sempre respeitar `prefers-reduced-motion` (já tratado em `globals.css`).

## 5. Fotos

- **Só fotos dos atletas** (sem fotos do Ariel) — pedido explícito.
- Toda foto entra por `src/lib/fotos.ts` com o **ponto de foco** (onde está o
  atleta) e é exibida com `FotoFoco`, que mantém o atleta no centro em
  qualquer formato de quadro. Ao adicionar foto: cortar faixas/logos de
  evento, converter pra `.webp`, definir o foco e conferir no celular.
- Fotos de fundo sempre com gradiente escuro por cima pra o texto ler.

## 6. Tom dos textos

- Simples e direto, de treinador pra atleta. **Poucas frases de efeito**: o
  Ariel pediu pra tirar slogans ("O treino é seu. O registro também.") e o
  tom comercial.
- Não falar "os atletas do Ariel" — a plataforma serve pra quem registra
  treino, em geral.
- O título da abertura ("Treino feito é treino anotado.") foi aprovado e
  fica. Sobretítulo: "Plataforma de treino".
- Rótulos de botão dizem a ação: "Concluir treino", "Repetir", "Registrar".

## 7. O que evitar (anti "cara de IA")

- Grade de três cartões iguais repetida página após página.
- Gradientes coloridos genéricos, brilhos, vidro fosco sem função.
- Ícones genéricos misturados de estilos diferentes.
- Emojis como ícone.
- Seções que só existem pra encher (depoimentos inventados, números de
  marketing).
- Texto em bloco sem ritmo: alternar número grande, rótulo curto e frase.

## 8. Componentes de referência

| Componente | Onde | Uso |
|---|---|---|
| Cabeçalho escuro com raias | todas as páginas internas | sobretítulo `.rotulo` laranja + título display |
| `ExercicioCard` | `components/treino/` | padrão de registro: chips da prescrição, séries com +/−, ✓ grande |
| `SessaoPainel` | `components/treino/` | placar ao vivo (exercícios, registros, kg somados) |
| `TimerDescanso` | `components/treino/` | cronômetro flutuante sobre a barra de abas |
| `BarraAnilhas` | `components/ferramentas/` | desenho da barra, cores oficiais das anilhas |
| `FotoFoco` / `FotoRotativa` | `components/ui/` | fotos com o atleta centralizado |
| `Revelar` | `components/ui/` | entrada suave ao rolar |

## 9. Como fazer uma mudança visual

1. Olhar a tela atual no celular (375 px) e no computador antes de mexer.
2. Se a mudança for grande, descrever a proposta pro Ariel antes de
   codificar (ele aprova ou rejeita por item).
3. Reaproveitar tokens e componentes acima; criar cor ou fonte nova só se
   não houver equivalente.
4. Conferir na prévia local nos dois tamanhos, com movimento e sem.
5. Trabalhar num ramo novo e entregar o link do pull request pra ele
   publicar (ele faz o merge pelo botão do GitHub).
