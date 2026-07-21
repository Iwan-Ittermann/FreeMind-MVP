import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useParams, Navigate } from "react-router-dom";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { ChatTutorialProvider } from "@/contexts/ChatTutorialContext";
import { useDynamicSiteTitle } from "@/hooks/useDynamicSiteTitle";
import { useGlobalPresence } from "@/hooks/useGlobalPresence";
import { FreeMindThemeProvider } from "@/themes/ThemeContext";
import { SINGLE_TOPIC_MODE, SINGLE_TOPIC_SHORT_CODE } from "@/lib/single-topic";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Admin2 from "./pages/Admin2";
import TopicJoin from "./pages/TopicJoin";
import Legal from "./pages/Legal";
import NotFound from "./pages/NotFound";
import TestDiskussion from "./pages/TestDiskussion";
import EineWocheEineFrage from "./pages/EineWocheEineFrage";
import Landing from "./pages/Landing";
import Confirm from "./pages/Confirm";
import Unsubscribe from "./pages/Unsubscribe";
import { VerificationDialog } from "@/components/VerificationDialog";

const queryClient = new QueryClient();

function AppContent() {
  useDynamicSiteTitle();

  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </>
  );
}

function AppRoutes() {
  useGlobalPresence();

  if (SINGLE_TOPIC_MODE) {
    return (
      <Routes>
        <Route path="/" element={<EineWocheEineFrage />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/admin2" element={<Admin2 />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="/:topicId" element={<LockedTopicRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/eine-woche-eine-frage" element={<EineWocheEineFrage />} />
      <Route path="/confirm" element={<Confirm />} />
      <Route path="/unsubscribe" element={<Unsubscribe />} />
      <Route path="/admin2" element={<Admin2 />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/topic/:topicId" element={<Index />} />
      <Route path="/auth" element={<Navigate to="/eine-woche-eine-frage" replace />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/t/:slug" element={<TopicJoin />} />
      <Route path="/test-diskussion" element={<TestDiskussion />} />
      <Route path="/:topicId" element={<RootTopicRoute />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function RootTopicRoute() {
  const { topicId } = useParams<{ topicId: string }>();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicId ?? '');
  const isShortCode = /^[a-z0-9]{4}$/i.test(topicId ?? '');
  return isUuid || isShortCode ? <EineWocheEineFrage /> : <NotFound />;
}

/** Single-topic mode: only the configured short_code renders; everything else → `/`. */
function LockedTopicRoute() {
  const { topicId } = useParams<{ topicId: string }>();
  if (SINGLE_TOPIC_SHORT_CODE && topicId?.toLowerCase() === SINGLE_TOPIC_SHORT_CODE) {
    return <EineWocheEineFrage />;
  }
  return <Navigate to="/" replace />;
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
