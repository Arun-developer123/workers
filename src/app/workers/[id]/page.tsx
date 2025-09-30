"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type WorkerProfile = {
  user_id: string;
  name?: string | null;
  skill?: string | null;
  wage?: number | null;
  location?: string | null;
  phone?: string | null;
};

type RatingRow = {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  rater_id: string | null;
};

export default function WorkerProfilePage() {
  const params = useParams();
  const workerId = params?.id as string;

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workerId) fetchWorkerData(workerId);
  }, [workerId]);

  const fetchWorkerData = async (uid: string) => {
    try {
      setLoading(true);

      // profile fetch
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, name, skill, wage, location, phone")
        .eq("user_id", uid)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // ratings fetch
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select("id, rating, review, created_at, rater_id")
        .eq("rated_id", uid)
        .order("created_at", { ascending: false });

      if (ratingsError) throw ratingsError;
      setRatings(ratingsData || []);
    } catch (err) {
      console.error("fetchWorkerData error", err);
    } finally {
      setLoading(false);
    }
  };

  // wage compute logic (10% markup + round up to nearest 50)
  const computeDisplayedWage = (raw: number | null | undefined) => {
    const base = Number(raw || 0);
    if (!base || isNaN(base) || base <= 0) return null;
    const marked = base * 1.1; // +10%
    return Math.ceil(marked / 50) * 50; // round up
  };

  const averageRating =
    ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length).toFixed(1)
      : null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {loading ? (
        <div className="p-6 border rounded-lg text-center">लोड हो रहा है...</div>
      ) : !profile ? (
        <div className="p-6 border rounded-lg text-center">प्रोफ़ाइल नहीं मिली ❌</div>
      ) : (
        <>
          <div className="border rounded-xl p-6 shadow bg-white mb-6">
            <h1 className="text-2xl font-bold">{profile.name ?? "नाम नहीं"}</h1>
            <p className="mt-1 text-sm opacity-70">{profile.skill ?? "स्किल उपलब्ध नहीं"}</p>
            <p className="mt-1">स्थान: {profile.location ?? "—"}</p>

            <p className="mt-1 ">
              दैनिक वेतन:{" "}
              {computeDisplayedWage(profile.wage)
                ? `₹${computeDisplayedWage(profile.wage)}`
                : "—"}
            </p>

            {profile.phone && <p className="mt-1">फ़ोन: {profile.phone}</p>}

            {averageRating && (
              <p className="mt-2 text-lg font-semibold">
                ⭐ औसत रेटिंग: {averageRating}/5 ({ratings.length} reviews)
              </p>
            )}

            {/* Badges logic */}
            <div className="mt-3 flex gap-2 flex-wrap">
              {ratings.length >= 20 && (
                <span className="px-2 py-1 rounded bg-yellow-200">Experienced</span>
              )}
              {averageRating && Number(averageRating) >= 4.5 && (
                <span className="px-2 py-1 rounded bg-green-200">Top Rated</span>
              )}
              {ratings.length === 0 && (
                <span className="px-2 py-1 rounded bg-gray-200">New Worker</span>
              )}
            </div>
          </div>

          <div className="border rounded-xl p-6 shadow bg-white">
            <h2 className="text-xl font-bold mb-3">Reviews</h2>
            {ratings.length === 0 ? (
              <p className="opacity-70">अभी तक कोई review नहीं दिया गया</p>
            ) : (
              <ul className="space-y-3">
                {ratings.map((r) => (
                  <li key={r.id} className="border p-3 rounded">
                    <p>⭐ {r.rating}/5</p>
                    {r.review && <p className="mt-1">{r.review}</p>}
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
