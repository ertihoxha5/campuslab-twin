import { useEffect, useMemo, useState } from "react";
import {
  Activity, Box, Building2, ChartNoAxesCombined, ChevronLeft, ChevronRight,
  CircleAlert, Cpu, FileText, FlaskConical, Gauge, LogOut, Menu, Settings,
  UserRound, Users, Wrench, X, Zap,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/api/client.js";
import { NotificationMenu } from "@/components/NotificationMenu.jsx";
import { WorkspaceErrorBoundary } from "@/components/WorkspaceErrorBoundary.jsx";
import { Button } from "@/components/ui/button.jsx";
import { useAuthStore } from "@/stores/auth-store.js";

const roleLabels = {
  university_admin: "Administrator i universitetit",
  lab_manager: "Menaxher i laboratorit",
  technician: "Teknik",
  academic_staff: "Personel akademik",
  observer: "Vëzhgues",
};

const navigationGroups = [
  {
    label: "Operacionet",
    items: [
      { to: "/aplikacioni", label: "Përmbledhja", icon: Gauge },
      { to: "/aplikacioni/laboratoret", label: "Laboratorët", icon: FlaskConical, permission: "laboratories.view" },
      { to: "/aplikacioni/digital-twin", label: "Digital Twin 3D", icon: Box, permission: "laboratories.view" },
    ],
  },
  {
    label: "Infrastruktura",
    items: [
      { to: "/aplikacioni/pajisjet", label: "Pajisjet", icon: Cpu, permission: "laboratories.view" },
      { to: "/aplikacioni/sensoret", label: "Sensorët", icon: Activity, permission: "laboratories.view" },
      { to: "/aplikacioni/monitorimi", label: "Monitorimi live", icon: Gauge, permission: "monitoring.view" },
    ],
  },
  {
    label: "Menaxhimi",
    items: [
      { to: "/aplikacioni/alarmet", label: "Alarmet", icon: CircleAlert, anyPermission: ["alerts.respond", "alerts.report", "monitoring.view"] },
      { to: "/aplikacioni/mirembajtja", label: "Mirëmbajtja", icon: Wrench, anyPermission: ["maintenance.manage", "maintenance.assigned"] },
      { to: "/aplikacioni/energjia", label: "Energjia", icon: Zap, permission: "monitoring.view" },
      { to: "/aplikacioni/analitika", label: "Analitika", icon: ChartNoAxesCombined, permission: "reports.view" },
      { to: "/aplikacioni/simulimet", label: "Simulimet", icon: FlaskConical, permission: "simulations.run" },
      { to: "/aplikacioni/raportet", label: "Raportet", icon: FileText, permission: "reports.view" },
    ],
  },
  {
    label: "Administrimi",
    items: [
      { to: "/aplikacioni/perdoruesit", label: "Përdoruesit", icon: Users, permission: "university.users.manage" },
      { to: "/aplikacioni/cilesimet", label: "Cilësimet", icon: Settings, permission: "university.profile.manage" },
      { to: "/aplikacioni/llogaria", label: "Llogaria ime", icon: UserRound },
    ],
  },
];

function canView(item, permissions) {
  if (!item.permission && !item.anyPermission) return true;
  if (item.permission) return permissions.includes(item.permission);
  return item.anyPermission.some((permission) => permissions.includes(permission));
}

export function UniversityLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem("clt-sidebar-collapsed") === "true",
  );
  const availableGroups = useMemo(
    () => navigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => canView(item, user?.permissions ?? [])),
      }))
      .filter((group) => group.items.length > 0),
    [user?.permissions],
  );
  const availableNavigation = availableGroups.flatMap((group) => group.items);
  const current = availableNavigation.find((item) => item.to === location.pathname) ?? availableNavigation[0];

  useEffect(() => {
    document.title = `${current?.label ?? "Aplikacioni"} · ${user?.university.acronym ?? "CampusLab Twin"}`;
    return () => { document.title = "CampusLab Twin"; };
  }, [current?.label, user?.university.acronym]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((currentValue) => {
      const nextValue = !currentValue;
      window.localStorage.setItem("clt-sidebar-collapsed", String(nextValue));
      return nextValue;
    });
  }

  async function logout() {
    try { await api.post("/api/auth/logout"); }
    finally { clearSession(); navigate("/kycu", { replace: true }); }
  }

  return (
    <div className={sidebarCollapsed ? "university-shell is-collapsed" : "university-shell"}>
      <aside className={`university-sidebar${menuOpen ? " is-open" : ""}${sidebarCollapsed ? " is-collapsed" : ""}`}>
        <div className="university-brand">
          <span className="university-mark" aria-hidden="true">
            {user?.university.logoFileId
              ? <img src={`/api/files/${user.university.logoFileId}`} alt="" />
              : user?.university.acronym?.slice(0, 3)}
          </span>
          <div className="university-brand-copy">
            <strong>{user?.university.acronym}</strong>
            <small>{user?.university.name}</small>
            <span>CampusLab Twin</span>
          </div>
          <button type="button" className="sidebar-close" aria-label="Mbyll navigimin" onClick={() => setMenuOpen(false)}>
            <X size={19} />
          </button>
        </div>

        <nav aria-label="Navigimi i universitetit">
          {availableGroups.map((group) => (
            <section className="sidebar-navigation-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} end={to === "/aplikacioni"} onClick={() => setMenuOpen(false)}
                  title={sidebarCollapsed ? label : undefined} aria-label={sidebarCollapsed ? label : undefined}>
                  <Icon size={18} aria-hidden="true" /><span>{label}</span>
                </NavLink>
              ))}
            </section>
          ))}
        </nav>

        <div className="sidebar-system-state">
          <span><i /> Sistemi aktiv</span>
          <small>Të dhënat sinkronizohen live</small>
        </div>

        <button type="button" className="sidebar-collapse" onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Zgjero navigimin" : "Ngushto navigimin"}
          title={sidebarCollapsed ? "Zgjero navigimin" : "Ngushto navigimin"}>
          <ChevronLeft size={17} aria-hidden="true" /><span>Ngushto menunë</span>
        </button>
      </aside>

      {menuOpen && <button type="button" className="sidebar-backdrop" aria-label="Mbyll navigimin" onClick={() => setMenuOpen(false)} />}

      <div className="university-workspace">
        <header className="university-header">
          <button type="button" className="sidebar-trigger" aria-label="Hap navigimin" onClick={() => setMenuOpen(true)}>
            <Menu size={21} />
          </button>
          <div className="workspace-breadcrumb" aria-label="Pozicioni aktual">
            <Building2 size={16} aria-hidden="true" /><span>{user?.university.acronym ?? "Universiteti"}</span>
            <ChevronRight size={15} aria-hidden="true" /><strong>{current?.label}</strong>
          </div>
          <div className="workspace-mobile-title">
            <small>{user?.university.acronym}</small>
            <strong>{current?.label}</strong>
          </div>
          <div className="university-account">
            <div className="workspace-live-state">
              <i />
              <span>
                <strong>LIVE</strong>
                <small>{now.toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}</small>
              </span>
            </div>
            <NotificationMenu />
            <div className="account-copy">
              <strong>{user?.fullName}</strong>
              <small>{(user?.roles ?? []).map((role) => roleLabels[role] ?? role).join(", ")}</small>
            </div>
            <span className="account-avatar" aria-hidden="true">
              {user?.fullName?.split(" ").map((part) => part[0]).slice(0, 2).join("")}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={logout}>
              <LogOut size={16} /><span className="logout-label">Dil</span>
            </Button>
          </div>
        </header>
        <main className="university-content">
          <WorkspaceErrorBoundary key={location.pathname}><Outlet /></WorkspaceErrorBoundary>
        </main>
      </div>
    </div>
  );
}
