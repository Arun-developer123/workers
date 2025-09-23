"use client";

import { Volume2 } from "lucide-react";

export default function AudioButton({ text }: { text: string }) {
  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "hi-IN";
    speechSynthesis.speak(utterance);
  };

  return (
    <button
      onClick={speak}
      className="ml-2 p-2 rounded-full bg-blue-500 text-white shadow"
    >
      <Volume2 size={20} />
    </button>
  );
}
