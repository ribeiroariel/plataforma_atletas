// Ícones do menu. Todos no mesmo desenho: grade de 24, traço de 1,75,
// pontas arredondadas. Cada um tem uma parte "cheia" (classe icone-cheio)
// que fica invisível normalmente e acende em tom suave quando o item do menu
// está ativo — o ícone ganha peso sem trocar de forma (ver globals.css).

function Svg({ children, tamanho = 20 }: { children: React.ReactNode; tamanho?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamanho}
      height={tamanho}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="icone"
    >
      {children}
    </svg>
  );
}

const CHEIO = { className: "icone-cheio", fill: "currentColor", stroke: "none" } as const;

// Hoje: cronômetro (o treino do dia).
export const IconeHoje = (
  <Svg>
    <circle cx="12" cy="13.5" r="7.5" {...CHEIO} />
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 9.5v4l2.6 2.2" />
    <path d="M10 2.75h4M12 2.75V6" />
    <path d="M18.4 6.6l1.4-1.4" />
  </Svg>
);

// Agenda: calendário com o dia de hoje marcado.
export const IconeCalendario = (
  <Svg>
    <path d="M3.75 9.5V7.75a2.75 2.75 0 012.75-2.75h11a2.75 2.75 0 012.75 2.75V9.5z" {...CHEIO} />
    <rect x="3.75" y="5" width="16.5" height="15.5" rx="2.75" />
    <path d="M3.75 9.5h16.5M8 3v4M16 3v4" />
    <circle cx="15.5" cy="15.5" r="1.6" fill="currentColor" stroke="none" />
  </Svg>
);

// Evolução: barras subindo.
export const IconeGrafico = (
  <Svg>
    <rect x="4" y="13" width="4" height="7.5" rx="1.25" {...CHEIO} />
    <rect x="10" y="9" width="4" height="11.5" rx="1.25" {...CHEIO} />
    <rect x="16" y="4.5" width="4" height="16" rx="1.25" {...CHEIO} />
    <rect x="4" y="13" width="4" height="7.5" rx="1.25" />
    <rect x="10" y="9" width="4" height="11.5" rx="1.25" />
    <rect x="16" y="4.5" width="4" height="16" rx="1.25" />
  </Svg>
);

// Provas: medalha com fita.
export const IconeTrofeu = (
  <Svg>
    <circle cx="12" cy="15" r="5.75" {...CHEIO} />
    <path d="M8.2 3h-1.7l3.2 7.2M15.8 3h1.7l-3.2 7.2M9.6 3h4.8" />
    <circle cx="12" cy="15" r="5.75" />
    <path d="M12 12.4l.8 1.6 1.8.3-1.3 1.2.3 1.8-1.6-.85-1.6.85.3-1.8-1.3-1.2 1.8-.3z" strokeWidth="1.3" />
  </Svg>
);

// Contas (RM, anilhas, cronômetro): calculadora.
export const IconeFerramentas = (
  <Svg>
    <rect x="5" y="2.75" width="14" height="18.5" rx="2.75" {...CHEIO} />
    <rect x="5" y="2.75" width="14" height="18.5" rx="2.75" />
    <rect x="8" y="5.75" width="8" height="3.75" rx="1" />
    <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="13" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="17" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="17" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

// Ideias: lâmpada.
export const IconeFeedback = (
  <Svg>
    <path d="M12 2.75a6.5 6.5 0 00-3.9 11.7c.6.45.9 1.15.9 1.9v.9h6v-.9c0-.75.3-1.45.9-1.9A6.5 6.5 0 0012 2.75z" {...CHEIO} />
    <path d="M12 2.75a6.5 6.5 0 00-3.9 11.7c.6.45.9 1.15.9 1.9v.9h6v-.9c0-.75.3-1.45.9-1.9A6.5 6.5 0 0012 2.75z" />
    <path d="M9.75 20.75h4.5" />
  </Svg>
);

// Atletas (treinador): equipe.
export const IconePessoas = (
  <Svg>
    <circle cx="9" cy="8" r="3.5" {...CHEIO} />
    <path d="M2.75 20a6.25 6.25 0 0112.5 0z" {...CHEIO} />
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.75 20a6.25 6.25 0 0112.5 0" />
    <path d="M15.5 4.7a3.5 3.5 0 010 6.6M18 14a6.25 6.25 0 013.25 6" />
  </Svg>
);

// Comparar (treinador): balança.
export const IconeComparar = (
  <Svg>
    <path d="M2.75 14.5h6.5a3.25 3.25 0 01-6.5 0zM14.75 14.5h6.5a3.25 3.25 0 01-6.5 0z" {...CHEIO} />
    <path d="M12 3.5v17M8 20.5h8M5 7.25h14" />
    <path d="M5 7.25l-2.25 7.25h6.5zM19 7.25l-2.25 7.25h6.5z" />
    <path d="M2.75 14.5a3.25 3.25 0 006.5 0M14.75 14.5a3.25 3.25 0 006.5 0" />
  </Svg>
);

// Grade (não usado no menu hoje; mantido pra quem importar).
export const IconeGrid = (
  <Svg>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.75" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.75" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.75" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.75" />
  </Svg>
);

export const IconeSair = (
  <Svg tamanho={18}>
    <path d="M14 4.5V4a1.75 1.75 0 00-1.75-1.75h-6.5A1.75 1.75 0 004 4v16a1.75 1.75 0 001.75 1.75h6.5A1.75 1.75 0 0014 20v-.5" />
    <path d="M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5" />
  </Svg>
);

export const IconeTrocar = (
  <Svg tamanho={16}>
    <path d="M4 8h14.5M15 4.5L18.5 8 15 11.5" />
    <path d="M20 16H5.5M9 12.5L5.5 16 9 19.5" />
  </Svg>
);
