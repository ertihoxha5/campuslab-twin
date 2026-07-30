import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Box,
  Building2,
  ChartNoAxesCombined,
  ChevronRight,
  CircleAlert,
  Cpu,
  FileText,
  FlaskConical,
  Gauge,
  LogOut,
  Menu,
  Settings,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/api/client.js";
import { Button } from "@/components/ui/button.jsx";
import { useAuthStore } from "@/stores/auth-store.js";
import { NotificationMenu } from "@/components/NotificationMenu.jsx";
import { WorkspaceErrorBoundary } from "@/components/WorkspaceErrorBoundary.jsx";

const roleLabels = {
  university_admin: "Administrator i universitetit",
  lab_manager: "Menaxher i laboratorit",
  technician: "Teknik",
  academic_staff: "Personel akademik",
  observer: "Vëzhgues",
};

const navigation = [
  { to: "/aplikacioni", label: "Përmbledhja", icon: Gauge },
  {
    to: "/aplikacioni/laboratoret",
    label: "Laboratorët",
    icon: FlaskConical,
    permission: "laboratories.view",
  },
  {
    to: "/aplikacioni/digital-twin",
    label: "Digital Twin 3D",
    icon: Box,
    permission: "laboratories.view",
  },
  {
    to: "/aplikacioni/pajisjet",
    label: "Pajisjet",
    icon: Cpu,
    permission: "laboratories.view",
  },
  {
    to: "/aplikacioni/sensoret",
    label: "Sensorët",
    icon: Activity,
    permission: "laboratories.view",
  },
  {
    to: "/aplikacioni/monitorimi",
    label: "Monitorimi në kohë reale",
    icon: Gauge,
    permission: "monitoring.view",
  },
  {
    to: "/aplikacioni/alarmet",
    label: "Alarmet",
    icon: CircleAlert,
    anyPermission: ["alerts.respond", "alerts.report", "monitoring.view"],
  },
  {
    to: "/aplikacioni/mirembajtja",
    label: "Mirëmbajtja",
    icon: Wrench,
    anyPermission: ["maintenance.manage", "maintenance.assigned"],
  },
  {
    to: "/aplikacioni/energjia",
    label: "Konsumi i energjisë",
    icon: Zap,
    permission: "monitoring.view",
  },
  {
    to: "/aplikacioni/analitika",
    label: "Analitika",
    icon: ChartNoAxesCombined,
    permission: "reports.view",
  },
  {
    to: "/aplikacioni/simulimet",
    label: "Simulimet",
    icon: FlaskConical,
    permission: "simulations.run",
  },
  {
    to: "/aplikacioni/raportet",
    label: "Raportet",
    icon: FileText,
    permission: "reports.view",
  },
  {
    to: "/aplikacioni/perdoruesit",
    label: "Përdoruesit",
    icon: Users,
    permission: "university.users.manage",
  },
  {
    to: "/aplikacioni/cilesimet",
    label: "Cilësimet",
    icon: Settings,
    permission: "university.profile.manage",
  },
];

function canView(item, permissions) {
  if (!item.permission && !item.anyPermission) return true;
  if (item.permission) return permissions.includes(item.permission);
  return item.anyPermission.some((permission) =>
    permissions.includes(permission),
  );
}

export function UniversityLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [menuOpen, setMenuOpen] = useState(false);
  const availableNavigation = useMemo(
    () => navigation.filter((item) => canView(item, user?.permissions ?? [])),
    [user?.permissions],
  );
  const current =
    availableNavigation.find((item) => item.to === location.pathname) ??
    availableNavigation[0];

  useEffect(() => {
    document.title = `${current?.label ?? "Aplikacioni"} · ${
      user?.university.acronym ?? "CampusLab Twin"
    }`;
    return () => {
      document.title = "CampusLab Twin";
    };
  }, [current?.label, user?.university.acronym]);

  async function logout() {
    try {
      await api.post("/api/auth/logout");
    } finally {
      clearSession();
      navigate("/kycu", { replace: true });
    }
  }

  return (
    <div className="university-shell">
      <aside
        className={
          menuOpen ? "university-sidebar is-open" : "university-sidebar"
        }
      >
        <div className="university-brand">
          <span className="university-mark">
            {user?.university.logoFileId ? (
              <img src={`/api/files/${user.university.logoFileId}`} alt="" />
            ) : (
              user?.university.acronym?.slice(0, 3)
            )}
          </span>
          <div>
            <strong>{user?.university.acronym}</strong>
            <small>{user?.university.name}</small>
          </div>
          <button
            type="button"
            className="sidebar-close"
            aria-label="Mbyll navigimin"
            onClick={() => setMenuOpen(false)}
          >
            <X size={19} />
          </button>
        </div>
        <nav aria-label="Navigimi i universitetit">
          {availableNavigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/aplikacioni"}
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={18} /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {menuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Mbyll navigimin"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="university-workspace">
        <header className="university-header">
          <button
            type="button"
            className="sidebar-trigger"
            aria-label="Hap navigimin"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={21} />
          </button>
          <div className="workspace-breadcrumb">
            <Building2 size={16} />
            <span>{user?.university.acronym}</span>
            <ChevronRight size={15} />
            <strong>{current?.label}</strong>
          </div>
          <div className="university-account">
            <NotificationMenu />
            <div>
              <strong>{user?.fullName}</strong>
              <small>
                {(user?.roles ?? [])
                  .map((role) => roleLabels[role] ?? role)
                  .join(", ")}
              </small>
            </div>
            <Button type="button" variant="outline" onClick={logout}>
              <LogOut size={16} /> Dil
            </Button>
          </div>
        </header>
        <main className="university-content">
          <WorkspaceErrorBoundary key={location.pathname}>
            <Outlet />
          </WorkspaceErrorBoundary>
        </main>
      </div>
    </div>
  );
}
