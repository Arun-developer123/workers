"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AudioButton from "@/components/AudioButton";

type Role = "worker" | "contractor" | null;

type OccupationOption = {
  value: string;
  label: string;
  pricingOptions: { value: string; label: string; unitHint?: string }[];
};

const OCCUPATIONS: OccupationOption[] = [
  {
    value: "rajmistri",
    label: "राजमिस्त्री (Mason)",
    pricingOptions: [
      { value: "per_day", label: "दर: प्रति दिन", unitHint: "INR/day" },
      { value: "per_hour", label: "दर: प्रति घंटा", unitHint: "INR/hour" },
      { value: "per_piece", label: "दर: प्रति यूनिट", unitHint: "INR/piece" },
    ],
  },
  {
    value: "painter",
    label: "पेंटर (Painter)",
    pricingOptions: [
      { value: "per_day", label: "दर: प्रति दिन", unitHint: "INR/day" },
      { value: "per_sqft", label: "दर: प्रति sqft", unitHint: "INR/sqft" },
      { value: "per_hour", label: "दर: प्रति घंटा", unitHint: "INR/hour" },
    ],
  },
  {
    value: "electrician",
    label: "इलेक्ट्रीशियन (Electrician)",
    pricingOptions: [
      { value: "per_hour", label: "दर: प्रति घंटा", unitHint: "INR/hour" },
      { value: "per_job", label: "दर: प्रति काम", unitHint: "INR/job" },
    ],
  },
  {
    value: "plumber",
    label: "प्लम्बर (Plumber)",
    pricingOptions: [
      { value: "per_hour", label: "दर: प्रति घंटा", unitHint: "INR/hour" },
      { value: "per_job", label: "दर: प्रति काम", unitHint: "INR/job" },
    ],
  },
  {
    value: "carpenter",
    label: "कारपेंटर (Carpenter)",
    pricingOptions: [
      { value: "per_day", label: "दर: प्रति दिन", unitHint: "INR/day" },
      { value: "per_hour", label: "दर: प्रति घंटा", unitHint: "INR/hour" },
      { value: "per_piece", label: "दर: प्रति यूनिट", unitHint: "INR/piece" },
    ],
  },
  {
    value: "welding",
    label: "वेल्डर (Welder)",
    pricingOptions: [
      { value: "per_hour", label: "दर: प्रति घंटा", unitHint: "INR/hour" },
      { value: "per_job", label: "दर: प्रति काम", unitHint: "INR/job" },
    ],
  },
  {
    value: "driver",
    label: "ड्राइवर (Driver)",
    pricingOptions: [
      { value: "per_day", label: "दर: प्रति दिन", unitHint: "INR/day" },
      { value: "per_trip", label: "दर: प्रति ट्रिप", unitHint: "INR/trip" },
    ],
  },
  {
    value: "helper",
    label: "हेल्पर / लेबर (Helper / Labourer)",
    pricingOptions: [
      { value: "per_day", label: "दर: प्रति दिन", unitHint: "INR/day" },
      { value: "per_hour", label: "दर: प्रति घंटा", unitHint: "INR/hour" },
    ],
  },
  {
    value: "tile_fixer",
    label: "टाइल फिट्टर (Tile fixer)",
    pricingOptions: [
      { value: "per_sqft", label: "दर: प्रति sqft", unitHint: "INR/sqft" },
      { value: "per_day", label: "दर: प्रति दिन", unitHint: "INR/day" },
    ],
  },
  // आप और occupations यहाँ add कर सकते हैं
];

const EXPERIENCE_LEVELS = [
  { value: "0-1", label: "0-1 वर्ष" },
  { value: "1-3", label: "1-3 वर्ष" },
  { value: "3-5", label: "3-5 वर्ष" },
  { value: "5+", label: "5+ वर्ष" },
];

export default function ProfileSetupPage() {
  const [role, setRole] = useState<Role>(null);
  const [name, setName] = useState("");
  const [skill, setSkill] = useState("");
  const [wage, setWage] = useState(""); // legacy text field
  const [location, setLocation] = useState("");
  const router = useRouter();

  // New states
  const [occupation, setOccupation] = useState<string>("");
  const [pricingBasis, setPricingBasis] = useState<string>("");
  const [pricingOptions, setPricingOptions] = useState<
    { value: string; label: string; unitHint?: string }[]
  >([]);
  const [experience, setExperience] = useState<string>("");
  const [rate, setRate] = useState<string>(""); // structured numeric rate
  const [rateUnit, setRateUnit] = useState<string>("");

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

  // update pricing options when occupation changes
  useEffect(() => {
    const occ = OCCUPATIONS.find((o) => o.value === occupation);
    if (occ) {
      setPricingOptions(occ.pricingOptions);
      // reset pricingBasis / rate when occupation changes
      setPricingBasis("");
      setRate("");
      setRateUnit("");
    } else {
      setPricingOptions([]);
    }
  }, [occupation]);

  // set rateUnit when pricingBasis changes
  useEffect(() => {
    if (!pricingBasis) {
      setRateUnit("");
      return;
    }
    const found = pricingOptions.find((p) => p.value === pricingBasis);
    setRateUnit(found?.unitHint ?? "");
  }, [pricingBasis, pricingOptions]);

  const validateAndPrepare = () => {
    if (!role) {
      alert("कृपया भूमिका चुनें (मज़दूर या ठेकेदार)");
      return false;
    }
    if (!name.trim()) {
      alert("कृपया नाम डालें");
      return false;
    }
    if (role === "worker") {
      if (!occupation) {
        alert("कृपया अपना occupation चुनें");
        return false;
      }
      if (!pricingBasis) {
        alert("कृपया pricing basis चुनें");
        return false;
      }
      if (!rate || isNaN(Number(rate))) {
        alert("कृपया वैध rate डालें (नंबर)");
        return false;
      }
    }
    return true;
  };

  const saveProfile = async () => {
    if (!validateAndPrepare()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("❌ User ID नहीं मिली, कृपया दोबारा लॉगिन करें");
      router.push("/auth/sign-in");
      return;
    }

    // Map to DB fields
    const upsertObj: any = {
      user_id: user.id,
      role,
      name,
      location,
      phone: (user?.phone as string) ?? user?.user_metadata?.phone ?? null,
    };

    if (role === "worker") {
      upsertObj.occupation = occupation || null;
      upsertObj.pricing_basis = pricingBasis || null;
      upsertObj.experience_level = experience || null;
      upsertObj.rate = rate ? parseFloat(rate) : null;
      upsertObj.rate_unit = rateUnit || null;
      upsertObj.skill = skill || null;
      upsertObj.wage = wage || String(rate || ""); // keep wage for backward compatibility
      upsertObj.availability = "available";
    } else {
      // contractor specific fields (optional)
      upsertObj.skill = null;
      upsertObj.wage = null;
    }

    const { error } = await supabase.from("profiles").upsert(upsertObj);

    if (error) {
      console.error("Supabase upsert error:", error);
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
          <label className="text-lg flex items-center gap-2">
            Occupation / काम चुनें
            <AudioButton text="काम चुनें" />
          </label>
          <select
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            className="border p-3 rounded text-lg"
          >
            <option value="">-- अपना काम चुनें --</option>
            {OCCUPATIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <label className="text-lg flex items-center gap-2">
            Pricing Basis (दर चुनें)
            <AudioButton text="दर चुनें" />
          </label>
          <select
            value={pricingBasis}
            onChange={(e) => setPricingBasis(e.target.value)}
            className="border p-3 rounded text-lg"
            disabled={!pricingOptions.length}
          >
            <option value="">-- basis चुनें --</option>
            {pricingOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <label className="text-lg flex items-center gap-2">
            अनुभव (Experience)
            <AudioButton text="अनुभव चुनें" />
          </label>
          <select
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="border p-3 rounded text-lg"
          >
            <option value="">-- अनुभाव चुनें --</option>
            {EXPERIENCE_LEVELS.map((ex) => (
              <option key={ex.value} value={ex.value}>
                {ex.label}
              </option>
            ))}
          </select>

          {/* Rate input shown based on pricing basis */}
          {pricingBasis && (
            <>
              <label className="text-lg flex items-center gap-2">
                Rate ({rateUnit || "INR"}) 
                <AudioButton text="दर दर्ज करें" />
              </label>
              <input
                value={rate}
                onChange={(e) => {
                  // allow only numbers and dot
                  const val = e.target.value;
                  if (/^[0-9]*\.?[0-9]*$/.test(val) || val === "") {
                    setRate(val);
                    // also set legacy wage for compatibility
                    setWage(val);
                  }
                }}
                placeholder={`जैसे: 500 (${rateUnit || "INR"})`}
                className="border p-3 rounded text-lg"
                inputMode="decimal"
              />
            </>
          )}

          {/* Skill (free text) */}
          <label className="text-lg flex items-center">
            आपका काम / स्किल (विस्तार)
            <AudioButton text="आपका काम स्किल" />
          </label>
          <input
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="जैसे: राजमिस्त्री, पेंटर"
            className="border p-3 rounded text-lg"
          />

          {/* Legacy wage (optional) */}
          <label className="text-lg flex items-center">
            आपकी दिहाड़ी (रुपये में) — legacy (optional)
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
