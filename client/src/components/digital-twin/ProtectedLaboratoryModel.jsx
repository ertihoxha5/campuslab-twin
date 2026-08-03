import { useEffect } from "react";
import { Center, Clone, Resize, useGLTF } from "@react-three/drei";

export function ProtectedLaboratoryModel({ url, onLoaded }) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    onLoaded?.();
  }, [onLoaded, scene]);

  return (
    <Resize width={12.5} height={3.5} depth={8} preserveAspectRatio>
      <Center top>
        <Clone object={scene} castShadow receiveShadow />
      </Center>
    </Resize>
  );
}
