export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="yg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14b8a6" /><stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#yg)" />
      <path d="M18 17l14 17 14-17M32 34v15" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="12" r="0" fill="#fff" />
    </svg>
  );
}
