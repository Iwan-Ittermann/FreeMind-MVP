import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import App from "./App.tsx";
import "./i18n/config";
import "./index.css";

const phKey = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY;
const phRegion = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION || "eu";
const isLive = /(^|\.)freemind\.chat$|freemind-prototype\.lovable\.app$/.test(window.location.hostname);

if (phKey && isLive) {
  posthog.init(phKey, {
    api_host: phRegion === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com",
    capture_pageview: "history_change",
    person_profiles: "identified_only",
  });
}

createRoot(document.getElementById("root")!).render(<App />);
