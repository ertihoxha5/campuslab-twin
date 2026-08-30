const allowedTones = new Set(["neutral", "success", "warning", "danger", "info"]);

export function StatusBadge({ children, tone = "neutral", dot = true }) {
  const resolvedTone = allowedTones.has(tone) ? tone : "neutral";
  return (
    <span className={`ui-status-badge is-${resolvedTone}`}>
      {dot && <span className="ui-status-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
