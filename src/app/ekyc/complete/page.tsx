// /src/app/ekyc/complete/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function EkycCompletePage() {
  const router = useRouter();
  const search = useSearchParams();
  const userIdFromQuery = search?.get("user_id") || null;

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState<string | null>(userIdFromQuery);

  const [aadhaar, setAadhaar] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [upi, setUpi] = useState("");

  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // prefill from localStorage if available
    const stored = localStorage.getItem("fake_user_profile");
    if (stored) {
      try {
        const p = JSON.parse(stored);
        setName(p.name || "");
        setPhone(p.phone || "");
        if (!userId) setUserId(p.user_id || null);
      } catch (e) {
        // ignore
      }
    }
  }, [userId]);

  const validateAadhaar = (val: string) => /^\d{12}$/.test(val.trim());
  const validateIFSC = (val: string) => /^[A-Za-z]{4}0[A-Z0-9]{6}$/.test(val.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!userId) {
      setMessage("User ID missing. Please sign in again or use the link you received.");
      return;
    }

    if (!aadhaarFile || !bankFile) {
      setMessage("कृपया Aadhaar और Bank passbook की फ़ोटो अपलोड करें।");
      return;
    }

    if (!validateAadhaar(aadhaar)) {
      setMessage("Aadhaar नंबर 12 अंकों का होना चाहिए।");
      return;
    }

    if (ifsc && !validateIFSC(ifsc)) {
      const ok = confirm("IFSC का फॉर्मैट ठीक नहीं दिख रहा। क्या आप आगे बढ़ना चाहते हैं?");
      if (!ok) return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("user_id", userId);
      fd.append("name", name);
      fd.append("phone", phone);
      fd.append("aadhaar", aadhaar);
      fd.append("bank_name", bankName);
      fd.append("account_number", accountNumber);
      fd.append("ifsc", ifsc);
      fd.append("upi", upi);
      if (aadhaarFile) fd.append("aadhaar_file", aadhaarFile);
      if (bankFile) fd.append("bank_file", bankFile);
      if (profilePhotoFile) fd.append("profile_file", profilePhotoFile);

      const res = await fetch("/api/ekyc/submit", {
  method: "POST",
  body: fd,
});

let j: any = null;
try {
  // server should return JSON; if not, catch below
  j = await res.json();
} catch (parseErr) {
  const text = await res.text();
  console.error("Non-JSON response from /api/ekyc/submit:", text);
  setMessage("सर्वर से अजीब प्रतिक्रिया मिली — डेवलपर कंसोल देखें।");
  setLoading(false);
  return;
}

if (!res.ok) {
  console.error(j);
  setMessage(j?.error || "Submission failed");
  setLoading(false);
  return;
}


      // update cached profile locally so home page updates immediately
      const stored = localStorage.getItem("fake_user_profile");
      if (stored) {
        try {
          const p = JSON.parse(stored);
          const newP = { ...p, is_ekyc_complete: true, ekyc_status: "pending" };
          localStorage.setItem("fake_user_profile", JSON.stringify(newP));
          try {
            window.dispatchEvent(new CustomEvent("fake_profile_changed", { detail: newP }));
          } catch (e) {
            console.warn("dispatch failed", e);
          }
        } catch (e) {}
      }

      alert("आपका दस्तावेज़ सफलतापूर्वक जमा हो गया। हमारी टीम इसे जाँच कर के 24-48 घंटे में वेरिफ़ाय कर देगी।");
      router.push("/home");
    } catch (err) {
      console.error("submit error", err);
      setMessage("कुछ त्रुटि हुई — कृपया पुनः प्रयास करें।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">eKYC पूरा करें</h1>
      <p className="mb-4 text-sm text-gray-600">
        यह फॉर्म भरकर आप KaamLink पर verified badge के लिए आवेदन करते हैं। दस्तावेज़ 24-48 घंटे में जाँचे जाएंगे।
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow">
        <div>
          <label className="text-sm font-medium">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full p-2 border rounded" required />
        </div>

        <div>
          <label className="text-sm font-medium">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full p-2 border rounded" required />
        </div>

        <div>
          <label className="text-sm font-medium">Aadhaar Number (12 digits)</label>
          <input value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} className="mt-1 w-full p-2 border rounded" placeholder="123412341234" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Bank Name</label>
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1 w-full p-2 border rounded" />
          </div>
          <div>
            <label className="text-sm font-medium">Account Number</label>
            <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="mt-1 w-full p-2 border rounded" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">IFSC (optional)</label>
            <input value={ifsc} onChange={(e) => setIfsc(e.target.value)} className="mt-1 w-full p-2 border rounded" placeholder="ABCD0123456" />
          </div>
          <div>
            <label className="text-sm font-medium">UPI ID (optional)</label>
            <input value={upi} onChange={(e) => setUpi(e.target.value)} className="mt-1 w-full p-2 border rounded" placeholder="mobile@upi" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Aadhaar Photo (front / readable)</label>
          <input type="file" accept="image/*" onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)} className="mt-1 w-full" />
        </div>

        <div>
          <label className="text-sm font-medium">Bank passbook / cancelled cheque photo</label>
          <input type="file" accept="image/*" onChange={(e) => setBankFile(e.target.files?.[0] || null)} className="mt-1 w-full" />
        </div>

        <div>
          <label className="text-sm font-medium">Profile Photo (optional)</label>
          <input type="file" accept="image/*" onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)} className="mt-1 w-full" />
        </div>

        {message && <div className="text-sm text-red-600">{message}</div>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading} className="bg-green-600 text-white py-2 px-4 rounded font-semibold">
            {loading ? "जमा कर रहे हैं..." : "सबमिट और वेरिफ़ाई के लिए भेजें"}
          </button>

          <button type="button" onClick={() => router.push("/home")} className="py-2 px-3 border rounded">
            बाद में करें
          </button>
        </div>

        <div className="text-xs text-gray-500">
          नोट: दस्तावेज़ सुरक्षित रूप से स्टोर किए जाएंगे। प्रोडक्शन में private buckets और server-side encryption का प्रयोग आवश्यक है।
        </div>
      </form>
    </div>
  );
}
