export function PageIntro({ eyebrow, title, description }) {
  return (
    <section className="page-intro">
      <div className="site-container narrow">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}
