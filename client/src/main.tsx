import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for PWA functionality
// TEMPORARILY DISABLED for cache-busting - will re-enable after user sees changes
if ('serviceWorker' in navigator) {
  // Unregister all existing service workers to clear cache
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log('🗑️ Service Worker unregistered for cache clearing');
    });
  });
}

// Original registration code - will re-enable after testing
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker
//       .register('/sw.js')
//       .then((registration) => {
//         console.log('✅ Service Worker registered successfully:', registration.scope);
//         
//         // Check for updates periodically
//         setInterval(() => {
//           registration.update();
//         }, 60000); // Check every minute
//       })
//       .catch((error) => {
//         console.log('❌ Service Worker registration failed:', error);
//       });
//   });
// }
