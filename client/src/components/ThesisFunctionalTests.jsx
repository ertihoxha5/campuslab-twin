import { useCallback, useEffect, useState } from "react";
import { FlaskConical, RefreshCw } from "lucide-react";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";
import "./ThesisFunctionalTests.css";

const labels = {
  Normal: "Normal", Warning: "Paralajmërim", Critical: "Kritik",
  "Problem state only": "Gjendje problematike",
  "No problem state": "Pa gjendje problematike",
};

function inputText(result) {
  const input = result.input ?? {};
  if (result.scenario === "high_temperature") return `${input.temperature} °C`;
  if (result.scenario === "high_humidity") return `${input.humidity} %`;
  if (result.scenario === "overcapacity") return `${input.occupancy} persona`;
  if (result.scenario === "high_power") return `${input.power / 1000} kW`;
  if (result.scenario === "equipment_fault") return `status = ${input.equipmentStatus}`;
  return `${input.temperature} °C, ${input.humidity} %, ${input.occupancy} persona, ${input.power / 1000} kW, ${input.equipmentStatus}`;
}

export function ThesisFunctionalTests({ laboratoryId, onFinished }) {
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/api/simulator/laboratories/${laboratoryId}/thesis-functional`);
      setBatch(response.data);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  }, [laboratoryId]);

  useEffect(() => { void load(); }, [load]);

  async function runAll() {
    setRunning(true);
    setError("");
    try {
      const response = await api.post(`/api/simulator/laboratories/${laboratoryId}/thesis-functional/run`, {});
      setBatch(response.data);
      onFinished?.();
    } catch (cause) {
      setError(cause.message);
      await load();
    } finally {
      setRunning(false);
    }
  }

  const results = batch?.results ?? [];
  const summary = batch?.summary;
  return <section className="thesis-tests" aria-labelledby="thesis-tests-title">
    <header className="thesis-tests-header">
      <div><span className="thesis-tests-eyebrow"><FlaskConical size={16} /> Validim i brendshëm</span>
        <h2 id="thesis-tests-title">Testimi i skenarëve funksionalë</h2>
        <p>Gjashtë prova të kontrolluara për LAB-AUT-01. PASS/FAIL llogaritet nga leximet, alarmet dhe statusi i pajisjes të ruajtura në sistem.</p>
      </div>
      <div className="thesis-tests-actions">
        <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading || running}>
          <RefreshCw size={15} /> Rifresko
        </Button>
        <Button type="button" onClick={runAll} disabled={loading || running}>
          {running ? "Po ekzekutohen…" : results.length ? "Ekzekuto përsëri" : "Ekzekuto 6 skenarët"}
        </Button>
      </div>
    </header>
    <p className="thesis-tests-note">Ekzekutimi lejohet për administratorin e universitetit. Nëse ka një simulim aktiv, ndale para nisjes. Përfundimi mund të zgjasë pak sekonda.</p>
    {error && <p className="form-message error" role="alert">{error}</p>}
    {batch?.exportError && <p className="form-message error" role="alert">Rezultatet u ruajtën në DB, por eksporti në docs dështoi: {batch.exportError}</p>}
    {loading ? <p role="status">Po ngarkohen rezultatet…</p> : results.length ? <>
      <div className="thesis-tests-summary" role="status">
        <div><small>Rezultati përfundimtar</small><strong>{summary?.passed ?? 0} / {summary?.total ?? 0} PASS</strong></div>
        <span>{summary?.failed ?? 0} / {summary?.total ?? 0} FAIL</span>
        {summary?.allPassed && <p>Të gjashtë skenarët prodhuan rezultatin e pritur.</p>}
      </div>
      <div className="thesis-tests-scroll"><table>
        <thead><tr><th>Skenari</th><th>Vlera e simuluar</th><th>Rezultati i pritur</th><th>Rezultati i arritur</th><th>Niveli</th><th>Statusi</th></tr></thead>
        <tbody>{results.map((result) => <tr key={result.id}>
          <th scope="row"><strong>{result.scenarioName}</strong><small>Run #{result.runId ?? "—"}{result.alertId ? ` · Alarm #${result.alertId}` : ""}</small></th>
          <td>{inputText(result)}</td><td>{result.expectedResult}<small>{labels[result.expectedLevel] ?? result.expectedLevel}</small></td>
          <td>{result.actualResult}</td><td>{labels[result.actualLevel] ?? result.actualLevel}</td>
          <td><span className={`thesis-tests-badge ${result.status.toLowerCase()}`}>{result.status}</span></td>
        </tr>)}</tbody>
      </table></div>
      <p className="thesis-tests-note">Batch: {batch.batchId}. Niveli i ruajtur është ai në momentin e provës; simulimet e mëvonshme nuk e ndryshojnë këtë rezultat. Ky validim nuk provon automatikisht paraqitjen vizuale të një shfletuesi të veçantë.</p>
    </> : <p className="thesis-tests-empty">Ende nuk ka një ekzekutim nga kjo faqe. Shtyp “Ekzekuto 6 skenarët” për të krijuar rezultatet reale.</p>}
  </section>;
}
