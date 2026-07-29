export function WorkspaceSectionPage({ title, description }) {
  return (
    <section>
      <div className="workspace-page-heading">
        <p className="eyebrow">CampusLab Twin</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="workspace-empty-state">
        <strong>Nuk ka ende të dhëna për t’u shfaqur.</strong>
        <p>Ky modul do të plotësohet në hapin e tij të implementimit.</p>
      </div>
    </section>
  );
}
