"use client";

import { useId, useState } from "react";

export function CampoSenha({
  name,
  label,
  autoComplete,
  minLength,
  value,
  onChange,
}: {
  name: string;
  label: string;
  autoComplete: string;
  minLength?: number;
  value?: string;
  onChange?: (valor: string) => void;
}) {
  const [visivel, setVisivel] = useState(false);
  const id = useId();

  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm text-track-night">
      {label}
      <div className="relative">
        <input
          id={id}
          type={visivel ? "text" : "password"}
          name={name}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className="w-full rounded-[var(--radius-badge)] border border-track-fog/40 bg-white px-3 py-2 pr-10 text-track-night outline-none focus:border-stadium-blue focus:ring-2 focus:ring-stadium-blue/30"
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-track-fog hover:text-track-night"
        >
          {visivel ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.5A9.7 9.7 0 0112 5c5 0 9 4 10 7-1 2.5-2.9 4.7-5.2 6.1M6.5 6.9C4.4 8.3 2.7 10.3 2 12c1 3 5 7 10 7 1.4 0 2.8-.3 4-.8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M2 12c1-3 5-7 10-7s9 4 10 7c-1 3-5 7-10 7s-9-4-10-7z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          )}
        </button>
      </div>
    </label>
  );
}
