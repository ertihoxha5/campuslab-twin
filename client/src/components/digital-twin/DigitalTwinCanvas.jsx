/* eslint-disable react/no-unknown-property */
import { Component, Suspense } from "react";
import { Bounds, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { DefaultLaboratoryScene } from "./DefaultLaboratoryScene.jsx";
import { ProtectedLaboratoryModel } from "./ProtectedLaboratoryModel.jsx";
import { supportsWebGL } from "./webgl.js";

class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.failed) return <DefaultLaboratoryScene />;
    return this.props.children;
  }
}

function LaboratoryContent({ modelUrl, onModelLoaded, onModelError, children }) {
  if (!modelUrl) {
    return (
      <>
        <DefaultLaboratoryScene />
        {children}
      </>
    );
  }

  return (
    <ModelErrorBoundary onError={onModelError}>
      <Suspense fallback={<DefaultLaboratoryScene />}>
        <ProtectedLaboratoryModel url={modelUrl} onLoaded={onModelLoaded} />
        {children}
      </Suspense>
    </ModelErrorBoundary>
  );
}

function Scene({ modelUrl, onModelLoaded, onModelError, children }) {
  return (
    <>
      <color attach="background" args={["#ecebef"]} />
      <ambientLight intensity={1.2} />
      <directionalLight
        castShadow
        intensity={2.2}
        position={[4, 8, 5]}
        shadow-mapSize={[1024, 1024]}
      />
      <PerspectiveCamera makeDefault position={[10, 8, 12]} fov={48} />
      <Bounds fit clip observe margin={1.18}>
        <LaboratoryContent
          modelUrl={modelUrl}
          onModelLoaded={onModelLoaded}
          onModelError={onModelError}
        >
          {children}
        </LaboratoryContent>
      </Bounds>
      <OrbitControls
        makeDefault
        target={[0, 1.2, 0]}
        minDistance={5}
        maxDistance={26}
        maxPolarAngle={Math.PI / 2.04}
        enableDamping
      />
    </>
  );
}

class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function WebGLFallback() {
  return (
    <div className="digital-twin-fallback" role="alert">
      <strong>Pamja 3D nuk mund të hapet</strong>
      <p>
        Aktivizo përshpejtimin grafik në shfletues ose provo një pajisje që
        mbështet WebGL 2.
      </p>
    </div>
  );
}

export function DigitalTwinCanvas({
  modelUrl,
  onModelLoaded,
  onModelError,
  children,
}) {
  if (!supportsWebGL()) return <WebGLFallback />;

  return (
    <CanvasErrorBoundary fallback={<WebGLFallback />}>
      <div className="digital-twin-canvas" aria-label="Pamja 3D e laboratorit">
        <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: "high-performance" }}>
          <Suspense fallback={null}>
            <Scene
              modelUrl={modelUrl}
              onModelLoaded={onModelLoaded}
              onModelError={onModelError}
            >
              {children}
            </Scene>
          </Suspense>
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
}
