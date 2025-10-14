// src/components/PwaRegister.tsx
"use client";

import { useEffect, useState } from "react";

/**
 * Type for the beforeinstallprompt event (commonly not yet present in all lib.dom typings).
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
}

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register service worker (ignore errors)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then(() => console.log("Service worker registered"))
        .catch((e) => console.warn("SW registration failed", e));
    }

    const onBeforeInstall = (e: Event) => {
      const ev = e as BeforeInstallPromptEvent;
      // prevent the automatic prompt
      try {
        ev.preventDefault();
      } catch {
        // some environments may not allow preventDefault on Event; ignore
      }
      setDeferredPrompt(ev);
      setShowInstall(true);
    };

    const onAppInstalled = () => {
      console.log("PWA installed");
      setShowInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        console.log("User accepted the install prompt");
      } else {
        console.log("User dismissed the install prompt");
      }
    } catch (err) {
      console.warn("Install prompt failed:", err);
    } finally {
      setShowInstall(false);
      setDeferredPrompt(null);
    }
  };

  const isIos = (): boolean => {
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
