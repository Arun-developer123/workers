// File: src/components/InstallPWAButton.tsx
"use client";

import { useEffect, useState } from "react";

/**
 * Narrow, safe type for the `beforeinstallprompt` event.
 * This mirrors the commonly available properties used for the PWA install flow.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
  // Some environments already include preventDefault on the Event, but ensure it's present on this type.
  preventDefault: () => void;
}

export default function InstallPWAButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      // Cast to our typed event after preventing the automatic prompt
      const ev = e as BeforeInstallPromptEvent;
      try {
        // Prevent the browser's automatic install prompt so we can show our own button
        ev.preventDefault();
      } catch {
        // ignore if environment disallows calling preventDefault
      }
      setPromptEvent(ev);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const installApp = async () => {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      console.log("PWA install choice:", choice.outcome);
    } catch (err) {
      console.warn("Install flow failed:", err);
    } finally {
      // hide the button after the user made a choice (or in case of error)
      setPromptEvent(null);
    }
  };

  // Only render the button when the beforeinstallprompt event has fired
  if (!promptEvent) return null;

  return (
    <button
      onClick={installApp}
      className="px-5 py-2 rounded-xl bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition"
      aria-label="Install KaamLink app"
    >
      Download App
    </button>
  );
}
