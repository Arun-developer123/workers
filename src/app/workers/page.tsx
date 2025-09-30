"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type ProfileRow = {
  user_id: string;
  role?: string | null;
  name?: string | null;
  skill?: string | null;
  wage?: string | number | null;
  location?: string | null;
  phone?: string | null;
  created_at?: string | null;
};

export default function WorkersListPage() {
  const [workers, setWorkers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, skill, wage, location, phone, created_at")
        .eq("role", "worker")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("fetchWorkers error", error);
        setWorkers([]);
        return;
      }
      setWorkers((data as ProfileRow[]) || []);
    } catch (err) {
      console.error("fetchWorkers unexpected", err);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  // wage: add 10% markup then round UP to nearest 50
  const computeDisplayedWage = (raw: string | number | null | undefined) => {
    const base = Number(raw || 0);
    if (!base || isNaN(base) || base <= 0) return "—";
    const marked = base * 1.1; // +10%
    const roundedUp50 = Math.ceil(marked / 50) * 50; // round up to next multiple of 50
    return roundedUp50;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workers सूची</h1>
        <div className="flex gap-2">
          <button onClick={() => router.back()} className="px-3 py-2 rounded-lg border">Back</button>
          <button onClick={fetchWorkers} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 border rounded-lg text-center">लोड हो रहा है...</div>
      ) : workers.length === 0 ? (
        <div className="p-6 border rounded-lg text-center">कोई worker profile नहीं मिली ❌</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workers.map((w) => {
            const displayWage = computeDisplayedWage(w.wage);
            return (
              <div key={w.user_id} className="border rounded-xl p-4 shadow bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold">{w.name ?? "नाम नहीं"}</div>
                    <div className="text-sm opacity-70">{w.skill ?? "स्किल उपलब्ध नहीं"}</div>
                    <div className="text-sm opacity-60 mt-1">स्थान: {w.location ?? "—"}</div>
                    <div className="text-xl font-bold mt-2">
                      दैनिक वेतन: {displayWage === "—" ? "—" : `₹${displayWage}`}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {w.phone && (
                      <>
                        <a href={`tel:${w.phone}`} className="px-3 py-2 rounded-lg bg-green-600 text-white">कॉल करें</a>
                        <a
                          href={`https://wa.me/${w.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-lg bg-blue-600 text-white"
                        >
                          व्हाट्सएप करें
                        </a>
                      </>
                    )}

                    <button
                      onClick={() => router.push(`/workers/${w.user_id}`)}
                      className="px-3 py-2 rounded-lg border"
                    >
                      प्रोफ़ाइल देखें
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
