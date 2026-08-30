export function LoadingSkeleton({ rows = 4, "aria-label": ariaLabel = "Duke ngarkuar" }) {
  return (
    <div className="ui-loading-skeleton" role="status" aria-label={ariaLabel}>
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} style={{ "--skeleton-width": `${92 - (index % 3) * 13}%` }} />
      ))}
    </div>
  );
}
