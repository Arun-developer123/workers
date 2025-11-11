"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AudioButton from "@/components/AudioButton";
import { OCCUPATIONS, PricingOption } from "@/lib/occupations";
import { ChecklistItem, getChecklistForOccupation, addonFromChecklist } from "@/lib/checklists";

/* ---------- helper & types (kept same as your file) ---------- */
function nearestMultiple(value: number, multiple: number) {
  if (!isFinite(value) || multiple <= 0) return value;
  return Math.round(value / multiple) * multiple;
}

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

type PricingDefaultRow = {
  rate?: number | string | null;
  currency?: string | null;
  unit_hint?: string | null;
  metadata?: Record<string, unknown> | null;
};

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

/* ---------- Component ---------- */
export default function NewJobPage() {
  // states (kept your existing ones)
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [wage, setWage] = useState("");
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
    gst: number | null;
    totalWithGst: number | null;
    roundedTotal: number | null;
  } | null>(null);

  // addons / checklist / custom tasks states
  const [addons, setAddons] = useState<Addon[]>([]);
  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonQty, setNewAddonQty] = useState<string>("1");
  const [newAddonUnitPrice, setNewAddonUnitPrice] = useState<string>("0");

  // checklist specific
  const [availableChecklist, setAvailableChecklist] = useState<ChecklistItem[]>([]);
  const [selectedChecklistIds, setSelectedChecklistIds] = useState<Set<string>>(new Set());

  // customer extras
  const [travelKm, setTravelKm] = useState<string>("0");
  const [urgent, setUrgent] = useState(false);

  // role checks & defaults (same as yours)
  const [roleChecked, setRoleChecked] = useState(false);
  const [isContractor, setIsContractor] = useState(false);
  const [alertedOnce, setAlertedOnce] = useState(false);
  const [defaultRate, setDefaultRate] = useState<number | null>(null);
  const [defaultRateLoading, setDefaultRateLoading] = useState(false);
  const [defaultMeta, setDefaultMeta] = useState<Record<string, unknown> | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState<string | null>(null);
  const [defaultUnitHint, setDefaultUnitHint] = useState<string | null>(null);

  const router = useRouter();

  /* -------------------------
     Effects (unchanged business logic) 
     - profile fetch, defaultRate, workersForOccupation etc.
     - I'll keep them as-is from your original code but add small hooks to
       synchronize checklist when occupation changes.
     ------------------------- */

  useEffect(() => {
    // ... your original fetchProfile effect code ...
    // For brevity I assume you paste your original fetchProfile implementation here EXACTLY.
    // (Keep the same code you had to check contractor role and set contractorId/isContractor.)
    // This placeholder means: keep the same logic as earlier.
    const fetchProfile = async () => {
      try {
        try {
          const stored = localStorage.getItem("fake_user_profile");
          if (stored) {
            const parsedRaw: unknown = JSON.parse(stored);
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
              return;
            }
          }
        } catch (e) {
          console.warn("NewJobPage: failed to parse/use fake_user_profile", e);
        }

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

        const { data: dbProfile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        let roleCandidate: string | null = dbProfile?.role ?? null;

        if (!roleCandidate) {
          try {
            const meta: unknown = user?.user_metadata;
            if (meta && typeof meta === "object") {
              const metaRec = meta as Record<string, unknown>;
              const mr = metaRec["role"];
              if (typeof mr === "string") {
                roleCandidate = mr;
              }
            }
          } catch (e) {}
        }

        if (!roleCandidate) {
          try {
            const stored = localStorage.getItem("fake_user_profile");
            if (stored) {
              const parsedRaw: unknown = JSON.parse(stored);
              if (parsedRaw && typeof parsedRaw === "object") {
                const parsed = parsedRaw as Record<string, unknown>;
                const rc = typeof parsed.role === "string" ? parsed.role : null;
                roleCandidate = rc;
              }
            }
          } catch (e) {
            console.warn("NewJobPage: failed to parse fake_user_profile", e);
          }
        }

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

  // Update pricingOptions when occupation changes (your existing effect)
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

    // reset default rate/wage
    setDefaultRate(null);
    setWage("");

    // checklist: load available checklist items for this occupation
    const items = getChecklistForOccupation(occupation);
    setAvailableChecklist(items);

    // clear previously selected checklist items (we'll treat them as occupation-specific)
    setSelectedChecklistIds(new Set());

    // remove any addons that came from checklist (id starts with 'chk-')
    setAddons((prev) => prev.filter((a) => !a.id.startsWith("chk-")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occupation]);

  // fetch default rate (same as your original code)
  useEffect(() => {
    const fetchDefaultRate = async () => {
      if (!occupation || !pricingBasis) {
        setDefaultRate(null);
        setWage("");
        return;
      }
      setDefaultRateLoading(true);
      try {
        const { data, error } = await supabase
          .from("pricing_defaults")
          .select("rate, currency, unit_hint, metadata")
          .eq("occupation", occupation)
          .eq("pricing_basis", pricingBasis)
          .maybeSingle();

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
          setDefaultRate(null);
          setWage("");
          setDefaultMeta(null);
          setDefaultCurrency(null);
          setDefaultUnitHint(null);
        }
      } finally {
        setDefaultRateLoading(false);
      }
    };

    fetchDefaultRate();
  }, [occupation, pricingBasis]);

  // fetch workersForOccupation (same as yours)
  useEffect(() => {
    const fetchWorkers = async () => {
      if (!occupation || !pricingBasis) {
        setWorkersForOccupation([]);
        return;
      }
      try {
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

  // compute estimates (uses addons) — your logic preserved
  useEffect(() => {
    const compute = () => {
      const units = Number(sizeNumeric);
      if (!pricingBasis || !occupation || !sizeNumeric || isNaN(units) || units <= 0) {
        setEstimates(null);
        return;
      }

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
          gst: null,
          totalWithGst: null,
          roundedTotal: null,
        });
        return;
      }

      const rawLabor = usedRate * units;
      const addonsTotal = addons.reduce((s, a) => s + a.qty * a.unitPrice, 0);
      const travelKmNum = Number(travelKm) || 0;
      const TRAVEL_RATE_PER_KM = 10;
      const travelCharge = travelKmNum > 0 ? travelKmNum * TRAVEL_RATE_PER_KM : 0;
      const URGENT_SURCHARGE_PERCENT = 0.2;
      const urgentSurcharge = urgent ? rawLabor * URGENT_SURCHARGE_PERCENT : 0;
      const subtotal = rawLabor + addonsTotal + travelCharge + urgentSurcharge;
      const serviceFee = subtotal * 0.1;
      const gst = (subtotal + serviceFee) * 0.18;
      const totalWithGst = subtotal + serviceFee + gst;
      const roundedTotal = Math.round(totalWithGst);

      setEstimates({
        count: workersForOccupation.filter((w) => typeof w.rate === "number").length,
        usedRate,
        rawLabor,
        addonsTotal,
        travelCharge,
        urgentSurcharge,
        subtotal,
        serviceFee,
        gst,
        totalWithGst,
        roundedTotal,
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

  /* -------------------------
     Addon & checklist handlers
     ------------------------- */

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
    // if it's a checklist-derived id also remove from selectedChecklistIds
    if (id.startsWith("chk-")) {
      setSelectedChecklistIds((prev) => {
        const next = new Set(prev);
        next.delete(id.replace(/^chk-/, ""));
        return next;
      });
    }
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

  // checklist toggle — adds/removes corresponding addon
  const toggleChecklist = (item: ChecklistItem) => {
    const id = item.id;
    setSelectedChecklistIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // remove addon
        setAddons((prevA) => prevA.filter((a) => a.id !== `chk-${id}`));
      } else {
        next.add(id);
        // add addon from checklist item
        const chkAddon = addonFromChecklist(item);
        setAddons((prevA) => {
          // avoid duplicate if exists
          if (prevA.some((p) => p.id === chkAddon.id)) return prevA;
          return [...prevA, { id: chkAddon.id, name: chkAddon.name, qty: chkAddon.qty, unitPrice: chkAddon.unitPrice }];
        });
      }
      return next;
    });
  };

  // custom checklist-like add (user adds their own task under checklist)
  const [customTaskName, setCustomTaskName] = useState("");
  const [customTaskPrice, setCustomTaskPrice] = useState<string>("0");

  const addCustomChecklistTask = () => {
    const name = customTaskName.trim();
    const price = Number(customTaskPrice) || 0;
    if (!name) {
      alert("कृपया काम का नाम दर्ज करें");
      return;
    }
    if (price < 0) {
      alert("कृपया वैध कीमत दर्ज करें");
      return;
    }
    const id = `chk-custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const addon: Addon = { id, name, qty: 1, unitPrice: price };
    setAddons((prev) => [...prev, addon]);
    // mark as selected visually (optional) — here we do not track in selectedChecklistIds as it's custom
    setCustomTaskName("");
    setCustomTaskPrice("0");
  };

  /* -------------------------
     postJob (unchanged except addons included)
     ------------------------- */

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

    const finalRounded = estimates?.roundedTotal ?? Math.round(estimates?.totalWithGst ?? estimates?.subtotal ?? 0);

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
      total_cost: estimates.totalWithGst ?? null,
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

  /* -------------------------
     RENDER
     ------------------------- */

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

      {/* ... other inputs same as your previous UI (title, occupation, pricing, size etc.) */}
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

      {/* ... worker selection and default wage UI (same as your file) ... */}
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
              </>
            ) : (
              "Default rate उपलब्ध नहीं — ग्राहक edit नहीं कर सकता"
            )}
          </div>
        </div>
      </div>

      {/* Addons editor (kept) */}
      <label className="text-lg flex items-center gap-2">
        Customer extras: Addons / Travel / Urent
        <AudioButton text="एक्स्ट्रा सेट करें" />
      </label>

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

      {/* ====== NEW: Checklist area under 'काम का विवरण' ====== */}
      <div className="mt-2 p-3 border rounded bg-white">
        <h3 className="font-semibold">काम की सूची / सेवाएँ (चुनें)</h3>
        <p className="text-sm text-gray-600">Occupation चुने जाने पर सम्बन्धित छोटे-छोटे काम यहाँ दिखेंगे — चुनने पर वे अनुमान में जोड़ दिए जाएँगे।</p>

        {availableChecklist.length === 0 ? (
          <p className="text-sm text-gray-600 mt-2">इस occupation के लिए कोई predefined काम उपलब्ध नहीं। आप कस्टम जोड़ सकते हैं।</p>
        ) : (
          <div className="mt-2 space-y-2">
            {availableChecklist.map((item) => {
              const checked = selectedChecklistIds.has(item.id);
              const derivedAddonId = `chk-${item.id}`;
              // find editable addon if present (so user can edit qty/price)
              const derivedAddon = addons.find((a) => a.id === derivedAddonId);
              return (
                <div key={item.id} className="flex items-start gap-3 border rounded p-2">
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChecklist(item)}
                      aria-label={item.label}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{item.label}</div>
                        {item.description ? <div className="text-sm text-gray-600">{item.description}</div> : null}
                      </div>
                      <div className="text-right text-sm">
                        <div>₹{item.defaultPrice.toFixed(0)} {item.unitHint ? <span className="text-xs">/ {item.unitHint}</span> : null}</div>
                      </div>
                    </div>

                    {/* if checked, allow quantity & price adjustments inline */}
                    {checked && derivedAddon ? (
                      <div className="mt-2 flex gap-2 items-center">
                        <label className="text-xs">Qty</label>
                        <input
                          value={String(derivedAddon.qty)}
                          onChange={(e) => updateAddon(derivedAddon.id, "qty", e.target.value)}
                          className="border p-1 rounded w-20 text-sm"
                          inputMode="numeric"
                        />
                        <label className="text-xs">Unit ₹</label>
                        <input
                          value={String(derivedAddon.unitPrice)}
                          onChange={(e) => updateAddon(derivedAddon.id, "unitPrice", e.target.value)}
                          className="border p-1 rounded w-28 text-sm"
                          inputMode="numeric"
                        />
                        <div className="text-sm">→ ₹{(derivedAddon.qty * derivedAddon.unitPrice).toFixed(0)}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add custom checklist-like task */}
        <div className="mt-4 border-t pt-3">
          <div className="text-sm font-medium">नया काम जोड़ें (कस्टम)</div>
          <div className="mt-2 flex gap-2">
            <input value={customTaskName} onChange={(e) => setCustomTaskName(e.target.value)} placeholder="कस्टम काम का नाम" className="border p-2 rounded flex-1" />
            <input value={customTaskPrice} onChange={(e) => setCustomTaskPrice(e.target.value)} placeholder="₹ price" className="border p-2 rounded w-28" inputMode="numeric" />
            <button onClick={addCustomChecklistTask} className="bg-indigo-600 text-white px-3 rounded">Add</button>
          </div>
          <div className="text-xs text-gray-500 mt-2">यह कस्टम काम सीधे addons में जुड़ जाएगा और estimate पर दिखेगा।</div>
        </div>
      </div>
      {/* ====== END Checklist area ====== */}

      {/* Estimate box (your existing UI) */}
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
            <p>Service fee (10%): <strong>₹{Number(estimates.serviceFee ?? 0).toFixed(2)}</strong></p>
            <p>GST (18% on subtotal+fee): <strong>₹{Number(estimates.gst ?? 0).toFixed(2)}</strong></p>
            <p className="text-lg">Total (with GST): <strong>₹{Number(estimates.totalWithGst ?? 0).toFixed(2)}</strong></p>
            <p>Final payable (rounded to whole ₹): <strong>₹{Number(estimates.roundedTotal ?? 0).toFixed(0)}</strong></p>
            <p className="text-xs text-gray-600">Tip: Final price saved will use the rounded whole-rupee amount by default.</p>
          </div>
        )}
      </div>

      <button onClick={postJob} className="w-full bg-green-700 text-white py-3 rounded-lg text-lg mt-4">
        काम डालें ✅
      </button>
    </div>
  );
}
