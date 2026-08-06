export const MAX_VISIBLE_OCCUPANTS = 16;

export function occupancyRepresentation(value) {
  const total = Math.max(0, Math.round(Number(value) || 0));
  const visible = Math.min(total, MAX_VISIBLE_OCCUPANTS);
  return {
    total,
    visible,
    aggregated: total > visible,
    peoplePerFigure: visible > 0 ? Math.ceil(total / visible) : 0,
  };
}
