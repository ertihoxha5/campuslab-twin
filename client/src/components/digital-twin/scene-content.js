export function visibleSceneContent(assets = [], placements = []) {
  const linkedEquipment = new Set();
  const uniquePlacements = placements.filter((item) => {
    const key = item.parentEquipmentId == null ? null : String(item.parentEquipmentId);
    if (!key) return true;
    if (linkedEquipment.has(key)) return false;
    linkedEquipment.add(key);
    return true;
  });
  return {
    assets: assets.filter((asset) => !linkedEquipment.has(String(asset.apiId ?? asset.id))),
    placements: uniquePlacements,
  };
}
