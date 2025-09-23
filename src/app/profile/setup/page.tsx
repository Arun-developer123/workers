"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AudioButton from "@/components/AudioButton";

export default function ProfileSetupPage() {
  const [role, setRole] = useState<"worker" | "contractor" | null>(null);
  const [name, setName] = useState("");
  const [skill, setSkill] = useState("");
  const [wage, setWage] = useState("");
  const [location, setLocation] = useState("");
  const router = useRouter();

  // Location auto fetch
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation(
            `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
          );
        },
        () => {
          setLocation("लोकेशन नहीं मिली");
        }
      );
    }
  }, []);

  const saveProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("❌ User ID नहीं मिली, कृपया दोबारा लॉगिन करें");
      router.push("/auth/sign-in");
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      role,
      name,
      skill: role === "worker" ? skill : null,
      wage: role === "worker" ? wage : null,
      location,
    });

    if (error) {
      alert("प्रोफ़ाइल सेव करने में समस्या ❌");
    } else {
      router.push("/home");
    }
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-center">प्रोफ़ाइल सेटअप</h1>

      {/* Role Selection */}
      <p className="text-lg flex items-center">
        भूमिका चुनें:
        <AudioButton text="भूमिका चुनें" />
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => setRole("worker")}
          className={`flex-1 py-3 rounded-lg text-lg shadow ${
            role === "worker" ? "bg-green-600 text-white" : "bg-gray-200"
          }`}
        >
          मज़दूर
        </button>
        <button
          onClick={() => setRole("contractor")}
          className={`flex-1 py-3 rounded-lg text-lg shadow ${
            role === "contractor" ? "bg-green-600 text-white" : "bg-gray-200"
          }`}
        >
          ठेकेदार
        </button>
      </div>

      {/* Name */}
      <label className="text-lg flex items-center">
        नाम डालें
        <AudioButton text="नाम डालें" />
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="अपना नाम लिखें"
        className="border p-3 rounded text-lg"
      />

      {/* Worker Specific Fields */}
      {role === "worker" && (
        <>
          <label className="text-lg flex items-center">
            आपका काम / स्किल
            <AudioButton text="आपका काम स्किल" />
          </label>
          <input
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="जैसे: राजमिस्त्री, पेंटर"
            className="border p-3 rounded text-lg"
          />

          <label className="text-lg flex items-center">
            आपकी दिहाड़ी (रुपये में)
            <AudioButton text="आपकी दिहाड़ी रुपये में" />
          </label>
          <input
            value={wage}
            onChange={(e) => setWage(e.target.value)}
            placeholder="उदा: 500"
            className="border p-3 rounded text-lg"
          />
        </>
      )}

      {/* Location */}
      <p className="text-lg flex items-center">
        लोकेशन (ऑटोमेटिक)
        <AudioButton text="लोकेशन ऑटोमेटिक" />
      </p>
      <p className="p-2 border rounded bg-gray-100">{location}</p>

      <button
        onClick={saveProfile}
        className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg shadow mt-4"
      >
        प्रोफ़ाइल सेव करें ✅
      </button>
    </div>
  );
}
