import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout.jsx";
import { AuthSessionBootstrap } from "@/components/AuthSessionBootstrap.jsx";
import { AboutPage } from "@/pages/AboutPage.jsx";
import { ContactPage } from "@/pages/ContactPage.jsx";
import { FeaturesPage } from "@/pages/FeaturesPage.jsx";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage.jsx";
import { HomePage } from "@/pages/HomePage.jsx";
import { HowItWorksPage } from "@/pages/HowItWorksPage.jsx";
import { LoginPage } from "@/pages/LoginPage.jsx";
import { NotFoundPage } from "@/pages/NotFoundPage.jsx";
import { RegisterPage } from "@/pages/RegisterPage.jsx";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage.jsx";
import { PlatformLayout } from "@/layouts/PlatformLayout.jsx";
import { PlatformLoginPage } from "@/pages/PlatformLoginPage.jsx";
import { PlatformRegistrationRequestsPage } from "@/pages/PlatformRegistrationRequestsPage.jsx";
import { PlatformUniversitiesPage } from "@/pages/PlatformUniversitiesPage.jsx";
import { PlatformSummaryPage } from "@/pages/PlatformSummaryPage.jsx";
import { PlatformSettingsPage } from "@/pages/PlatformSettingsPage.jsx";
import { PlatformActivityPage } from "@/pages/PlatformActivityPage.jsx";
import { PlatformProtectedRoute } from "@/routes/PlatformProtectedRoute.jsx";
import { ProtectedRoute } from "@/routes/ProtectedRoute.jsx";
import { PermissionRoute } from "@/routes/PermissionRoute.jsx";
import { UniversityLayout } from "@/layouts/UniversityLayout.jsx";
import { UniversityOverviewPage } from "@/pages/UniversityOverviewPage.jsx";
import { WorkspaceSectionPage } from "@/pages/WorkspaceSectionPage.jsx";
import { ReportsPage } from "@/pages/ReportsPage.jsx";
import { UniversityUsersPage } from "@/pages/UniversityUsersPage.jsx";
import { UniversitySettingsPage } from "@/pages/UniversitySettingsPage.jsx";
import { ForbiddenPage } from "@/pages/ForbiddenPage.jsx";
import { WorkspaceNotFoundPage } from "@/pages/WorkspaceNotFoundPage.jsx";

const LaboratoriesPage = lazy(() =>
  import("@/pages/LaboratoriesPage.jsx").then((module) => ({
    default: module.LaboratoriesPage,
  })),
);
const LaboratoryDetailPage = lazy(() =>
  import("@/pages/LaboratoryDetailPage.jsx").then((module) => ({
    default: module.LaboratoryDetailPage,
  })),
);
const EquipmentPage = lazy(() =>
  import("@/pages/EquipmentPage.jsx").then((module) => ({
    default: module.EquipmentPage,
  })),
);
const EquipmentDetailPage = lazy(() =>
  import("@/pages/EquipmentDetailPage.jsx").then((module) => ({
    default: module.EquipmentDetailPage,
  })),
);
const SensorsPage = lazy(() =>
  import("@/pages/SensorsPage.jsx").then((module) => ({
    default: module.SensorsPage,
  })),
);
const SensorDetailPage = lazy(() =>
  import("@/pages/SensorDetailPage.jsx").then((module) => ({
    default: module.SensorDetailPage,
  })),
);
const RealtimeMonitoringPage = lazy(() =>
  import("@/pages/RealtimeMonitoringPage.jsx").then((module) => ({
    default: module.RealtimeMonitoringPage,
  })),
);
const DigitalTwinPage = lazy(() =>
  import("@/pages/DigitalTwinPage.jsx").then((module) => ({
    default: module.DigitalTwinPage,
  })),
);
const MaintenancePage = lazy(() =>
  import("@/pages/MaintenancePage.jsx").then((module) => ({
    default: module.MaintenancePage,
  })),
);
const EnergyPage = lazy(() =>
  import("@/pages/EnergyPage.jsx").then((module) => ({
    default: module.EnergyPage,
  })),
);
const SimulationsPage = lazy(() =>
  import("@/pages/SimulationsPage.jsx").then((module) => ({
    default: module.SimulationsPage,
  })),
);
const AnalyticsPage = lazy(() =>
  import("@/pages/AnalyticsPage.jsx").then((module) => ({
    default: module.AnalyticsPage,
  })),
);

const laboratoryPage = (Page) => (
  <Suspense fallback={<p className="workspace-loading">Po ngarkohet faqja…</p>}>
    <Page />
  </Suspense>
);

export default function App() {
  return (
    <AuthSessionBootstrap>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="rreth-nesh" element={<AboutPage />} />
          <Route path="funksionalitetet" element={<FeaturesPage />} />
          <Route path="si-funksionon" element={<HowItWorksPage />} />
          <Route path="kontakti" element={<ContactPage />} />
          <Route path="regjistrohu" element={<RegisterPage />} />
          <Route path="kycu" element={<LoginPage />} />
          <Route path="harrova-fjalekalimin" element={<ForgotPasswordPage />} />
          <Route path="rivendos-fjalekalimin" element={<ResetPasswordPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="administrimi/kycu" element={<PlatformLoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="aplikacioni" element={<UniversityLayout />}>
            <Route index element={<UniversityOverviewPage />} />
            <Route path="e-ndaluar" element={<ForbiddenPage />} />
            <Route element={<PermissionRoute anyOf={["laboratories.view"]} />}>
              <Route
                path="laboratoret"
                element={laboratoryPage(LaboratoriesPage)}
              />
              <Route
                path="laboratoret/:laboratoryId"
                element={laboratoryPage(LaboratoryDetailPage)}
              />
              <Route
                path="digital-twin"
                element={laboratoryPage(DigitalTwinPage)}
              />
              <Route path="pajisjet" element={laboratoryPage(EquipmentPage)} />
              <Route
                path="pajisjet/:equipmentId"
                element={laboratoryPage(EquipmentDetailPage)}
              />
              <Route path="sensoret" element={laboratoryPage(SensorsPage)} />
              <Route
                path="sensoret/:sensorId"
                element={laboratoryPage(SensorDetailPage)}
              />
            </Route>
            <Route element={<PermissionRoute anyOf={["monitoring.view"]} />}>
              <Route
                path="monitorimi"
                element={laboratoryPage(RealtimeMonitoringPage)}
              />
              <Route path="energjia" element={laboratoryPage(EnergyPage)} />
            </Route>
            <Route
              element={
                <PermissionRoute
                  anyOf={["alerts.respond", "alerts.report", "monitoring.view"]}
                />
              }
            >
              <Route
                path="alarmet"
                element={
                  <WorkspaceSectionPage
                    title="Alarmet"
                    description="Alarmet dhe ngjarjet e laboratorëve të autorizuar."
                  />
                }
              />
            </Route>
            <Route
              element={
                <PermissionRoute
                  anyOf={["maintenance.manage", "maintenance.assigned"]}
                />
              }
            >
              <Route
                path="mirembajtja"
                element={laboratoryPage(MaintenancePage)}
              />
            </Route>
            <Route element={<PermissionRoute anyOf={["reports.view"]} />}>
              <Route path="analitika" element={laboratoryPage(AnalyticsPage)} />
              <Route path="raportet" element={laboratoryPage(ReportsPage)} />
            </Route>
            <Route element={<PermissionRoute anyOf={["simulations.run"]} />}>
              <Route
                path="simulimet"
                element={laboratoryPage(SimulationsPage)}
              />
            </Route>
            <Route
              element={<PermissionRoute anyOf={["university.users.manage"]} />}
            >
              <Route
                path="perdoruesit"
                element={laboratoryPage(UniversityUsersPage)}
              />
            </Route>
            <Route
              element={
                <PermissionRoute anyOf={["university.profile.manage"]} />
              }
            >
              <Route
                path="cilesimet"
                element={laboratoryPage(UniversitySettingsPage)}
              />
            </Route>
            <Route path="*" element={<WorkspaceNotFoundPage />} />
          </Route>
        </Route>
        <Route element={<PlatformProtectedRoute />}>
          <Route path="administrimi" element={<PlatformLayout />}>
            <Route index element={<PlatformSummaryPage />} />
            <Route
              path="kerkesat"
              element={<PlatformRegistrationRequestsPage />}
            />
            <Route
              path="universitetet"
              element={<PlatformUniversitiesPage />}
            />
            <Route path="cilesimet" element={<PlatformSettingsPage />} />
            <Route path="historiku" element={<PlatformActivityPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthSessionBootstrap>
  );
}
