import { useMemo, useState } from "react";
import { Activity, AlertTriangle, Camera, Clock3, MessageSquare, ScrollText, Send, Thermometer, Wrench, X } from "lucide-react";

const tabs = [["logs", ScrollText, "Live logs"], ["chat", MessageSquare, "Biseda"], ["alerts", AlertTriangle, "Alarmet"]];
const eventIcons = { "sensor.connected": Thermometer, "asset.added": Activity, "asset.moved": Wrench, "alert.created": AlertTriangle, "camera.offline": Camera };
const formatTime = (value) => new Intl.DateTimeFormat("sq-AL", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));

function LogsTab({ events, loading }) {
  if (loading && !events.length) return <p className="twin-ops-empty">Po ngarkohen ngjarjet…</p>;
  if (!events.length) return <p className="twin-ops-empty">Nuk ka ende ngjarje për këtë laborator.</p>;
  return <div className="twin-log-list">{events.map((event) => {
    const Icon = eventIcons[event.eventType] ?? Clock3;
    return <article key={event.id} className={`severity-${event.severity}`}><Icon size={17}/><time>{formatTime(event.createdAt)}</time><div><strong>{event.eventType}</strong><p>{event.description}</p><small>{event.zoneName ?? "Laboratori"}{event.actorName ? ` · ${event.actorName}` : " · Sistemi"}</small></div><i/></article>;
  })}</div>;
}

function ChatTab({ messages, channel, setChannel, onSend }) {
  const [draft, setDraft] = useState("");
  async function submit(event) { event.preventDefault(); const value = draft.trim(); if (!value) return; await onSend(value); setDraft(""); }
  return <div className="twin-chat"><label>Kanali<select value={channel} onChange={(event) => setChannel(event.target.value)}><option value="laboratory">Laboratori</option><option value="technical">Ekipi teknik</option><option value="administrators">Administratorët</option></select></label><div className="twin-chat-messages">{messages.length ? messages.map((message) => <article key={message.id} className={message.senderType === "system" ? "system" : ""}><div><strong>{message.senderName ?? "CampusLab system"}</strong><time>{formatTime(message.createdAt)}</time></div><p>{message.messageText}</p></article>) : <p className="twin-ops-empty">Nuk ka mesazhe në këtë kanal.</p>}</div><form onSubmit={submit}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} placeholder="Shkruaj një mesazh…"/><button type="submit" aria-label="Dërgo"><Send size={18}/></button></form></div>;
}

function AlertsTab({ alerts, onAcknowledge }) {
  const active = alerts.filter((alert) => !["resolved", "closed"].includes(alert.status));
  if (!active.length) return <p className="twin-ops-empty">Nuk ka alarme aktive.</p>;
  return <div className="twin-alert-list">{active.map((alert) => <article key={alert.id} className={`severity-${alert.severity}`}><span>{alert.severity === "critical" ? "Alarm kritik" : "Paralajmërim"}</span><h3>{alert.title}</h3><p>{alert.description}</p><dl><div><dt>Zona</dt><dd>{alert.laboratoryName ?? "Laboratori"}</dd></div><div><dt>Statusi</dt><dd>{alert.status}</dd></div><div><dt>Koha</dt><dd>{formatTime(alert.createdAt ?? alert.recordedAt)}</dd></div></dl>{alert.status === "new" && <button type="button" onClick={() => onAcknowledge(alert)}>Prano</button>}</article>)}</div>;
}

export function TwinOperationsPanel({ operations, openTab, onOpen, onClose }) {
  const counts = useMemo(() => ({ chat: operations.messages.length, alerts: operations.alerts.filter((item) => !["resolved", "closed"].includes(item.status)).length }), [operations.alerts, operations.messages.length]);
  const activeTab = openTab ?? "logs";
  const activeLabel = tabs.find(([id]) => id === activeTab)?.[2] ?? "Operacionet";
  return <><nav className="twin-operations-dock" aria-label="Paneli operacional">{tabs.map(([id, Icon, label]) => <button type="button" key={id} className={openTab === id ? "active" : ""} onClick={() => openTab === id ? onClose() : onOpen(id)} aria-pressed={openTab === id} title={label}><Icon size={17}/><span>{label}</span>{counts[id] > 0 && <b>{counts[id]}</b>}</button>)}</nav>{openTab && <aside className="twin-operations-panel" aria-label={activeLabel}><header><div><span>Qendra operative</span><h2>{activeLabel}</h2></div><button type="button" onClick={onClose} aria-label="Mbyll panelin"><X size={18}/></button></header><nav>{tabs.map(([id, Icon, label]) => <button type="button" key={id} className={activeTab === id ? "active" : ""} onClick={() => onOpen(id)}><Icon size={15}/>{label}{counts[id] > 0 && <b>{counts[id]}</b>}</button>)}</nav>{operations.error && <p className="twin-ops-error">{operations.error}</p>}<div className="twin-ops-content">{activeTab === "logs" && <LogsTab events={operations.events} loading={operations.loading}/>} {activeTab === "chat" && <ChatTab messages={operations.messages} channel={operations.channel} setChannel={operations.setChannel} onSend={operations.sendMessage}/>} {activeTab === "alerts" && <AlertsTab alerts={operations.alerts} onAcknowledge={operations.acknowledgeAlert}/>}</div></aside>}</>;
}
