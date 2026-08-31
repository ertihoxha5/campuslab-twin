import { OrbitControls, PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";
import { CAMERA_PRESETS } from "./twin-config.js";

export function TwinCameraController({ mode, focusPosition, resetNonce, zones=[] }) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);
  const controls = useRef();
  const transition = useRef(null);
  const pressed = useRef(new Set());
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());
  const target = useMemo(() => mode === "focus" && focusPosition ? new Vector3(...focusPosition).add(new Vector3(0, .7, 0)) : new Vector3(...(CAMERA_PRESETS[mode]?.target ?? CAMERA_PRESETS.overview.target)), [focusPosition, mode]);
  const bounds=useMemo(()=>zones.length?{minX:Math.min(...zones.map((zone)=>zone.center[0]-zone.size[0]/2))+.28,maxX:Math.max(...zones.map((zone)=>zone.center[0]+zone.size[0]/2))-.28,minZ:Math.min(...zones.map((zone)=>zone.center[1]-zone.size[1]/2))+.28,maxZ:Math.max(...zones.map((zone)=>zone.center[1]+zone.size[1]/2))-.28}:{minX:-9.25,maxX:9.25,minZ:-5.85,maxZ:5.85},[zones]);

  useEffect(() => {
    if (mode === "walk") { camera.position.set(0, 1.65, -.25); camera.lookAt(0, 1.5, 3); invalidate(); return; }
    const preset = CAMERA_PRESETS[mode] ?? CAMERA_PRESETS.overview;
    const endPosition = mode === "focus" && focusPosition ? new Vector3(...focusPosition).add(new Vector3(4.2, 3.5, 4.4)) : new Vector3(...preset.position);
    transition.current = { from: camera.position.clone(), to: endPosition, elapsed: 0, duration: .72 };
    if (camera.isPerspectiveCamera) camera.fov = preset.fov;
    if (camera.isOrthographicCamera) camera.zoom = mode === "focus" ? 86 : mode === "top" ? 49 : 54;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, focusPosition, invalidate, mode, resetNonce]);

  useEffect(() => {
    const down = (event) => pressed.current.add(event.code);
    const up = (event) => pressed.current.delete(event.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useFrame((_state, delta) => {
    const active = transition.current;
    if (mode === "walk") {
      if (!["KeyW", "KeyA", "KeyS", "KeyD"].some((key) => pressed.current.has(key))) return;
      camera.getWorldDirection(forward.current); forward.current.y = 0; forward.current.normalize();
      right.current.crossVectors(forward.current, camera.up).normalize();
      const movement = new Vector3(); const speed = Math.min(delta, .05) * 2.7;
      if (pressed.current.has("KeyW")) movement.addScaledVector(forward.current, speed);
      if (pressed.current.has("KeyS")) movement.addScaledVector(forward.current, -speed);
      if (pressed.current.has("KeyD")) movement.addScaledVector(right.current, speed);
      if (pressed.current.has("KeyA")) movement.addScaledVector(right.current, -speed);
      camera.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, camera.position.x + movement.x));
      camera.position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, camera.position.z + movement.z));
      camera.position.y = 1.65;
      invalidate();
      return;
    }
    if (!active) return;
    active.elapsed = Math.min(active.duration, active.elapsed + delta);
    const t = 1 - Math.pow(1 - active.elapsed / active.duration, 3);
    camera.position.lerpVectors(active.from, active.to, t);
    controls.current?.target.lerp(target, .14);
    controls.current?.update();
    invalidate();
    if (active.elapsed >= active.duration) transition.current = null;
  });

  if (mode === "walk") return <PointerLockControls makeDefault />;
  return <OrbitControls ref={controls} makeDefault target={target} enableDamping dampingFactor={.075} minDistance={5} maxDistance={35} minPolarAngle={.25} maxPolarAngle={Math.PI / 2.08} panSpeed={.62} rotateSpeed={.58} onChange={invalidate} />;
}
