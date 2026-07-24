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
import Legal from "./pages/Legal";
import EineWocheEineFrage from "./pages/EineWocheEineFrage";
import Landing from "./pages/Landing";
import Confirm from "./pages/Confirm";
import Unsubscribe from "./pages/Unsubscribe";
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
      <Route path="/7mm9" element={<EineWocheEineFrage />} />
      <Route path="/confirm" element={<Confirm />} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/admin2" element={<Admin2 />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="/:topicId" element={<Navigate to="/7mm9" replace />} />
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
