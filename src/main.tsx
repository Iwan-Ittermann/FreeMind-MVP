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
    disable_session_recording: true,
    // Strip confirmation tokens from any auto-captured URL.
    before_send: (ev) => {
      if (!ev) return ev;
      const scrub = (v: unknown) =>
        typeof v === "string" ? v.replace(/([?&])token=[^&#]*/gi, "$1token=redacted") : v;
      for (const k of ["$current_url", "$pathname", "$referrer", "$initial_referrer", "$initial_current_url"]) {
        if (ev.properties?.[k]) ev.properties[k] = scrub(ev.properties[k]);
        if (ev.$set_once?.[k]) ev.$set_once[k] = scrub(ev.$set_once[k]);
      }
      return ev;
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
