"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AudioButton from "@/components/AudioButton";

export default function NewJobPage() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [wage, setWage] = useState("");
  const [description, setDescription] = useState("");
  const [contractorId, setContractorId] = useState<string | null>(null);
  const router = useRouter();

  // Contractor check
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        alert("❌ User ID नहीं मिली, कृपया दोबारा लॉगिन करें");
        router.push("/auth/sign-in");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile) {
        alert("❌ प्रोफाइल नहीं मिली, कृपया एडमिन से संपर्क करें");
        router.push("/home");
        return;
      }

      if (profile.role !== "contractor") {
        alert("❌ सिर्फ ठेकेदार नया काम डाल सकते हैं");
        router.push("/home");
        return;
      }

      setContractorId(user.id);

      // Auto location fetch
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocation(
              `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
            );
          },
          () => setLocation("")
        );
      }
    };

    fetchProfile();
  }, []);

  const postJob = async () => {
    if (!contractorId) {
      alert("❌ ठेकेदार ID नहीं मिली");
      return;
    }
    if (!title || !wage) {
      alert("❌ कृपया काम का नाम और मजदूरी भरें");
      return;
    }

    // Optional: convert wage to number if you want it stored as numeric
    const wageValue = wage.trim();

    const { error } = await supabase.from("jobs").insert({
      contractor_id: contractorId,
      title: title.trim(),
      location: location.trim() || null,
      wage: wageValue,
      description: description.trim() || null,
    });

    if (error) {
      console.error("Job insert error:", error);
      alert("❌ काम डालने में समस्या: " + error.message);
    } else {
      alert("✅ काम सफलतापूर्वक डाला गया");
      router.push("/home");
    }
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-center">नया काम डालें</h1>

      <label className="text-lg flex items-center">
        काम का नाम लिखें
        <AudioButton text="काम का नाम लिखें" />
      </label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="जैसे: ईंट उठाने का काम"
        className="border p-3 rounded text-lg"
      />

      <label className="text-lg flex items-center">
        मजदूरी (रुपये)
        <AudioButton text="मजदूरी रुपये में लिखें" />
      </label>
      <input
        value={wage}
        onChange={(e) => setWage(e.target.value)}
        placeholder="उदा: 600"
        className="border p-3 rounded text-lg"
      />

      <label className="text-lg flex items-center">
        स्थान (ऑटोमेटिक / खुद लिखें)
        <AudioButton text="स्थान डालें" />
      </label>
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="स्थान लिखें"
        className="border p-3 rounded text-lg"
      />

      <label className="text-lg flex items-center">
        काम का विवरण
        <AudioButton text="काम का विवरण लिखें" />
      </label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="थोड़ा सा विवरण लिखें"
        className="border p-3 rounded text-lg"
        rows={4}
      />

      <button
        onClick={postJob}
        className="w-full bg-green-700 text-white py-3 rounded-lg text-lg mt-4"
      >
        काम डालें ✅
      </button>
    </div>
  );
}
