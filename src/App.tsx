import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { ChatTutorialProvider } from "@/contexts/ChatTutorialContext";
import { useDynamicSiteTitle } from "@/hooks/useDynamicSiteTitle";
import { useGlobalPresence } from "@/hooks/useGlobalPresence";
import { FreeMindThemeProvider } from "@/themes/ThemeContext";
import Admin from "./pages/Admin";
import Admin2 from "./pages/Admin2";
import Admin3 from "./pages/Admin3";

import Legal from "./pages/Legal";
import Discussion from "./pages/Discussion";
import Landing from "./pages/Landing";
import Wedium from "./pages/Wedium";
import Gutefrage from "./pages/Gutefrage";
import GutefrageAdmin from "./pages/GutefrageAdmin";
import Confirm from "./pages/Confirm";
import Unsubscribe from "./pages/Unsubscribe";
import Fragen from "./pages/Fragen";
import Sogehts from "./pages/Sogehts";
import Bericht from "./pages/Bericht";
import NotificationsPage from "./pages/Notifications";
import PassphraseRecall from "./pages/PassphraseRecall";


import { VerificationDialog } from "@/components/VerificationDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

function AppContent() {
  useDynamicSiteTitle();

  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </BrowserRouter>
      <VerificationDialog />
    </>
  );
}

function AppRoutes() {
  useGlobalPresence();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/wedium" element={<Wedium />} />
      <Route path="/wedium/go" element={<Discussion mode="real" />} />
      <Route path="/wedium/confirm" element={<Confirm wedium />} />
      <Route path="/gutefrage" element={<Gutefrage />} />
      <Route path="/gutefrage/confirm" element={<Confirm gutefrage />} />
      <Route path="/gutefrage/admin" element={<GutefrageAdmin />} />
      <Route path="/go" element={<Discussion mode="sandbox" />} />
      <Route path="/aug-test" element={<Discussion mode="archive" />} />
      <Route path="/test" element={<Discussion mode="test" />} />
      <Route path="/sim" element={<Discussion mode="sim" />} />
      <Route path="/confirm" element={<Confirm />} />

      <Route path="/unsubscribe" element={<Unsubscribe />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/passphrase-vergessen" element={<PassphraseRecall />} />
      <Route path="/faq" element={<Fragen />} />
      <Route path="/sogehts" element={<Sogehts />} />
      <Route path="/bericht" element={<Bericht />} />
      <Route path="/benachrichtigungen" element={<NotificationsPage />} />


      <Route path="/aug-test/admin" element={<Admin2 />} />
      <Route path="/wedium/admin" element={<Admin3 />} />
      <Route path="/admin" element={<Admin />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <FreeMindThemeProvider>
        <TutorialProvider>
          <ChatTutorialProvider>
            <AppContent />
          </ChatTutorialProvider>
        </TutorialProvider>
      </FreeMindThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
