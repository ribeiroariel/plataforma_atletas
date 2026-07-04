type IconProps = { className?: string };

export function IconeCorrida({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <circle cx="15.2" cy="4.2" r="2.2" />
      <path
        d="M13.5 8.1l-3 2.4-3.6-1.4-.9 1.9 4.4 1.9 2-1.5.7 2.1-3.9 2.3-2 3.7 1.9 1 1.7-3.1 4-2.3 1.6 3-1.6 1.1-2.1-4-.4-2.5-2.4-3.6c-.3-.4-.7-.7-1.1-.8z"
      />
    </svg>
  );
}

export function IconePista({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 3a7 7 0 000 14h8a7 7 0 000-14H8zm0 2.6a4.4 4.4 0 100 8.8 4.4 4.4 0 000-8.8zM16 5.6a4.4 4.4 0 100 8.8 4.4 4.4 0 000-8.8z"
      />
      <rect x="4" y="19" width="16" height="2" rx="1" />
    </svg>
  );
}

export function IconeAcademia({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="2" y="10" width="3" height="4" rx="1" />
      <rect x="19" y="10" width="3" height="4" rx="1" />
      <rect x="5.5" y="8" width="2.5" height="8" rx="1" />
      <rect x="16" y="8" width="2.5" height="8" rx="1" />
      <rect x="8" y="11" width="8" height="2" />
    </svg>
  );
}

export function IconeBicicleta({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="5.5" cy="17" r="3" />
      <circle cx="18.5" cy="17" r="3" />
      <path d="M5.5 17l4-8h4l3 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 9h3M12.5 9l2.5 3.5h4.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="9" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconeCardio({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 20.5S3 14.9 3 8.9C3 5.9 5.2 4 7.6 4c1.6 0 3.2.9 4.4 2.7C13.2 4.9 14.8 4 16.4 4 18.8 4 21 5.9 21 8.9c0 6-9 11.6-9 11.6z" />
      <path
        d="M6 10h2.4l1-2.4 1.6 4.8 1.2-2.4H16"
        fill="none"
        stroke="#F4F7FA"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
