import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "@/App";
import { installGlobalErrorHandlers } from "@/core/error-log";
import "@/styles/global.css";

// Phase 13 P0-3: passive crash tracking (metadata only, local storage).
installGlobalErrorHandlers();

// PWA: register the Workbox service worker (auto-update).
// On iOS Safari this enables offline use once added to the Home Screen.
registerSW({ immediate: true });

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
