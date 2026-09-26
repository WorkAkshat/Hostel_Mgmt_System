// Line-art hostel building in the theme colours, used on Login and the dashboard.
const HostelIllustration = ({ className = 'w-full max-w-[380px] h-auto' }) => (
  <svg viewBox="0 0 360 250" className={className} aria-hidden="true">
    <circle cx="298" cy="46" r="22" fill="var(--color-sun-300)" />
    <rect x="36" y="52" width="46" height="12" rx="6" fill="#ffffff" />
    <rect x="52" y="44" width="30" height="12" rx="6" fill="#ffffff" />
    <rect x="232" y="84" width="40" height="10" rx="5" fill="#ffffff" opacity=".8" />

    <rect x="92" y="78" width="176" height="150" rx="8" fill="#ffffff" stroke="var(--color-brand-300)" strokeWidth="2" />
    <path d="M150 78 180 50l30 28" fill="var(--color-mint-200)" stroke="var(--color-brand-300)" strokeWidth="2" strokeLinejoin="round" />
    <rect x="166" y="60" width="28" height="12" rx="3" fill="var(--color-sun-200)" />

    {[0, 1, 2].map((row) =>
      [0, 1, 2, 3].map((col) => {
        const lit = (row + col) % 3 === 0;
        return (
          <rect
            key={`${row}-${col}`}
            x={110 + col * 38}
            y={96 + row * 34}
            width="24"
            height="22"
            rx="4"
            fill={lit ? 'var(--color-sun-200)' : 'var(--color-mint-200)'}
          />
        );
      })
    )}

    <rect x="164" y="192" width="32" height="36" rx="4" fill="var(--color-sun-300)" />
    <circle cx="189" cy="211" r="2" fill="var(--color-sun-800)" />

    <rect x="20" y="226" width="320" height="4" rx="2" fill="var(--color-brand-200)" />

    <rect x="58" y="190" width="4" height="36" rx="2" fill="var(--color-brand-500)" />
    <circle cx="60" cy="182" r="18" fill="var(--color-brand-300)" />
    <circle cx="48" cy="194" r="11" fill="var(--color-brand-200)" />

    <rect x="298" y="196" width="4" height="30" rx="2" fill="var(--color-brand-500)" />
    <circle cx="300" cy="188" r="15" fill="var(--color-brand-300)" />
    <circle cx="311" cy="198" r="9" fill="var(--color-brand-200)" />
  </svg>
);

export default HostelIllustration;
