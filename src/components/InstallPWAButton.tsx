"use client";

import { useEffect, useState } from "react";

export default function InstallPWAButton() {
  const [prompt, setPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const installApp = async () => {
    if (!prompt) return;
    prompt.prompt();
    const choice = await prompt.userChoice;
    console.log("User choice:", choice.outcome);
    setPrompt(null);
  };

  if (!prompt) return null;

  return (
    <button
      onClick={installApp}
      className="px-5 py-2 rounded-xl bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition"
    >
      Download App
    </button>
  );
}
