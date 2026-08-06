/* eslint-disable react/no-unknown-property */
import { Component, Suspense, useEffect, useRef } from "react";
import {
  Bounds,
  OrbitControls,
  PerspectiveCamera,
  PointerLockControls,
  useProgress,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { DefaultLaboratoryScene } from "./DefaultLaboratoryScene.jsx";
import {
  FIRST_PERSON_START,
  resolveFirstPersonMove,
} from "./first-person-movement.js";
import { ProtectedLaboratoryModel } from "./ProtectedLaboratoryModel.jsx";
import { supportsWebGL } from "./webgl.js";
import { resolveGraphicsQuality } from "./graphics-quality.js";

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

function LaboratoryContent({
  modelUrl,
  equipment,
  onEquipmentSelect,
  onModelLoaded,
  onModelError,
  children,
}) {
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
        <ProtectedLaboratoryModel
          url={modelUrl}
          equipment={equipment}
          onEquipmentSelect={onEquipmentSelect}
          onLoaded={onModelLoaded}
        />
        {children}
      </Suspense>
    </ModelErrorBoundary>
  );
}

const cameraPresets = {
  overview: { position: [10, 7.5, 11], target: [0, 1.2, 0] },
  top: { position: [0, 15, 0.01], target: [0, 0, 0] },
  focus: { position: [5.2, 3.3, 5.6], target: [0, 1.15, 0] },
};

function FirstPersonController({ resetNonce }) {
  const camera = useThree((state) => state.camera);
  const pressedKeys = useRef(new Set());
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());

  useEffect(() => {
    camera.position.set(
      FIRST_PERSON_START.x,
      FIRST_PERSON_START.y,
      FIRST_PERSON_START.z,
    );
    camera.lookAt(0, FIRST_PERSON_START.y, 0);
  }, [camera, resetNonce]);

  useEffect(() => {
    const onKeyDown = (event) => pressedKeys.current.add(event.code);
    const onKeyUp = (event) => pressedKeys.current.delete(event.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useFrame((_state, frameDelta) => {
    const keys = pressedKeys.current;
    if (!["KeyW", "KeyA", "KeyS", "KeyD"].some((key) => keys.has(key))) return;
    const distance = Math.min(frameDelta, 0.05) * 3.2;
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up).normalize();
    const movement = { x: 0, z: 0 };
    if (keys.has("KeyW")) {
      movement.x += forward.current.x * distance;
      movement.z += forward.current.z * distance;
    }
    if (keys.has("KeyS")) {
      movement.x -= forward.current.x * distance;
      movement.z -= forward.current.z * distance;
    }
    if (keys.has("KeyD")) {
      movement.x += right.current.x * distance;
      movement.z += right.current.z * distance;
    }
    if (keys.has("KeyA")) {
      movement.x -= right.current.x * distance;
      movement.z -= right.current.z * distance;
    }
    const next = resolveFirstPersonMove(camera.position, movement);
    camera.position.set(next.x, next.y, next.z);
  });

  return <PointerLockControls makeDefault />;
}

function CameraRig({ mode, resetNonce, focusTarget }) {
  const controls = useRef(null);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    if (mode === "firstPerson") return;
    const preset = cameraPresets[mode] ?? cameraPresets.overview;
    const target = mode === "focus" && focusTarget ? focusTarget : preset.target;
    const position =
      mode === "focus" && focusTarget
        ? [target[0] + 4, target[1] + 2.4, target[2] + 4]
        : preset.position;
    camera.position.set(...position);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
    controls.current?.target.set(...target);
    controls.current?.update();
  }, [camera, focusTarget, mode]);

  if (mode === "firstPerson") {
    return <FirstPersonController resetNonce={resetNonce} />;
  }

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={
        mode === "focus" && focusTarget
          ? focusTarget
          : (cameraPresets[mode]?.target ?? cameraPresets.overview.target)
      }
      minDistance={3}
      maxDistance={26}
      maxPolarAngle={Math.PI / 2.04}
      enableDamping
    />
  );
}

function Scene({
  modelUrl,
  onModelLoaded,
  onModelError,
  cameraMode,
  firstPersonReset,
  focusTarget,
  quality,
  equipment,
  onEquipmentSelect,
  children,
}) {
  return (
    <>
      <color attach="background" args={["#ecebef"]} />
      <ambientLight intensity={1.2} />
      <directionalLight
        castShadow={quality === "high"}
        intensity={2.2}
        position={[4, 8, 5]}
        shadow-mapSize={quality === "high" ? [1024, 1024] : [512, 512]}
      />
      <PerspectiveCamera makeDefault position={[10, 8, 12]} fov={48} />
      <Bounds clip margin={1.18}>
        <LaboratoryContent
          modelUrl={modelUrl}
          onModelLoaded={onModelLoaded}
          onModelError={onModelError}
          equipment={equipment}
          onEquipmentSelect={onEquipmentSelect}
        >
          {children}
        </LaboratoryContent>
      </Bounds>
      <CameraRig
        mode={cameraMode}
        resetNonce={firstPersonReset}
        focusTarget={focusTarget}
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

function LoadingOverlay() {
  const { active, progress, item } = useProgress();
  if (!active) return null;
  return (
    <div className="digital-twin-loading" role="status">
      <strong>Po ngarkohet modeli 3D…</strong>
      <span>{Math.round(progress)}%</span>
      <div><i style={{ width: `${progress}%` }} /></div>
      {item && <small>{item.split("/").at(-1)}</small>}
    </div>
  );
}

export function DigitalTwinCanvas({
  modelUrl,
  onModelLoaded,
  onModelError,
  cameraMode = "overview",
  firstPersonReset = 0,
  focusTarget,
  quality = "auto",
  equipment = [],
  onEquipmentSelect,
  children,
}) {
  if (!supportsWebGL()) return <WebGLFallback />;
  const resolvedQuality = resolveGraphicsQuality(quality, {
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory,
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  });

  return (
    <CanvasErrorBoundary fallback={<WebGLFallback />}>
      <div className="digital-twin-canvas" aria-label="Pamja 3D e laboratorit">
        <LoadingOverlay />
        <Canvas
          shadows={resolvedQuality === "high"}
          dpr={resolvedQuality === "high" ? [1, 1.5] : 1}
          gl={{
            antialias: resolvedQuality === "high",
            powerPreference:
              resolvedQuality === "high" ? "high-performance" : "low-power",
          }}
        >
          <Suspense fallback={null}>
            <Scene
              modelUrl={modelUrl}
              onModelLoaded={onModelLoaded}
              onModelError={onModelError}
              cameraMode={cameraMode}
              firstPersonReset={firstPersonReset}
              focusTarget={focusTarget}
              quality={resolvedQuality}
              equipment={equipment}
              onEquipmentSelect={onEquipmentSelect}
            >
              {children}
            </Scene>
          </Suspense>
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
}
