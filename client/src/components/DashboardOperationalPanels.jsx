import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BellRing,
  Building2,
  Clock3,
  Wrench,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const equipmentStatusLabels = {
  active: "Aktive",
  inactive: "Joaktive",
  fault: "Me defekt",
  maintenance: "Në mirëmbajtje",
};
const equipmentColors = {
  active: "#6c7653",
  inactive: "#8d8793",
  fault: "#a64b55",
  maintenance: "#58427c",
};
const severityLabels = {
  info: "Informues",
  warning: "Paralajmërim",
  critical: "Kritik",
};
const maintenanceStatusLabels = {
  planned: "E planifikuar",
  in_progress: "Në proces",
  waiting: "Në pritje",
};

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("sq-AL", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Pa afat";

const formatHour = (value) =>
  new Intl.DateTimeFormat("sq-AL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value.replace(" ", "T") + "Z"));

const formatSensorValue = (value, unit) =>
  `${new Intl.NumberFormat("sq-AL", { maximumFractionDigits: 2 }).format(value)} ${unit}`;

function Panel({ title, icon: Icon, children, className = "" }) {
  return (
    <section className={`dashboard-panel ${className}`.trim()}>
      <header>
        <span>
          <Icon size={18} />
        </span>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}

function EmptyPanel({ children }) {
  return <p className="dashboard-panel-empty">{children}</p>;
}

export function DashboardOperationalPanels({ summary }) {
  const {
    energyTrend = [],
    equipmentStatus: rawEquipmentStatus = [],
    recentAlerts = [],
    latestSensorReadings = [],
    laboratoryHealth = [],
    upcomingMaintenance = [],
    recentActivities = [],
    laboratories = [],
  } = summary;
  const equipmentStatus = rawEquipmentStatus.map((item) => ({
    ...item,
    name: equipmentStatusLabels[item.status] ?? item.status,
  }));

  return (
    <div className="dashboard-operational-grid">
      <Panel
        title={`Konsumi i energjisë · ${
          summary.filters?.hours === 168
            ? "7 ditët e fundit"
            : `${summary.filters?.hours ?? 24} orët e fundit`
        }`}
        icon={Activity}
        className="dashboard-chart-panel"
      >
        {energyTrend.length === 0 ? (
          <EmptyPanel>Nuk ka lexime energjie për këtë periudhë.</EmptyPanel>
        ) : (
          <div className="dashboard-chart" aria-label="Grafiku i energjisë">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={energyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="recordedAt"
                  tickFormatter={formatHour}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `${value / 1000} kW`}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip
                  labelFormatter={(value) => formatDate(value)}
                  formatter={(value) => [
                    `${new Intl.NumberFormat("sq-AL", {
                      maximumFractionDigits: 0,
                    }).format(value)} W`,
                    "Fuqia mesatare",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="averagePowerWatts"
                  stroke="#58427c"
                  fill="#eeeaf4"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel title="Statusi i pajisjeve" icon={Building2}>
        {equipmentStatus.length === 0 ? (
          <EmptyPanel>Nuk ka pajisje të regjistruara.</EmptyPanel>
        ) : (
          <>
            <div
              className="equipment-status-chart"
              aria-label="Grafiku i statusit të pajisjeve"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={equipmentStatus}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={46}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {equipmentStatus.map((item) => (
                      <Cell
                        key={item.status}
                        fill={equipmentColors[item.status] ?? "#8d8793"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="equipment-status-legend">
              {equipmentStatus.map((item) => (
                <li key={item.status}>
                  <i
                    style={{
                      backgroundColor:
                        equipmentColors[item.status] ?? "#8d8793",
                    }}
                  />
                  <span>{item.name}</span>
                  <strong>{item.total}</strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <Panel title="Alarmet e fundit" icon={BellRing}>
        {recentAlerts.length === 0 ? (
          <EmptyPanel>Nuk ka alarme të regjistruara.</EmptyPanel>
        ) : (
          <div className="dashboard-event-list">
            {recentAlerts.map((alert) => (
              <article key={alert.id}>
                <span className={`severity-dot severity-${alert.severity}`} />
                <div>
                  <strong>{alert.title}</strong>
                  <small>
                    {alert.laboratoryName} · {formatDate(alert.createdAt)}
                  </small>
                </div>
                <em>{severityLabels[alert.severity] ?? alert.severity}</em>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Leximet e fundit" icon={Activity}>
        {latestSensorReadings.length === 0 ? (
          <EmptyPanel>Nuk ka lexime sensorësh.</EmptyPanel>
        ) : (
          <div className="sensor-reading-list">
            {latestSensorReadings.map((reading) => (
              <article key={reading.id}>
                <div>
                  <strong>{reading.sensorName}</strong>
                  <small>{reading.laboratoryName}</small>
                </div>
                <span>
                  {formatSensorValue(reading.value, reading.unit)}
                  {reading.source === "simulated" && <i>Simulim</i>}
                </span>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Gjendja e laboratorëve" icon={Building2}>
        {laboratoryHealth.length === 0 ? (
          <EmptyPanel>Nuk ka laboratorë për t’u analizuar.</EmptyPanel>
        ) : (
          <div className="laboratory-health-list">
            {laboratoryHealth.map((laboratory) => (
              <article key={laboratory.id}>
                <div>
                  <strong>{laboratory.name}</strong>
                  <small>{laboratory.code}</small>
                </div>
                <span>
                  <strong>{Math.round(laboratory.equipmentHealth)}%</strong>
                  <small>Shëndeti i pajisjeve</small>
                </span>
                <span>
                  <strong>
                    {laboratory.onlineSensors}/{laboratory.totalSensors}
                  </strong>
                  <small>Sensorë online</small>
                </span>
                <span>
                  <strong>{laboratory.activeAlerts}</strong>
                  <small>Alarme aktive</small>
                </span>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Mirëmbajtjet e ardhshme" icon={Wrench}>
        {upcomingMaintenance.length === 0 ? (
          <EmptyPanel>Nuk ka mirëmbajtje të planifikuara.</EmptyPanel>
        ) : (
          <div className="dashboard-event-list maintenance-list">
            {upcomingMaintenance.map((task) => (
              <article key={task.id}>
                <span className="maintenance-icon">
                  <Clock3 size={15} />
                </span>
                <div>
                  <strong>{task.title}</strong>
                  <small>
                    {task.laboratoryName} · {task.equipmentName}
                  </small>
                </div>
                <em>{maintenanceStatusLabels[task.status] ?? task.status}</em>
                <time>{formatDate(task.dueAt)}</time>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Aktivitetet e fundit" icon={Clock3}>
        {recentActivities.length === 0 ? (
          <EmptyPanel>Nuk ka aktivitete të fundit.</EmptyPanel>
        ) : (
          <div className="activity-compact-list">
            {recentActivities.map((activity) => (
              <article key={activity.id}>
                <i />
                <div>
                  <strong>{activity.description}</strong>
                  <small>
                    {activity.userName} · {formatDate(activity.createdAt)}
                  </small>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Qasje e shpejtë" icon={Building2}>
        {laboratories.length === 0 ? (
          <EmptyPanel>Nuk ka laboratorë të qasshëm.</EmptyPanel>
        ) : (
          <div className="quick-laboratory-list">
            {laboratories.map((laboratory) => (
              <Link
                key={laboratory.id}
                to={`/aplikacioni/laboratoret?laboratory=${laboratory.id}`}
              >
                <span>
                  <strong>{laboratory.name}</strong>
                  <small>
                    {laboratory.code} · Kapaciteti {laboratory.capacity}
                  </small>
                </span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
