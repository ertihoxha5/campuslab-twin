export function BrandLogo({ compact = false }) {
  return <span className={`brand-logo${compact ? " is-compact" : ""}`} aria-hidden="true"><svg viewBox="0 0 40 40"><rect x="1" y="1" width="38" height="38" rx="11" fill="currentColor"/><path d="M11 25.5V14.8c0-1 .8-1.8 1.8-1.8h5.7v4h-3.4v6.3h3.4v4h-5.7c-1 0-1.8-.8-1.8-1.8Z" fill="white"/><path d="M21.5 13h7.8v4h-3.5v10.3h-4.3V13Z" fill="white"/><circle cx="29.2" cy="26.8" r="2.2" fill="#8C9A68"/></svg></span>;
}
