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
