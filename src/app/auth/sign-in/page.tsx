"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AudioButton from "@/components/AudioButton";

export default function SignInPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const router = useRouter();

  // Step 1: Generate local OTP
  const sendOtp = () => {
    if (!phone) return alert("मोबाइल नंबर डालें ❌");

    const otpNum = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otpNum);
    alert(`आपका OTP है: ${otpNum}`);
    setStep("otp");
  };

  // Step 2: Verify OTP and redirect according to role
  const verifyOtp = async () => {
    if (otp !== generatedOtp) return alert("गलत OTP ❌");

    try {
      // Fetch profile row from Supabase
      const { data: userProfile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("phone", phone)
        .single();

      if (error || !userProfile) {
        return alert("User profile नहीं मिला ❌, कृपया पहले साइनअप करें।");
      }

      // ✅ Success → store profile in localStorage for fake login state
      localStorage.setItem("fake_user_profile", JSON.stringify(userProfile));

      alert("✅ लॉगिन सफल, आपका dashboard खुल रहा है");

      // Redirect to home
      router.push("/home");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center h-screen text-center">
      <h1 className="text-2xl font-bold mb-4">लॉगिन करें</h1>

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
          <button
            onClick={verifyOtp}
            className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg shadow"
          >
            लॉगिन करें ✅
          </button>
        </>
      )}
    </div>
  );
}
