/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo } from "react";
import { Center, Resize, useGLTF } from "@react-three/drei";
import {
  equipmentModelColors,
  findEquipmentByObjectNames,
} from "./model-equipment.js";

function objectNames(object, root) {
  const names = [];
  let current = object;
  while (current && current !== root) {
    if (current.name) names.push(current.name);
    current = current.parent;
  }
  return names;
}

export function ProtectedLaboratoryModel({
  url,
  equipment,
  onEquipmentSelect,
  onLoaded,
}) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((object) => {
      if (!object.isMesh) return;
      object.material = Array.isArray(object.material)
        ? object.material.map((material) => material.clone())
        : object.material.clone();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) {
        if (material.emissive) {
          material.userData.cltOriginalEmissive = material.emissive.getHex();
          material.userData.cltOriginalEmissiveIntensity =
            material.emissiveIntensity ?? 1;
        }
      }
      object.castShadow = true;
      object.receiveShadow = true;
    });
    return cloned;
  }, [scene]);

  useEffect(() => {
    onLoaded?.();
  }, [onLoaded, scene]);

  useEffect(() => {
    model.traverse((object) => {
      if (!object.isMesh) return;
      const item = findEquipmentByObjectNames(objectNames(object, model), equipment);
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) {
        if (!material.emissive) continue;
        if (item) {
          material.emissive.set(equipmentModelColors[item.status] ?? "#6b7280");
          material.emissiveIntensity = item.status === "fault" ? 0.75 : 0.3;
        } else {
          material.emissive.setHex(material.userData.cltOriginalEmissive ?? 0);
          material.emissiveIntensity =
            material.userData.cltOriginalEmissiveIntensity ?? 1;
        }
        material.needsUpdate = true;
      }
    });
  }, [equipment, model]);

  function selectObject(event) {
    const item = findEquipmentByObjectNames(
      objectNames(event.object, model),
      equipment,
    );
    if (!item) return;
    event.stopPropagation();
    onEquipmentSelect?.(item);
  }

  return (
    <Resize width={12.5} height={3.5} depth={8} preserveAspectRatio>
      <Center top>
        <primitive object={model} onClick={selectObject} />
      </Center>
    </Resize>
  );
}
