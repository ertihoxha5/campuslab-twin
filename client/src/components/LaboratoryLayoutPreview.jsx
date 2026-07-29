import { Box } from "lucide-react";

const zoneTypeLabels = {
  general: "Zonë e përgjithshme",
  teaching: "Mësim",
  research: "Kërkim",
  preparation: "Përgatitje",
  storage: "Depo",
  safety: "Siguri",
};

export function LaboratoryLayoutPreview({
  zones,
  onSelectZone,
  selectedZoneId,
}) {
  if (!zones.length) {
    return (
      <div className="virtual-layout-empty">
        <Box size={24} />
        <strong>Pamja virtuale nuk është konfiguruar</strong>
        <p>
          Shtoni zona me pozicion dhe dimensione për të ndërtuar planin e
          laboratorit.
        </p>
      </div>
    );
  }

  const bounds = calculateBounds(zones);

  return (
    <div className="virtual-layout-preview">
      <div
        className="virtual-layout-canvas"
        aria-label="Plani virtual i zonave"
      >
        {zones.map((zone) => {
          const left =
            ((Number(zone.position?.x ?? 0) - bounds.minX) / bounds.width) *
            100;
          const top =
            ((Number(zone.position?.z ?? 0) - bounds.minZ) / bounds.depth) *
            100;
          const width =
            (Number(zone.dimensions?.width ?? 1) / bounds.width) * 100;
          const height =
            (Number(zone.dimensions?.depth ?? 1) / bounds.depth) * 100;
          return (
            <button
              type="button"
              className={`virtual-zone zone-${zone.zoneType} ${
                String(selectedZoneId) === String(zone.id) ? "is-selected" : ""
              }`}
              key={zone.id}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${Math.max(width, 8)}%`,
                height: `${Math.max(height, 12)}%`,
              }}
              title={`${zone.name} — ${zoneTypeLabels[zone.zoneType] ?? zone.zoneType}`}
              onClick={() => onSelectZone?.(zone)}
            >
              <strong>{zone.name}</strong>
              <small>{zone.code}</small>
            </button>
          );
        })}
      </div>
      <p>
        Pamje orientuese nga koordinatat X/Z dhe dimensionet e ruajtura të
        zonave.
      </p>
    </div>
  );
}

function calculateBounds(zones) {
  const minX = Math.min(...zones.map((zone) => Number(zone.position?.x ?? 0)));
  const minZ = Math.min(...zones.map((zone) => Number(zone.position?.z ?? 0)));
  const maxX = Math.max(
    ...zones.map(
      (zone) =>
        Number(zone.position?.x ?? 0) + Number(zone.dimensions?.width ?? 1),
    ),
  );
  const maxZ = Math.max(
    ...zones.map(
      (zone) =>
        Number(zone.position?.z ?? 0) + Number(zone.dimensions?.depth ?? 1),
    ),
  );
  return {
    minX,
    minZ,
    width: Math.max(maxX - minX, 1),
    depth: Math.max(maxZ - minZ, 1),
  };
}
