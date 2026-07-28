import { Route, Routes } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout.jsx";
import { AboutPage } from "@/pages/AboutPage.jsx";
import { ContactPage } from "@/pages/ContactPage.jsx";
import { FeaturesPage } from "@/pages/FeaturesPage.jsx";
import { HomePage } from "@/pages/HomePage.jsx";
import { HowItWorksPage } from "@/pages/HowItWorksPage.jsx";
import { LoginPage } from "@/pages/LoginPage.jsx";
import { NotFoundPage } from "@/pages/NotFoundPage.jsx";
import { RegisterPage } from "@/pages/RegisterPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="rreth-nesh" element={<AboutPage />} />
        <Route path="funksionalitetet" element={<FeaturesPage />} />
        <Route path="si-funksionon" element={<HowItWorksPage />} />
        <Route path="kontakti" element={<ContactPage />} />
        <Route path="regjistrohu" element={<RegisterPage />} />
        <Route path="kycu" element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
