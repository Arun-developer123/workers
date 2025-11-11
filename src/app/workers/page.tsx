"use client";

import React, { useEffect, useRef, useState } from "react";
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

const WorkersListPage: React.FC = () => {
  const [workers, setWorkers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const router = useRouter();
  const requestRef = useRef<number>(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    // initial / whenever debounced search changes
    fetchWorkers(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const sanitizeForOr = (s: string) => s.replace(/'/g, "''").replace(/%/g, "\\%");

  // fetchWorkers typed to return Promise<void> — keeps TS strict
  const fetchWorkers = async (term = ""): Promise<void> => {
    const currentRequest = ++requestRef.current;
    try {
      setLoading(true);

      // NOTE: do NOT pass a single generic into .from(...) — let supabase infer
      let query = supabase
        .from("profiles")
        .select("user_id, name, skill, wage, location, phone, created_at")
        .eq("role", "worker");

      if (term) {
        const clean = sanitizeForOr(term);
        const pattern = `%${clean}%`;
        // .or accepts a comma-separated list of filters
        query = query.or(
          `name.ilike.${pattern},skill.ilike.${pattern},location.ilike.${pattern}`
        );
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;

      // if a newer request was initiated, ignore this result
      if (requestRef.current !== currentRequest) return;

      if (error) {
        // eslint-disable-next-line no-console
        console.error("fetchWorkers error", error);
        setWorkers([]);
        return;
      }

      // cast data to ProfileRow[] safely
      setWorkers((data ?? []) as ProfileRow[]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("fetchWorkers unexpected", err);
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  // wage: add 10% markup then round UP to nearest 50; return string for consistent UI
  const computeDisplayedWage = (
    raw: string | number | null | undefined
  ): string => {
    const base = Number(raw ?? 0);
    if (!base || Number.isNaN(base) || base <= 0) return "—";
    const marked = base * 1.1; // +10%
    const roundedUp50 = Math.ceil(marked / 50) * 50; // round up to next multiple of 50
    return String(roundedUp50);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Workers सूची</h1>

        <div className="flex-1 max-w-lg">
          <label htmlFor="search" className="sr-only">
            Search workers
          </label>
          <div className="relative">
            <input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="नाम, स्किल या स्थान से खोजें..."
              className="w-full pl-10 pr-10 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 opacity-60"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1016.65 16.65z"
                />
              </svg>
            </div>

            {search ? (
              <button
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm opacity-80"
              >
                साफ़
              </button>
            ) : (
              <button
                onClick={() => fetchWorkers("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg border text-sm"
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.back()}
            className="px-3 py-2 rounded-lg border"
          >
            Back
          </button>
          <button
            onClick={() => fetchWorkers(debouncedSearch)}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white"
          >
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 border rounded-lg text-center">लोड हो रहा है...</div>
      ) : workers.length === 0 ? (
        <div className="p-6 border rounded-lg text-center">
          कोई worker profile नहीं मिली ❌
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workers.map((w, idx) => {
            const displayWage = computeDisplayedWage(w.wage);
            const key = w.user_id ?? `worker-${idx}`;
            return (
              <div key={key} className="border rounded-xl p-4 shadow bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold">
                      {w.name ?? "नाम नहीं"}
                    </div>
                    <div className="text-sm opacity-70">
                      {w.skill ?? "स्किल उपलब्ध नहीं"}
                    </div>
                    <div className="text-sm opacity-60 mt-1">
                      स्थान: {w.location ?? "—"}
                    </div>
                    <div className="text-xl font-bold mt-2">
                      दैनिक वेतन: {displayWage === "—" ? "—" : `₹${displayWage}`}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {w.phone ? (
                      <>
                        <a
                          href={`tel:${w.phone}`}
                          className="px-3 py-2 rounded-lg bg-green-600 text-white"
                        >
                          कॉल करें
                        </a>
                        <a
                          href={`https://wa.me/${w.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-lg bg-blue-600 text-white"
                        >
                          व्हाट्सएप करें
                        </a>
                      </>
                    ) : (
                      <div className="text-sm opacity-60">फ़ोन उपलब्ध नहीं</div>
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
};

export default WorkersListPage;
