"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AudioButton from "@/components/AudioButton";

export default function SignUpPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [name, setName] = useState("");
  const router = useRouter();

  // Simple phone validation (keeps it light; change regex if you need stricter rules)
  const isValidPhone = (p: string) => {
    const cleaned = p.replace(/[^0-9+]/g, "");
    // require at least 10 digits (India typical) and optionally a leading +country
    const digits = cleaned.replace(/[^0-9]/g, "");
    return digits.length >= 10;
  };

  // Step 1: Generate local OTP
  const sendOtp = () => {
    const trimmed = phone.trim();
    if (!trimmed) return alert("मोबाइल नंबर डालें ❌");
    if (!isValidPhone(trimmed)) return alert("कृपया मान्य मोबाइल नंबर डालें (कम से कम 10 अंकों) ❌");

    const otpNum = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otpNum);
    // For now we show OTP via alert (local flow). Replace with real SMS provider in production.
    alert(`आपका OTP है: ${otpNum}`);
    setStep("otp");
  };

  // Step 2: Verify OTP and create Supabase auth + profile
  const verifyOtp = async () => {
    if (otp !== generatedOtp) return alert("गलत OTP ❌");

    try {
      const randomEmail = `user_${Date.now()}@example.com`;
      const randomPassword = crypto.randomUUID();

      // Sign up user in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: randomEmail,
        password: randomPassword,
      });

      if (authError) return alert("Auth failed ❌: " + authError.message);

      const user = authData?.user ?? null;
      if (!user) {
        // In some Supabase configs the user object may be null until email confirmation.
        // Notify the user and still attempt to continue if an id is present in the response.
        return alert("User creation pending — please check your email to confirm signup.");
      }

      const userId = user.id;

      // Upsert profile so phone gets saved even if a row already exists for this user
      const profilePayload = {
        user_id: userId,
        role: "worker",
        name: name || null,
        phone: phone.trim(),
        skill: null,
        wage: null,
        location: null,
      } as const;

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert([profilePayload], { onConflict: "user_id" });

      if (profileError)
        return alert("Profile create नहीं हुई ❌: " + profileError.message);

      alert("✅ खाता और profile बन गया");
      router.push("/profile/setup");
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("Error: " + err.message);
      } else {
        alert("An unknown error occurred");
      }
    }
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center h-screen text-center">
      <h1 className="text-2xl font-bold mb-4">नया खाता बनाएँ</h1>

      {step === "phone" && (
        <>
          <label className="block text-lg mb-2 flex items-center justify-center">
            मोबाइल नंबर डालें
            <AudioButton text="मोबाइल नंबर डालें" />
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="उदा: +919876543210"
            className="w-full border p-3 rounded mb-4 text-lg"
          />
          <button
            onClick={sendOtp}
            className="w-full bg-green-600 text-white py-3 rounded-lg text-lg shadow"
          >
            OTP भेजें
          </button>
        </>
      )}

      {step === "otp" && (
        <>
          <label className="block text-lg mb-2 flex items-center justify-center">
            OTP डालें
            <AudioButton text="OTP डालें" />
          </label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="6 अंकों का OTP"
            className="w-full border p-3 rounded mb-4 text-lg"
          />
          <label className="block text-lg mb-2">नाम (Optional):</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="नाम डालें"
            className="w-full border p-3 rounded mb-4 text-lg"
          />
          <button
            onClick={verifyOtp}
            className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg shadow"
          >
            खाता बनाएँ ✅
          </button>
        </>
      )}
    </div>
  );
}
