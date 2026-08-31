import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api/client.js";
import { validatePlacement } from "./placement-geometry.js";
import { normalizeZones } from "./dynamic-scene.js";

const INITIAL = { assetType: "temperature_sensor", name: "Sensor temperature", assetCode: "", zoneId: "", mountingSurface: "wall", parentEquipmentId:null,visualAssetId:null,position: null, rotation: { x: 0, y: 0, z: 0 },scale:{x:1,y:1,z:1},visible:true,status: "online" };

export function useAssetPlacement({ laboratoryId, placements, onSaved }) {
  const [zones, setZones] = useState([]), [open, setOpen] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const [draft, setDraft] = useState(INITIAL);
  useEffect(() => { if (!laboratoryId) return; api.get(`/api/laboratories/${laboratoryId}/zones`).then((response) => { const list = normalizeZones(response.data.zones ?? []); setZones(list); setDraft((current) => ({ ...current, zoneId: current.zoneId || String(list[0]?.sourceId ?? "") })); }).catch((requestError) => setError(requestError.message)); }, [laboratoryId]);
  const zone = useMemo(() => zones.find((item) => String(item.sourceId) === String(draft.zoneId)), [draft.zoneId, zones]);
  const validation = useMemo(() => draft.position ? validatePlacement({ position: draft.position, zone, surface: draft.mountingSurface, placements }) : { valid: false, reason: "Kliko një sipërfaqe në laborator." }, [draft.mountingSurface, draft.position, placements, zone]);
  const update = useCallback((changes) => setDraft((current) => ({ ...current, ...changes })), []);
  const begin = useCallback((template={}) => { setOpen(true); setError(""); setDraft((current) => ({ ...INITIAL,...template,zoneId:String(template.zoneId??current.zoneId??zones[0]?.sourceId??""),mountingSurface:template.mountingSurface??"floor",assetCode:template.assetCode??`TWIN-${Date.now().toString().slice(-6)}` })); }, [zones]);
  const cancel = useCallback(() => { setOpen(false); setError(""); setDraft((current) => ({ ...current, position: null })); }, []);
  const place = useCallback((position, rotation) => update({ position, rotation: rotation ?? draft.rotation }), [draft.rotation, update]);
  async function confirm() { if (!validation.valid || saving) return; setSaving(true); setError(""); try { await api.post(`/api/digital-twin/${laboratoryId}/assets`, { ...draft, installationDate: new Date().toISOString().slice(0, 10) }); await onSaved?.(); cancel(); } catch (requestError) { setError(requestError.message); } finally { setSaving(false); } }
  return { open, begin, cancel, zones, zone, draft, update, place, validation, saving, error, confirm };
}
