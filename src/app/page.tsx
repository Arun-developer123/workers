"use client";

import { useRouter } from "next/navigation";
import AudioButton from "@/components/AudioButton";

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <h1 className="text-3xl font-bold mb-6">👷‍♂️ Mazdoor / ठेकेदार App</h1>
      <p className="text-lg mb-4 flex items-center justify-center">
        स्वागत है!
        <AudioButton text="स्वागत है! कृपया नीचे से विकल्प चुनें" />
      </p>

      <button
        onClick={() => router.push("/auth/sign-up")}
        className="w-full bg-green-600 text-white py-3 rounded-lg mb-4 text-lg shadow"
      >
        नया खाता बनाएँ
      </button>

      <button
        onClick={() => router.push("/auth/sign-in")}
        className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg shadow"
      >
        लॉगिन करें
      </button>
    </div>
  );
}
