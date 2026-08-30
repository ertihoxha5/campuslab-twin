export function PageHeader({ eyebrow, title, description, actions, meta }) {
  return (
    <header className="ui-page-header">
      <div>
        {eyebrow && <p className="ui-page-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="ui-page-description">{description}</p>}
        {meta && <div className="ui-page-meta">{meta}</div>}
      </div>
      {actions && <div className="ui-page-actions">{actions}</div>}
    </header>
  );
}
