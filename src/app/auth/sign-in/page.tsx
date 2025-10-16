"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AudioButton from "@/components/AudioButton";

type Profile = {
  user_id: string;
  role: string | null;
  name: string | null;
  skill: string | null;
  wage: string | null;
  location: string | null;
  created_at: string | null;
  phone: string | null;
  occupation: string | null;
  pricing_basis: string | null;
  experience_level: string | null;
  rate: number | null;
  rate_unit: string | null;
  availability: string | null;
  profile_image_url: string | null;
};

export default function SignInPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "choose">("phone");
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Step 1: Generate local OTP
  const sendOtp = () => {
    if (!phone) return alert("मोबाइल नंबर डालें ❌");

    const otpNum = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otpNum);

    // Auto-fill the OTP input so user doesn't have to type it
    setOtp(otpNum);

    alert(`आपका OTP है: ${otpNum}`);
    setStep("otp");
  };

  // Helper: when a profile is chosen (or only one exists)
  const finishLoginWithProfile = (profile: Profile) => {
    // store profile in localStorage for fake login state (same key as before)
    localStorage.setItem("fake_user_profile", JSON.stringify(profile));
    alert("✅ लॉगिन सफल, आपका dashboard खुल रहा है");
    // Redirect to home (kept same as original)
    router.push("/home");
  };

  // Step 2: Verify OTP and fetch profiles for this phone
  const verifyOtp = async () => {
    if (otp !== generatedOtp) return alert("गलत OTP ❌");

    setLoading(true);
    try {
      // Fetch all profiles with this phone (could be multiple)
      const { data: userProfiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("phone", phone);

      if (error) {
        console.error("Supabase error:", error);
        setLoading(false);
        return alert("User profiles नहीं मिले ❌, कृपया बाद में कोशिश करें।");
      }

      if (!userProfiles || userProfiles.length === 0) {
        // If no profiles found, redirect user to the sign-up page.
        // We include the phone as a query param so signup can prefill it if you implement that.
        setLoading(false);
        router.push(`/auth/sign-up?phone=${encodeURIComponent(phone)}`);
        return;
      }

      // If only one profile -> directly login
      if (userProfiles.length === 1) {
        finishLoginWithProfile(userProfiles[0] as Profile);
        setLoading(false);
        return;
      }

      // Multiple profiles: prefer showing profiles that share the same role
      // Find the role with maximum occurrences (role could be null)
      const roleCounts: Record<string, number> = {};
      for (const p of userProfiles as Profile[]) {
        const key = p.role ?? "unknown";
        roleCounts[key] = (roleCounts[key] || 0) + 1;
      }

      // Find the role with highest count
      let maxRole: string | null = null;
      let maxCount = 0;
      for (const [r, c] of Object.entries(roleCounts)) {
        if (c > maxCount) {
          maxCount = c;
          maxRole = r;
        }
      }

      let profilesToShow: Profile[] = userProfiles as Profile[];

      // If a role occurs more than once, show only the profiles with that same role
      if (maxRole !== null && maxCount > 1) {
        profilesToShow = (userProfiles as Profile[]).filter(
          (p) => (p.role ?? "unknown") === maxRole
        );
      }

      // Set profiles for selection UI and move to choose step
      setProfiles(profilesToShow);
      setStep("choose");
      setLoading(false);
    } catch (err: unknown) {
      setLoading(false);
      if (err instanceof Error) {
        alert("Error: " + err.message);
      } else {
        alert("An unknown error occurred");
      }
    }
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center h-screen text-center max-w-lg mx-auto">
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
            disabled={loading}
          >
            {loading ? "चेक कर रहे हैं..." : "लॉगिन करें ✅"}
          </button>

          <button
            onClick={() => {
              // allow user to go back and change phone
              setStep("phone");
              setOtp("");
              setGeneratedOtp("");
            }}
            className="mt-3 text-sm underline"
          >
            नंबर बदलें
          </button>
        </>
      )}

      {step === "choose" && profiles && (
        <>
          <p className="mb-3">
            इस नंबर से कई profiles मिले — नीचे से अपना profile चुनें:
          </p>

          <div className="w-full grid grid-cols-1 gap-3">
            {profiles.map((p) => (
              <button
                key={p.user_id}
                onClick={() => finishLoginWithProfile(p)}
                className="flex items-center gap-3 w-full p-3 border rounded hover:shadow"
              >
                <img
                  src={p.profile_image_url ?? "/default-avatar.png"}
                  alt={p.name ?? "Profile"}
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/default-avatar.png";
                  }}
                />
                <div className="text-left flex-1">
                  <div className="font-semibold text-lg">{p.name ?? "नाम नहीं है"}</div>
                  <div className="text-sm text-gray-600">
                    {(p.role && p.role !== "unknown") ? p.role : p.occupation ?? "रोल/व्यवसाय उपलब्ध नहीं"}
                  </div>
                </div>
                <div className="text-sm text-gray-500">खोलें →</div>
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              // go back to phone entry if they want to try different number
              setStep("phone");
              setProfiles(null);
              setOtp("");
              setGeneratedOtp("");
            }}
            className="mt-4 text-sm underline"
          >
            अलग नंबर से लॉगिन करें
          </button>
        </>
      )}
    </div>
  );
}
