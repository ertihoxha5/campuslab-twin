export function zoneKind(zone) {
  const name = `${zone?.name ?? ""} ${zone?.code ?? ""}`.toLowerCase();
  if (/robot|automat/.test(name)) return "robotics";
  if (/m[eë]sim|class|informat|computer/.test(name)) return "classroom";
  if (/depo|storage|mir[eë]mbajt/.test(name)) return "storage";
  if (/sigur|safety/.test(name)) return "safety";
  if (/elektron|engineering/.test(name)) return "engineering";
  return "control";
}

export function workstationSlots(zone) {
  const kind = zoneKind(zone);
  if (kind === "classroom") {
    const columns = zone.size[0] > 5 ? 3 : 2;
    return Array.from({ length: columns * 2 }, (_, index) => ({
      x: -.3 + (index % columns) * (.6 / Math.max(1, columns - 1)),
      z: -.18 + Math.floor(index / columns) * .34,
    }));
  }
  if (kind === "control") return [{ x: -.25, z: -.18 }, { x: .2, z: -.18 }];
  if (kind === "engineering") return [{ x: -.25, z: -.22 }, { x: .2, z: -.22 }];
  return [];
}

export function rackSlots(zone, type) {
  const kind = zoneKind(zone);
  if (type === "network-rack" && kind === "control") return [{ x: -.38, z: -.38 }];
  if (type === "storage-rack" && kind === "storage") return [-.29, 0, .29].map((x) => ({ x, z: -.2 }));
  return [];
}

export function zoneSlotPosition(zone, type, index) {
  if (!zone) return null;
  if (type === "robot") return [zone.center[0], 0, zone.center[1]];
  const slots = type === "workstation" ? workstationSlots(zone) : rackSlots(zone, type);
  const slot = slots[index];
  if (!slot) return null;
  return [zone.center[0] + slot.x * zone.size[0], 0, zone.center[1] + slot.z * zone.size[1]];
}
