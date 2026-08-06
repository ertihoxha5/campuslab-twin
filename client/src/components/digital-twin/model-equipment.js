export const equipmentModelColors = {
  active: "#6c7653",
  inactive: "#6b7280",
  fault: "#b53e3e",
  maintenance: "#58427c",
};

export function findEquipmentByObjectNames(names, equipment) {
  const normalizedNames = new Set(
    names.map((name) => String(name ?? "").trim().toLowerCase()).filter(Boolean),
  );
  return equipment.find((item) => {
    const reference = String(item.object3dReference ?? "").trim().toLowerCase();
    return reference && normalizedNames.has(reference);
  });
}
