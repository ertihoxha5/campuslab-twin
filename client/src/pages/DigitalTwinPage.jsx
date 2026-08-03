import { useEffect, useState } from "react";
import { Box, Focus, Info, LayoutGrid, Map } from "lucide-react";
import { api } from "@/api/client.js";
import { DigitalTwinCanvas } from "@/components/digital-twin/DigitalTwinCanvas.jsx";

export function DigitalTwinPage() {
  const [laboratories, setLaboratories] = useState([]);
  const [laboratoryId, setLaboratoryId] = useState("");
  const [laboratoryDetail, setLaboratoryDetail] = useState(null);
  const [modelState, setModelState] = useState("fallback");
  const [cameraMode, setCameraMode] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get("/api/laboratories?page=1&pageSize=100&status=active")
      .then((response) => {
        const options = response.data.laboratories ?? [];
        setLaboratories(options);
        setLaboratoryId(String(options[0]?.id ?? ""));
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!laboratoryId) {
      setLaboratoryDetail(null);
      return;
    }
    let active = true;
    setCameraMode("overview");
    setModelState("loading");
    api
      .get(`/api/laboratories/${laboratoryId}`)
      .then((response) => {
        if (!active) return;
        const detail = response.data.laboratory;
        setLaboratoryDetail(detail);
        setModelState(
          detail.modelMimeType?.startsWith("model/") ? "loading" : "fallback",
        );
      })
      .catch((error) => {
        if (!active) return;
        setLaboratoryDetail(null);
        setModelState("fallback");
        setMessage(error.message);
      });
    return () => {
      active = false;
    };
  }, [laboratoryId]);

  const selectedLaboratory = laboratories.find(
    (laboratory) => String(laboratory.id) === laboratoryId,
  );
  const modelUrl = laboratoryDetail?.modelMimeType?.startsWith("model/")
    ? `/api/laboratories/${laboratoryId}/model?v=${laboratoryDetail.modelFileId}`
    : undefined;

  return (
    <section className="workspace-overview digital-twin-page">
      <div className="workspace-page-heading">
        <p className="eyebrow">Laboratori virtual</p>
        <h1>Digital Twin 3D</h1>
        <p>Eksploro vetëm laboratorët ku ke qasje.</p>
      </div>

      <div className="digital-twin-toolbar">
        <label>
          <span>Laboratori</span>
          <select
            value={laboratoryId}
            onChange={(event) => setLaboratoryId(event.target.value)}
            disabled={loading}
          >
            {laboratories.length === 0 && (
              <option value="">Nuk ka laborator aktiv</option>
            )}
            {laboratories.map((laboratory) => (
              <option key={laboratory.id} value={laboratory.id}>
                {laboratory.name} ({laboratory.code})
              </option>
            ))}
          </select>
        </label>
        {selectedLaboratory && (
          <div className="digital-twin-laboratory-name">
            <Box size={18} />
            <strong>{selectedLaboratory.name}</strong>
          </div>
        )}
      </div>

      {message && (
        <div className="dashboard-error" role="alert">
          <strong>Laboratorët nuk mund të ngarkohen</strong>
          <p>{message}</p>
        </div>
      )}

      {laboratoryId ? (
        <div className="digital-twin-stage">
          <div className="digital-twin-camera-controls" aria-label="Mënyra e kamerës">
            <button
              type="button"
              className={cameraMode === "overview" ? "active" : ""}
              onClick={() => setCameraMode("overview")}
              aria-pressed={cameraMode === "overview"}
            >
              <LayoutGrid size={15} /> Përgjithshme
            </button>
            <button
              type="button"
              className={cameraMode === "top" ? "active" : ""}
              onClick={() => setCameraMode("top")}
              aria-pressed={cameraMode === "top"}
            >
              <Map size={15} /> Nga lart
            </button>
            <button
              type="button"
              className={cameraMode === "focus" ? "active" : ""}
              onClick={() => setCameraMode("focus")}
              aria-pressed={cameraMode === "focus"}
            >
              <Focus size={15} /> Fokus
            </button>
          </div>
          <DigitalTwinCanvas
            key={`${laboratoryId}:${laboratoryDetail?.modelFileId ?? "default"}`}
            modelUrl={modelUrl}
            cameraMode={cameraMode}
            onModelLoaded={() => setModelState("loaded")}
            onModelError={() => setModelState("failed")}
          />
          <div className={`digital-twin-model-state ${modelState}`} role="status">
            {modelState === "loaded"
              ? `Modeli: ${laboratoryDetail.modelOriginalName}`
              : modelState === "loading"
                ? "Po ngarkohet modeli 3D…"
                : modelState === "failed"
                  ? "Modeli nuk u hap; po përdoret skena bazë."
                  : laboratoryDetail?.modelMimeType?.startsWith("image/")
                    ? "Është ngarkuar një foto; po përdoret skena bazë 3D."
                    : "Po përdoret skena bazë 3D."}
          </div>
          <div className="digital-twin-help">
            <Info size={17} />
            <p>Rrotullo me zvarritje, afrohu me scroll dhe lëviz pamjen me butonin e djathtë.</p>
          </div>
        </div>
      ) : !loading && !message ? (
        <div className="workspace-empty-state">
          <Box size={26} />
          <h2>Nuk ka laborator për t’u paraqitur</h2>
          <p>Krijo ose aktivizo një laborator për të hapur pamjen 3D.</p>
        </div>
      ) : null}
    </section>
  );
}
