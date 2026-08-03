/* eslint-disable react/no-unknown-property */
import { Component, Suspense } from "react";
import { Bounds, Grid, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { supportsWebGL } from "./webgl.js";

function DefaultLaboratoryShell() {
  return (
    <group>
      <mesh receiveShadow position={[0, -0.06, 0]}>
        <boxGeometry args={[14, 0.12, 9]} />
        <meshStandardMaterial color="#d9d8dc" roughness={0.86} />
      </mesh>
      <mesh receiveShadow position={[0, 1.8, -4.44]}>
        <boxGeometry args={[14, 3.6, 0.12]} />
        <meshStandardMaterial color="#f5f4f7" />
      </mesh>
      <mesh receiveShadow position={[-6.94, 1.8, 0]}>
        <boxGeometry args={[0.12, 3.6, 9]} />
        <meshStandardMaterial color="#f5f4f7" />
      </mesh>
      <mesh receiveShadow position={[6.94, 1.8, 0]}>
        <boxGeometry args={[0.12, 3.6, 9]} />
        <meshStandardMaterial color="#f5f4f7" />
      </mesh>
      <Grid
        args={[14, 9]}
        cellColor="#b6b2bd"
        cellSize={0.5}
        cellThickness={0.35}
        sectionColor="#58427c"
        sectionSize={2}
        sectionThickness={0.65}
        fadeDistance={24}
        position={[0, 0.01, 0]}
      />
    </group>
  );
}

function Scene({ children }) {
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
        <DefaultLaboratoryShell />
        {children}
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

export function DigitalTwinCanvas({ children }) {
  if (!supportsWebGL()) return <WebGLFallback />;

  return (
    <CanvasErrorBoundary fallback={<WebGLFallback />}>
      <div className="digital-twin-canvas" aria-label="Pamja 3D e laboratorit">
        <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: "high-performance" }}>
          <Suspense fallback={null}>
            <Scene>{children}</Scene>
          </Suspense>
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
}
