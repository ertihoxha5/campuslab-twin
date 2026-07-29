import { Component } from "react";
import { Link } from "react-router-dom";

export class WorkspaceErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) {
      console.error("Gabim në hapësirën private:", error);
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="workspace-error-state" role="alert">
          <span>Gabim</span>
          <h1>Faqja nuk mund të shfaqet</h1>
          <p>
            Ndodhi një gabim i papritur. Të dhënat e universitetit nuk u
            ndryshuan.
          </p>
          <Link to="/aplikacioni">Kthehu te përmbledhja</Link>
        </section>
      );
    }
    return this.props.children;
  }
}
