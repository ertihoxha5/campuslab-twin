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
                element={
                  <WorkspaceSectionPage
                    title="Digital Twin 3D"
                    description="Pamja interaktive e laboratorëve të autorizuar."
                  />
                }
              />
              <Route
                path="pajisjet"
                element={
                  <WorkspaceSectionPage
                    title="Pajisjet"
                    description="Pajisjet e laboratorëve të universitetit."
                  />
                }
              />
            </Route>
            <Route element={<PermissionRoute anyOf={["monitoring.view"]} />}>
              <Route
                path="sensoret"
                element={
                  <WorkspaceSectionPage
                    title="Sensorët"
                    description="Sensorët e laboratorëve të autorizuar."
                  />
                }
              />
              <Route
                path="monitorimi"
                element={
                  <WorkspaceSectionPage
                    title="Monitorimi në kohë reale"
                    description="Gjendja e drejtpërdrejtë e laboratorëve."
                  />
                }
              />
              <Route
                path="energjia"
                element={
                  <WorkspaceSectionPage
                    title="Konsumi i energjisë"
                    description="Konsumi i matur dhe historiku energjetik."
                  />
                }
              />
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
                element={
                  <WorkspaceSectionPage
                    title="Mirëmbajtja"
                    description="Detyrat dhe historiku i mirëmbajtjes."
                  />
                }
              />
            </Route>
            <Route element={<PermissionRoute anyOf={["reports.view"]} />}>
              <Route
                path="analitika"
                element={
                  <WorkspaceSectionPage
                    title="Analitika"
                    description="Analiza e të dhënave të universitetit."
                  />
                }
              />
              <Route
                path="raportet"
                element={
                  <WorkspaceSectionPage
                    title="Raportet"
                    description="Raportet e autorizuara të universitetit."
                  />
                }
              />
            </Route>
            <Route element={<PermissionRoute anyOf={["simulations.run"]} />}>
              <Route
                path="simulimet"
                element={
                  <WorkspaceSectionPage
                    title="Simulimet"
                    description="Skenarët e kontrolluar të laboratorëve."
                  />
                }
              />
            </Route>
            <Route
              element={<PermissionRoute anyOf={["university.users.manage"]} />}
            >
              <Route
                path="perdoruesit"
                element={
                  <WorkspaceSectionPage
                    title="Përdoruesit"
                    description="Përdoruesit dhe rolet e universitetit."
                  />
                }
              />
            </Route>
            <Route
              element={
                <PermissionRoute anyOf={["university.profile.manage"]} />
              }
            >
              <Route
                path="cilesimet"
                element={
                  <WorkspaceSectionPage
                    title="Cilësimet"
                    description="Profili dhe preferencat e universitetit."
                  />
                }
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
