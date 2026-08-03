import { useEffect, useState } from "react";
import { Box, Info } from "lucide-react";
import { api } from "@/api/client.js";
import { DigitalTwinCanvas } from "@/components/digital-twin/DigitalTwinCanvas.jsx";

export function DigitalTwinPage() {
  const [laboratories, setLaboratories] = useState([]);
  const [laboratoryId, setLaboratoryId] = useState("");
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

  const selectedLaboratory = laboratories.find(
    (laboratory) => String(laboratory.id) === laboratoryId,
  );

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
          <DigitalTwinCanvas key={laboratoryId} />
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
