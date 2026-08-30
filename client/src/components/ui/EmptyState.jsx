import { Inbox } from "lucide-react";

export function EmptyState({ icon: Icon = Inbox, title, description, action, compact = false }) {
  return (
    <section className={`ui-empty-state${compact ? " is-compact" : ""}`}>
      <span className="ui-empty-icon" aria-hidden="true"><Icon size={22} /></span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && <div className="ui-empty-action">{action}</div>}
    </section>
  );
}
