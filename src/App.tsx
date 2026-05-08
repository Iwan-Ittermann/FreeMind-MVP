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
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import TopicJoin from "./pages/TopicJoin";
import Legal from "./pages/Legal";
import NotFound from "./pages/NotFound";
import TestDiskussion from "./pages/TestDiskussion";
import TT from "./pages/TT";

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

  return (
    <Routes>
      <Route path="/" element={<TT />} />
      <Route path="/topic/:topicId" element={<Index />} />
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="/admin" element={<Admin />} />
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
  return isUuid || isShortCode ? <TT /> : <NotFound />;
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
