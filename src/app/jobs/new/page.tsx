"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AudioButton from "@/components/AudioButton";

type PricingOption = { value: string; label: string; unitHint?: string };

const OCCUPATIONS: { value: string; label: string; pricingOptions: PricingOption[] }[] = [
  {
    value: "rajmistri",
    label: "राजमिस्त्री (Mason)",
    pricingOptions: [
      { value: "per_day", label: "प्रति दिन", unitHint: "day" },
      { value: "per_hour", label: "प्रति घंटा", unitHint: "hour" },
      { value: "per_piece", label: "प्रति यूनिट", unitHint: "piece" },
    ],
  },
  {
    value: "painter",
    label: "पेंटर (Painter)",
    pricingOptions: [
      { value: "per_sqft", label: "प्रति sqft", unitHint: "sqft" },
      { value: "per_day", label: "प्रति दिन", unitHint: "day" },
      { value: "per_hour", label: "प्रति घंटा", unitHint: "hour" },
    ],
  },
  {
    value: "electrician",
    label: "इलेक्ट्रीशियन (Electrician)",
    pricingOptions: [
      { value: "per_hour", label: "प्रति घंटा", unitHint: "hour" },
      { value: "per_job", label: "प्रति काम", unitHint: "job" },
    ],
  },
  {
    value: "plumber",
    label: "प्लम्बर (Plumber)",
    pricingOptions: [
      { value: "per_hour", label: "प्रति घंटा", unitHint: "hour" },
      { value: "per_job", label: "प्रति काम", unitHint: "job" },
    ],
  },
  {
    value: "carpenter",
    label: "कारपेंटर (Carpenter)",
    pricingOptions: [
      { value: "per_day", label: "प्रति दिन", unitHint: "day" },
      { value: "per_hour", label: "प्रति घंटा", unitHint: "hour" },
      { value: "per_piece", label: "प्रति यूनिट", unitHint: "piece" },
    ],
  },
];

function nearestMultiple(value: number, multiple: number) {
  if (!isFinite(value) || multiple <= 0) return value;
  return Math.round(value / multiple) * multiple;
}

/** Helper: tolerant contractor-role check (accept English + common Hindi variants) */
function isContractorRole(raw?: string | null) {
  if (!raw) return false;
  const norm = String(raw).toLowerCase().trim();
  const accepted = new Set([
    "contractor",
    "worker_contractor",
    "ठेकेदार",
    "ठेकदार",
    "ठेकेदाम",
    "thekedaar",
  ]);
  return accepted.has(norm);
}

type WorkerEntry = { user_id: string; name: string | null; rate: number | null };

type Addon = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
};

// Add after `type Addon = { ... }`
type PricingDefaultRow = {
  rate?: number | string | null;
  currency?: string | null;
  unit_hint?: string | null;
  metadata?: Record<string, unknown> | null;
};


// Strongly typed shape for job insert (avoid `any`)
type JobInsert = {
  contractor_id: string;
  title: string;
  location?: string | null;
  wage?: string | null;
  description?: string | null;
  occupation: string;
  pricing_basis: string;
  size_numeric: number;
  size_unit?: string | null;
  worker_count_estimate?: number | null;
  estimated_labor?: number | null;
  addons_total?: number | null;
  travel_charge?: number | null;
  urgent_surcharge?: number | null;
  service_fee?: number | null;
  total_cost?: number | null;
  rounded_cost?: number | null;
  extras?: {
    addons: Addon[];
    travel_km: number;
    urgent: boolean;
  } | null;
};

export default function NewJobPage() {
  // -------------------------
  // state (all declared at top-level)
  // -------------------------
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [wage, setWage] = useState(""); // will be populated from Supabase default rate (read-only for customer)
  const [description, setDescription] = useState("");
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [occupation, setOccupation] = useState<string>("");
  const [pricingBasis, setPricingBasis] = useState<string>("");
  const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);
  const [sizeNumeric, setSizeNumeric] = useState<string>("");
  const [sizeUnit, setSizeUnit] = useState<string>("");
  const [workersForOccupation, setWorkersForOccupation] = useState<WorkerEntry[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | "avg" | "">("");
  const [estimates, setEstimates] = useState<{
    count: number;
    usedRate: number | null;
    rawLabor: number | null;
    addonsTotal: number;
    travelCharge: number;
    urgentSurcharge: number;
    subtotal: number | null;
    serviceFee: number | null;
    withFee: number | null;
    rounded50: number | null;
    rounded100: number | null;
  } | null>(null);

  // Add-ons + extra requirements
  const [addons, setAddons] = useState<Addon[]>([]);
  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonQty, setNewAddonQty] = useState<string>("1");
  const [newAddonUnitPrice, setNewAddonUnitPrice] = useState<string>("0");

  // customer requirement extras
  const [travelKm, setTravelKm] = useState<string>("0"); // travel distance (optional)
  const [urgent, setUrgent] = useState(false); // urgent job surcharge

  // Role check states
  const [roleChecked, setRoleChecked] = useState(false);
  const [isContractor, setIsContractor] = useState(false);
  const [alertedOnce, setAlertedOnce] = useState(false);

  // default rate fetched from Supabase for given occupation+pricingBasis
  const [defaultRate, setDefaultRate] = useState<number | null>(null);
  const [defaultRateLoading, setDefaultRateLoading] = useState(false);
  // new — store metadata & extra fields returned from pricing_defaults
const [defaultMeta, setDefaultMeta] = useState<Record<string, unknown> | null>(null);
const [defaultCurrency, setDefaultCurrency] = useState<string | null>(null);
const [defaultUnitHint, setDefaultUnitHint] = useState<string | null>(null);


  const router = useRouter();

  // -------------------------
  // Effects (ALL declared unconditionally)
  // -------------------------

  // Fetch contractor profile & auto location (robust + tolerant role check)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // 0) DEV / local fallback: fake_user_profile in localStorage (useful if you test without real supabase auth)
        try {
          const stored = localStorage.getItem("fake_user_profile");
          if (stored) {
            const parsedRaw: unknown = JSON.parse(stored);
            console.debug("NewJobPage: using fake_user_profile", parsedRaw);

            if (parsedRaw && typeof parsedRaw === "object") {
              const parsed = parsedRaw as Record<string, unknown>;
              const roleCandidateFromFake = typeof parsed.role === "string" ? parsed.role : null;
              if (!isContractorRole(roleCandidateFromFake)) {
                if (!alertedOnce) {
                  alert("❌ सिर्फ ठेकेदार नया काम डाल सकते हैं");
                  setAlertedOnce(true);
                }
                setIsContractor(false);
                setRoleChecked(true);
                router.push("/home");
                return;
              }

              // accept fake profile as contractor (use parsed.user_id if available)
              const userId = typeof parsed.user_id === "string" ? parsed.user_id : null;
              setContractorId(userId ?? null);
              setIsContractor(true);
              setRoleChecked(true);

              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
                  },
                  () => setLocation("")
                );
              }
              return; // done — we used fake profile
            }
          }
        } catch (e) {
          console.warn("NewJobPage: failed to parse/use fake_user_profile", e);
          // continue to supabase path
        }

        // 1) Try real supabase auth user
        const { data: authData, error: authError } = await supabase.auth.getUser();
        const user = authData?.user;
        if (authError || !user) {
          if (!alertedOnce) {
            alert("❌ User ID नहीं मिली, कृपया दोबारा लॉगिन करें");
            setAlertedOnce(true);
          }
          router.push("/auth/sign-in");
          setRoleChecked(true);
          return;
        }

        // 2) Try to read role from profiles table
        const { data: dbProfile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        console.debug("NewJobPage: dbProfile/profileError", { dbProfile, profileError });

        let roleCandidate: string | null = dbProfile?.role ?? null;

        // 3) fallback: user_metadata.role (avoid `any`)
        if (!roleCandidate) {
          try {
            const meta: unknown = user?.user_metadata;
            if (meta && typeof meta === "object") {
              const metaRec = meta as Record<string, unknown>;
              const mr = metaRec["role"];
              if (typeof mr === "string") {
                roleCandidate = mr;
                console.debug("NewJobPage: role from user_metadata", mr);
              }
            }
          } catch (e) {
            // ignore
          }
        }

        // 4) last fallback: localStorage (if present and supabase user exists, use that role if needed)
        if (!roleCandidate) {
          try {
            const stored = localStorage.getItem("fake_user_profile");
            if (stored) {
              const parsedRaw: unknown = JSON.parse(stored);
              if (parsedRaw && typeof parsedRaw === "object") {
                const parsed = parsedRaw as Record<string, unknown>;
                const rc = typeof parsed.role === "string" ? parsed.role : null;
                roleCandidate = rc;
                console.debug("NewJobPage: role from fake_user_profile (fallback)", roleCandidate);
              }
            }
          } catch (e) {
            console.warn("NewJobPage: failed to parse fake_user_profile", e);
          }
        }

        console.debug("NewJobPage: roleCandidate (raw)", roleCandidate);

        // final contractor check
        if (!isContractorRole(roleCandidate)) {
          if (!alertedOnce) {
            alert("❌ सिर्फ ठेकेदार नया काम डाल सकते हैं");
            setAlertedOnce(true);
          }
          setIsContractor(false);
          setRoleChecked(true);
          router.push("/home");
          return;
        }

        // success: set contractor id from supabase user
        setContractorId(user.id);
        setIsContractor(true);
        setRoleChecked(true);

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
            },
            () => setLocation("")
          );
        }
      } catch (err) {
        console.error("NewJobPage: unexpected fetchProfile error", err);
        if (!alertedOnce) {
          alert("❌ प्रोफाइल चेक में समस्या हुई, बाद में प्रयास करें");
          setAlertedOnce(true);
        }
        setRoleChecked(true);
        router.push("/home");
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update pricing options when occupation changes
  useEffect(() => {
    const occ = OCCUPATIONS.find((o) => o.value === occupation);
    if (occ) {
      setPricingOptions(occ.pricingOptions);
    } else {
      setPricingOptions([]);
    }
    setPricingBasis("");
    setWorkersForOccupation([]);
    setSelectedWorkerId("");
    setEstimates(null);

    // when occupation changes, clear default rate
    setDefaultRate(null);
    setWage("");
  }, [occupation]);

  // fetch default/manual rate from Supabase for given occupation+pricingBasis
  useEffect(() => {
    const fetchDefaultRate = async () => {
      if (!occupation || !pricingBasis) {
        setDefaultRate(null);
        setWage("");
        return;
      }

      setDefaultRateLoading(true);
      try {
        // NOTE:
        // This expects a Supabase table named `pricing_defaults` (or change it to your actual table).
        // Table columns expected: occupation (text), pricing_basis (text), rate (numeric)
        // If your table has a different name/column, update the query accordingly.
        const { data, error } = await supabase
          .from("pricing_defaults")
          .select("rate, currency, unit_hint, metadata")
          .eq("occupation", occupation)
          .eq("pricing_basis", pricingBasis)
          .maybeSingle();


        // inside fetchDefaultRate effect, replace handling of `data`
const pricingRow = data as PricingDefaultRow | null;

if (error) {
  console.warn("Failed to fetch default rate:", error);
  setDefaultRate(null);
  setWage("");
  setDefaultMeta(null);
  setDefaultCurrency(null);
  setDefaultUnitHint(null);
} else if (pricingRow && pricingRow.rate != null) {
  const r = Number(pricingRow.rate);
  if (!isNaN(r)) {
    setDefaultRate(r);
    setWage(String(r));
    setDefaultCurrency(pricingRow.currency ?? "INR");
    setDefaultUnitHint(pricingRow.unit_hint ?? null);
    setDefaultMeta(pricingRow.metadata ?? null);
  } else {
    setDefaultRate(null);
    setWage("");
    setDefaultMeta(null);
    setDefaultCurrency(null);
    setDefaultUnitHint(null);
  }
} else {
  // no default found
  setDefaultRate(null);
  setWage("");
  setDefaultMeta(null);
  setDefaultCurrency(null);
  setDefaultUnitHint(null);
}
}
 finally {
        setDefaultRateLoading(false);
      }
    };

    fetchDefaultRate();
  }, [occupation, pricingBasis]);

  // fetch workers for the chosen occupation+pricingBasis (from profiles table)
  useEffect(() => {
    const fetchWorkers = async () => {
      if (!occupation || !pricingBasis) {
        setWorkersForOccupation([]);
        return;
      }

      try {
        // use the profiles table (as you posted in schema) to get worker rates
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, name, rate")
          .eq("occupation", occupation)
          .eq("pricing_basis", pricingBasis)
          .not("rate", "is", null);

        if (error) {
          console.error("Error fetching worker rates:", error);
          setWorkersForOccupation([]);
          return;
        }

        const rows = (data ?? []) as unknown[];
        const workers: WorkerEntry[] = rows.map((r) => {
          const row = r as Record<string, unknown>;
          const user_id = typeof row.user_id === "string" ? row.user_id : String(row.user_id ?? "");
          const name = typeof row.name === "string" ? row.name : user_id.slice(0, 6);
          let rate: number | null = null;
          if (typeof row.rate === "number") rate = row.rate as number;
          else if (typeof row.rate === "string" && !isNaN(Number(row.rate))) rate = Number(row.rate);

          return { user_id, name, rate };
        });
        setWorkersForOccupation(workers);
        setSelectedWorkerId(workers.length ? "avg" : "");
        setEstimates(null);
      } catch (e) {
        console.error("fetchWorkers unexpected", e);
        setWorkersForOccupation([]);
      }
    };

    fetchWorkers();
  }, [occupation, pricingBasis]);

  // compute estimates (labor + addons + extras)
  useEffect(() => {
    const compute = () => {
      const units = Number(sizeNumeric);
      if (!pricingBasis || !occupation || !sizeNumeric || isNaN(units) || units <= 0) {
        setEstimates(null);
        return;
      }

      // Determine rate to use:
      // Priority: manual wage (if valid) -> selected worker's exact rate -> average of available worker rates
      let usedRate: number | null = null;
      const manualRate = Number(wage);
      if (!isNaN(manualRate) && manualRate > 0) {
        usedRate = manualRate;
      } else if (selectedWorkerId && selectedWorkerId !== "avg") {
        const found = workersForOccupation.find((w) => w.user_id === selectedWorkerId);
        usedRate = found?.rate ?? null;
      } else {
        const rates = workersForOccupation
          .map((w) => (typeof w.rate === "number" ? w.rate : null))
          .filter((r) => r !== null) as number[];
        if (rates.length) {
          const sum = rates.reduce((s, x) => s + x, 0);
          usedRate = sum / rates.length;
        } else {
          usedRate = null;
        }
      }

      if (usedRate === null) {
        setEstimates({
          count: workersForOccupation.filter((w) => typeof w.rate === "number").length,
          usedRate: null,
          rawLabor: null,
          addonsTotal: 0,
          travelCharge: 0,
          urgentSurcharge: 0,
          subtotal: null,
          serviceFee: null,
          withFee: null,
          rounded50: null,
          rounded100: null,
        });
        return;
      }

      // labor
      const rawLabor = usedRate * units;

      // addons total
      const addonsTotal = addons.reduce((s, a) => s + a.qty * a.unitPrice, 0);

      // extras: travel
      const travelKmNum = Number(travelKm) || 0;
      const TRAVEL_RATE_PER_KM = 10; // ₹10 per km (adjustable)
      const travelCharge = travelKmNum > 0 ? travelKmNum * TRAVEL_RATE_PER_KM : 0;

      // urgent surcharge (as percentage of labor)
      const URGENT_SURCHARGE_PERCENT = 0.2; // 20% extra on labor if urgent
      const urgentSurcharge = urgent ? rawLabor * URGENT_SURCHARGE_PERCENT : 0;

      // subtotal before service fee
      const subtotal = rawLabor + addonsTotal + travelCharge + urgentSurcharge;

      // platform service fee (10% of subtotal)
      const serviceFee = subtotal * 0.1;

      const withFee = subtotal + serviceFee;

      const rounded50 = nearestMultiple(withFee, 50);
      const rounded100 = nearestMultiple(withFee, 100);

      setEstimates({
        count: workersForOccupation.filter((w) => typeof w.rate === "number").length,
        usedRate,
        rawLabor,
        addonsTotal,
        travelCharge,
        urgentSurcharge,
        subtotal,
        serviceFee,
        withFee,
        rounded50,
        rounded100,
      });
    };

    compute();
  }, [
    sizeNumeric,
    workersForOccupation,
    selectedWorkerId,
    pricingBasis,
    occupation,
    wage,
    addons,
    travelKm,
    urgent,
  ]);

  // -------------------------
  // Handlers
  // -------------------------
  const addNewAddon = () => {
    const qty = Number(newAddonQty) || 0;
    const price = Number(newAddonUnitPrice) || 0;
    if (!newAddonName.trim()) {
      alert("कृपया addon का नाम भरें");
      return;
    }
    if (qty <= 0 || price < 0) {
      alert("कृपया वैध मात्रा और कीमत दर्ज करें");
      return;
    }
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    setAddons((prev) => [...prev, { id, name: newAddonName.trim(), qty, unitPrice: price }]);
    setNewAddonName("");
    setNewAddonQty("1");
    setNewAddonUnitPrice("0");
  };

  const removeAddon = (id: string) => {
    setAddons((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAddon = (id: string, field: keyof Addon, value: string | number) => {
    setAddons((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              [field]:
                field === "name"
                  ? String(value)
                  : typeof value === "string"
                  ? Number(value)
                  : (value as number),
            }
          : a
      )
    );
  };

  const postJob = async () => {
    if (!contractorId) {
      alert("❌ ठेकेदार ID नहीं मिली");
      return;
    }
    if (!title.trim()) {
      alert("❌ कृपया काम का नाम भरें");
      return;
    }
    if (!occupation || !pricingBasis || !sizeNumeric) {
      alert("❌ कृपया occupation, pricing basis और size जरूर भरें");
      return;
    }
    if (!estimates || estimates.usedRate === null) {
      alert("❌ अनुमान निकालने के लिए उपयुक्त worker rates नहीं मिले");
      return;
    }

    const finalRounded = estimates.rounded50 ?? estimates.rounded100 ?? estimates.withFee ?? estimates.subtotal ?? 0;

    const insertObj: JobInsert = {
      contractor_id: contractorId,
      title: title.trim(),
      location: location.trim() || null,
      wage: wage.trim() || null,
      description: description.trim() || null,
      occupation,
      pricing_basis: pricingBasis,
      size_numeric: Number(sizeNumeric),
      size_unit: sizeUnit || null,
      worker_count_estimate: estimates.count ?? null,
      estimated_labor: estimates.rawLabor ?? null,
      addons_total: estimates.addonsTotal ?? 0,
      travel_charge: estimates.travelCharge ?? 0,
      urgent_surcharge: estimates.urgentSurcharge ?? 0,
      service_fee: estimates.serviceFee ?? null,
      total_cost: estimates.withFee ?? null,
      rounded_cost: finalRounded ?? null,
      extras: {
        addons,
        travel_km: Number(travelKm) || 0,
        urgent: urgent ? true : false,
      },
    };

    const { error } = await supabase.from("jobs").insert(insertObj);

    if (error) {
      console.error("Job insert error:", error);
      alert("❌ काम डालने में समस्या: " + (error.message ?? JSON.stringify(error)));
    } else {
      alert("✅ काम सफलतापूर्वक डाला गया");
      router.push("/home");
    }
  };

  // -------------------------
  // RENDER: conditionals after all hooks (prevents hooks-order changes)
  // -------------------------
  if (!roleChecked) {
    return (
      <div className="p-6">
        <p>लोड हो रहा है… (role verify)</p>
      </div>
    );
  }

  if (!isContractor) return null;

  return (
    <div className="p-6 flex flex-col gap-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-center">नया काम डालें</h1>

      <label className="text-lg flex items-center gap-2">
        काम का नाम लिखें
        <AudioButton text="काम का नाम लिखें" />
      </label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="उदा: दीवार पेंटिंग / टाइल बिछाने" className="border p-3 rounded text-lg" />

      <label className="text-lg flex items-center gap-2">
        Occupation / कौन चाहिए (जरूरी)
        <AudioButton text="काम चुनें" />
      </label>
      <select value={occupation} onChange={(e) => setOccupation(e.target.value)} className="border p-3 rounded text-lg">
        <option value="">-- अपना काम चुनें --</option>
        {OCCUPATIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <label className="text-lg flex items-center gap-2">
        Pricing Basis (दर का आधार) (जरूरी)
        <AudioButton text="दर का आधार चुनें" />
      </label>
      <select value={pricingBasis} onChange={(e) => setPricingBasis(e.target.value)} className="border p-3 rounded text-lg" disabled={!pricingOptions.length}>
        <option value="">-- basis चुनें --</option>
        {pricingOptions.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      <label className="text-lg flex items-center gap-2">
        Size / Quantity (जिस आधार पर काम होगा) (जरूरी)
        <AudioButton text="साइज़ दर्ज करें" />
      </label>
      <div className="flex gap-2">
        <input
          value={sizeNumeric}
          onChange={(e) => {
            const v = e.target.value;
            if (/^[0-9]*\.?[0-9]*$/.test(v) || v === "") setSizeNumeric(v);
          }}
          placeholder="उदा: 100 (sqft) या 1 (day)"
          className="border p-3 rounded text-lg flex-1"
          inputMode="decimal"
        />
        <input value={sizeUnit} onChange={(e) => setSizeUnit(e.target.value)} placeholder="इकाई (sqft / day / hour / piece / trip)" className="border p-3 rounded text-lg w-40" />
      </div>

      <label className="text-lg flex items-center gap-2">
        Specific Worker (optional) / या Manual rate (₹ per unit)
        <AudioButton text="विशेष worker चुनें" />
      </label>
      <div className="flex gap-2 items-center">
        <select value={selectedWorkerId ?? ""} onChange={(e) => setSelectedWorkerId(e.target.value as string | "avg" | "")} className="border p-3 rounded text-lg flex-1">
          <option value="">-- default: use average --</option>
          <option value="avg">Use average rate of available workers</option>
          {workersForOccupation.map((w) => (
            <option key={w.user_id} value={w.user_id}>
              {w.name} — {w.rate != null ? `${w.rate}` : "rate N/A"}
            </option>
          ))}
        </select>

        {/* wage is now read-only and populated from Supabase default table (if available).
            User cannot edit this field as requested. */}
        <div className="flex flex-col w-48">
          <input
            value={wage}
            readOnly
            disabled
            placeholder={defaultRateLoading ? "लाया जा रहा है..." : defaultRate == null ? "कोई default rate नहीं" : ""}
            className="border p-3 rounded text-lg bg-gray-100 text-gray-700 text-center"
          />
          <div className="text-xs text-gray-600 mt-1 text-center">
  {defaultRateLoading ? (
    "Default rate जांच रहे हैं..."
  ) : defaultRate != null ? (
    <>
      <div>Default: <strong>₹{Number(defaultRate).toFixed(2)}</strong> per {defaultUnitHint ?? pricingBasis}</div>
      <div className="mt-1">Currency: <strong>{defaultCurrency ?? "INR"}</strong></div>

      {/* metadata show — friendly list when available */}
      {defaultMeta ? (
  <div className="mt-2 text-left bg-white p-2 rounded text-xs shadow-sm">
    {/* common keys (example): note, min_hours, source */}
    {typeof defaultMeta["note"] === "string" && (
      <div><strong>Note:</strong> {defaultMeta["note"]}</div>
    )}
    {typeof defaultMeta["source"] === "string" && (
      <div><strong>Source:</strong> {defaultMeta["source"]}</div>
    )}
    {defaultMeta["min_hours"] != null && (
      <div><strong>Min hours:</strong> {String(defaultMeta["min_hours"])}</div>
    )}
    {typeof defaultMeta["typical_job"] === "string" && (
      <div><strong>Typical:</strong> {defaultMeta["typical_job"]}</div>
    )}

    {/* fallback: show raw metadata if none of the above keys matched */}
    {typeof defaultMeta["note"] !== "string" &&
     typeof defaultMeta["source"] !== "string" &&
     defaultMeta["min_hours"] == null &&
     typeof defaultMeta["typical_job"] !== "string" && (
      <div><strong>Info:</strong> {JSON.stringify(defaultMeta)}</div>
    )}
  </div>
) : null}

    </>
  ) : (
    "Default rate उपलब्ध नहीं — ग्राहक edit नहीं कर सकता"
  )}
</div>

        </div>
      </div>

      <label className="text-lg flex items-center gap-2">
        Customer extras: Addons / Travel / Urgent
        <AudioButton text="एक्स्ट्रा सेट करें" />
      </label>

      {/* Addons editor */}
      <div className="p-3 border rounded space-y-2">
        <div className="flex gap-2">
          <input value={newAddonName} onChange={(e) => setNewAddonName(e.target.value)} placeholder="Addon name (material, transport, etc.)" className="border p-2 rounded flex-1" />
          <input value={newAddonQty} onChange={(e) => setNewAddonQty(e.target.value)} className="border p-2 rounded w-20" inputMode="numeric" />
          <input value={newAddonUnitPrice} onChange={(e) => setNewAddonUnitPrice(e.target.value)} className="border p-2 rounded w-28" placeholder="unit ₹" inputMode="numeric" />
          <button onClick={addNewAddon} className="bg-blue-600 text-white px-3 rounded">Add</button>
        </div>

        {addons.length === 0 ? (
          <div className="text-sm text-gray-600">कोई भी addon नहीं जोड़ा गया</div>
        ) : (
          <div className="space-y-2">
            {addons.map((a) => (
              <div key={a.id} className="flex items-center gap-2">
                <input value={a.name} onChange={(e) => updateAddon(a.id, "name", e.target.value)} className="border p-2 rounded flex-1" />
                <input value={String(a.qty)} onChange={(e) => updateAddon(a.id, "qty", e.target.value)} className="border p-2 rounded w-20" inputMode="numeric" />
                <input value={String(a.unitPrice)} onChange={(e) => updateAddon(a.id, "unitPrice", e.target.value)} className="border p-2 rounded w-28" inputMode="numeric" />
                <div className="w-28 text-sm">₹{(a.qty * a.unitPrice).toFixed(0)}</div>
                <button onClick={() => removeAddon(a.id)} className="bg-red-500 text-white px-2 rounded">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Travel & Urgent */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm">Travel distance (km)</label>
          <input value={travelKm} onChange={(e) => setTravelKm(e.target.value)} className="border p-2 rounded w-28" inputMode="numeric" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Urgent (20% surcharge on labor)</label>
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
        </div>
      </div>

      <label className="text-lg flex items-center gap-2">
        काम का विवरण
        <AudioButton text="काम का विवरण लिखें" />
      </label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="थोड़ा सा विवरण लिखें" className="border p-3 rounded text-lg" rows={4} />

      {/* Estimate box */}
      <div className="p-4 border rounded bg-gray-50">
        <h3 className="font-semibold">अनुमानित लागत (Estimate)</h3>
        {!occupation || !pricingBasis ? (
          <p className="text-sm text-gray-600">ऊपर occupation और pricing basis चुनें ताकि अनुमान निकल सके।</p>
        ) : estimates === null ? (
          <p className="text-sm text-gray-600">कृपया उपयुक्त size डालें — यदि workers के rates उपलब्ध हों तो estimate दिखाई देगा।</p>
        ) : estimates.usedRate === null ? (
          <p className="text-sm text-red-600">इस occupation/basis के लिए किसी worker का rate उपलब्ध नहीं है — कोई अनुमान नहीं बन पाया।</p>
        ) : (
          <div className="mt-2 space-y-1 text-sm">
            <p>Available worker rates counted: <strong>{estimates.count}</strong></p>
            <p>Used rate: <strong>₹{Number(estimates.usedRate).toFixed(2)}</strong> per {pricingBasis}</p>
            <p>Labor (rate × size): <strong>₹{Number(estimates.rawLabor ?? 0).toFixed(2)}</strong></p>
            <p>Addons total: <strong>₹{Number(estimates.addonsTotal ?? 0).toFixed(2)}</strong></p>
            <p>Travel charge: <strong>₹{Number(estimates.travelCharge ?? 0).toFixed(2)}</strong></p>
            {urgent && <p>Urgent surcharge: <strong>₹{Number(estimates.urgentSurcharge ?? 0).toFixed(2)}</strong></p>}
            <hr />
            <p>Subtotal (before fee): <strong>₹{Number(estimates.subtotal ?? 0).toFixed(2)}</strong></p>
            <p>Service fee (10%): <strong>₹{Number(estimates.serviceFee ?? 0).toFixed(2)}</strong></p>
            <p className="text-lg">Total (with fee): <strong>₹{Number(estimates.withFee ?? 0).toFixed(2)}</strong></p>
            <p>Rounded (nearest 50): <strong>₹{Number(estimates.rounded50 ?? 0).toFixed(0)}</strong></p>
            <p>Rounded (nearest 100): <strong>₹{Number(estimates.rounded100 ?? 0).toFixed(0)}</strong></p>
            <p className="text-xs text-gray-600">Tip: Final price saved will use rounded amount by default.</p>
          </div>
        )}
      </div>

      <button onClick={postJob} className="w-full bg-green-700 text-white py-3 rounded-lg text-lg mt-4">
        काम डालें ✅
      </button>
    </div>
  );
}
