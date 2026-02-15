import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TutorialProvider } from "@/contexts/TutorialContext";
import { ChatTutorialProvider } from "@/contexts/ChatTutorialContext";
import { useDynamicSiteTitle } from "@/hooks/useDynamicSiteTitle";
import { useGlobalPresence } from "@/hooks/useGlobalPresence";
import { FreeMindThemeProvider } from "@/themes/ThemeContext";
import Splash from "./pages/Splash";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";
import TopicJoin from "./pages/TopicJoin";
import TopicView from "./pages/TopicView";
import About from "./pages/About";
import Legal from "./pages/Legal";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

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
      <Route path="/eching" element={<Splash />} />
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/home" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/t/:slug" element={<TopicJoin />} />
      <Route path="/topic/:topicId" element={<TopicView />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
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
