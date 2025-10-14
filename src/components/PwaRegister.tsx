// src/components/PwaRegister.tsx
"use client";

import { useEffect, useState } from "react";

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then(() => console.log("Service worker registered"))
        .catch((e) => console.warn("SW registration failed", e));
    }

    // beforeinstallprompt (Chrome/Android)
    const onBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // appinstalled
    const onAppInstalled = () => {
      console.log("PWA installed");
      setShowInstall(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice && choice.outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }
    setShowInstall(false);
    setDeferredPrompt(null);
  };

  const isIos = () => {
    if (typeof window === "undefined") return false;
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  };

  return (
    <>
      {showInstall && (
        <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 999 }}>
          <button
            onClick={install}
            style={{
              background: "#0ea5a4",
              color: "white",
              padding: "10px 14px",
              borderRadius: 8,
              boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
              border: "none",
            }}
          >
            Install KaamLink
          </button>
        </div>
      )}

      {isIos() && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: 20,
            zIndex: 999,
            background: "white",
            borderRadius: 8,
            padding: 10,
            boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
            maxWidth: 320,
          }}
        >
          <div style={{ fontSize: 13 }}>
            iOS users: Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>
          </div>
        </div>
      )}
    </>
  );
}
