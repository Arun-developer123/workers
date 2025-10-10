"use client";

import { useState, useEffect, useRef } from "react";
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
];

const EXPERIENCE_LEVELS = [
  { value: "0-1", label: "0-1 वर्ष" },
  { value: "1-3", label: "1-3 वर्ष" },
  { value: "3-5", label: "3-5 वर्ष" },
  { value: "5+", label: "5+ वर्ष" },
];

// Upsert shape for the `profiles` table (narrowly typed to avoid `any`)
type UpsertProfile = {
  user_id: string;
  role: Role | null;
  name: string;
  location?: string | null;
  phone?: string | null;
  occupation?: string | null;
  pricing_basis?: string | null;
  experience_level?: string | null;
  rate?: number | null;
  rate_unit?: string | null;
  skill?: string | null;
  wage?: string | null;
  availability?: string | null;
  profile_image_url?: string | null; // new column to store public URL
};

// Narrow type for existing profile row returned from select
type ExistingProfileRow = {
  phone?: string | null;
  profile_image_url?: string | null;
};

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

  // Image states
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // handle file selection (camera or file picker)
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    setProfileImageFile(f);
    setProfileImagePreview(URL.createObjectURL(f));
  };

  const openCamera = () => {
    // trigger hidden file input with capture attribute
    fileInputRef.current?.click();
  };

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

    // --- Ensure we don't overwrite phone saved during signup ---
    // Fetch existing profile row (if any) to preserve phone inserted at signup
    let existingProfile: ExistingProfileRow | null = null;
    try {
      const { data: rows, error: fetchError } = await supabase
        .from("profiles")
        .select("phone, profile_image_url")
        .eq("user_id", user.id)
        .limit(1);

      if (!fetchError && Array.isArray(rows) && rows.length > 0) {
        // safe typed access
        existingProfile = rows[0] as ExistingProfileRow;
      }
    } catch (e) {
      console.warn("Could not fetch existing profile (non-fatal):", e);
    }

    // Decide phone to save:
    // - Prefer the phone already present in profiles (signup value)
    // - Fallback to auth user phone or user_metadata phone if profile missing
    const phoneToSave =
      existingProfile?.phone ??
      (user?.phone as string | undefined) ??
      (user?.user_metadata?.phone as string | undefined) ??
      null;

    let publicImageUrl: string | null = null;

    // If user selected image, upload to Supabase Storage
    if (profileImageFile) {
      try {
        // Choose a bucket name (create this bucket in your Supabase dashboard): 'profile-images'
        const bucket = "profile-images";
        const fileExt = profileImageFile.name.split(".").pop() ?? "jpg";
        const filePath = `profiles/${user.id}/profile_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, profileImageFile, { upsert: true });

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          alert("प्रोफ़ाइल इमेज अपलोड करने में समस्या हुई");
        } else {
          // get public URL (note: configure bucket to be public or use signed URLs)
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
          // narrow typing for returned object
          const typedUrlData = urlData as { publicUrl?: string } | null;
          publicImageUrl = typedUrlData?.publicUrl ?? null;
        }
      } catch (err) {
        console.error("Upload exception:", err);
        alert("इमेज अपलोड करते समय त्रुटि हुई");
      }
    }

    // Build upsert object carefully to AVOID overwriting existing phone or image accidentally
    const upsertObj: Partial<UpsertProfile> = {
      user_id: user.id,
      role,
      name,
      location,
      // Preserve the signup phone if it exists; otherwise take auth user phone
      phone: phoneToSave,
    };

    // Add profile image only if we uploaded a new one; otherwise preserve existing
    if (publicImageUrl) {
      upsertObj.profile_image_url = publicImageUrl;
    } else if (existingProfile?.profile_image_url) {
      upsertObj.profile_image_url = existingProfile.profile_image_url;
    }

    if (role === "worker") {
      upsertObj.occupation = occupation || null;
      upsertObj.pricing_basis = pricingBasis || null;
      upsertObj.experience_level = experience || null;
      upsertObj.rate = rate ? parseFloat(rate) : null;
      upsertObj.rate_unit = rateUnit || null;
      upsertObj.skill = skill || null;
      upsertObj.wage = wage || String(rate || "");
      upsertObj.availability = "available";
    } else {
      // contractor specific fields (optional) — explicitly set to null to avoid stale values
      upsertObj.occupation = null;
      upsertObj.pricing_basis = null;
      upsertObj.experience_level = null;
      upsertObj.rate = null;
      upsertObj.rate_unit = null;
      upsertObj.skill = null;
      upsertObj.wage = null;
      upsertObj.availability = null;
    }

    // Use onConflict so we update existing row instead of inserting duplicate
    const { error } = await supabase
      .from("profiles")
      .upsert([upsertObj], { onConflict: "user_id" });

    if (error) {
      console.error("Supabase upsert error:", error);
      alert("प्रोफ़ाइल सेव करने में समस्या ❌");
    } else {
      // <-- Redirect changed here to sign-in page as requested -->
      router.push("/auth/sign-in");
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

      {/* Upload image button (visible for both roles) */}
      <div>
        <label className="text-lg flex items-center gap-2">प्रोफ़ाइल फोटो</label>
        <div className="flex items-center gap-3">
          <button
            onClick={openCamera}
            className="py-2 px-4 bg-indigo-600 text-white rounded-lg shadow"
          >
            Upload Image / Camera
          </button>

          {/* Preview */}
          {profileImagePreview ? (
            <img src={profileImagePreview} alt="preview" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">No image</div>
          )}
        </div>

        {/* hidden file input: capture attribute hints mobile to open camera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileChange}
          className="hidden"
        />
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

/*
  Database changes to run (example):

  -- Add a column to store the public URL of the uploaded profile image
  ALTER TABLE public.profiles
    ADD COLUMN profile_image_url text NULL;
*/
