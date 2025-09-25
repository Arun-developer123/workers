"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AudioButton from "@/components/AudioButton";

// --- Type Definitions ---
type Job = {
  title: string;
  location: string;
  wage: number;
  description: string;
};

type Application = {
  id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  contractor_id: string;
  job_id: string;
  jobs: Job;
  contractorPhone?: string | null;
};

type Contractor = {
  user_id: string;
  phone: string;
};

type ShiftLog = {
  id: string;
  worker_id: string;
  contractor_id: string;
  job_id: string;
  start_time: string;
  end_time?: string;
  status: "ongoing" | "completed";
};

type ActiveShifts = {
  [applicationId: string]: ShiftLog | null;
};

type RawApplicationFromSupabase = Omit<Application, "jobs"> & { jobs: Job[] };

type RatingFormState = {
  rating: number;
  review: string;
};

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<ActiveShifts>({});
  const [showRatingForm, setShowRatingForm] = useState<string | null>(null); // app.id
  const [ratingForm, setRatingForm] = useState<RatingFormState>({ rating: 5, review: "" });
  const router = useRouter();

  useEffect(() => {
    const fetchApplications = async () => {
      const storedProfile = localStorage.getItem("fake_user_profile");
      if (!storedProfile) {
        router.push("/auth/sign-in");
        return;
      }

      const profile = JSON.parse(storedProfile);

      if (profile.role !== "worker") {
        alert("❌ केवल Worker आवेदन देख सकते हैं");
        router.push("/home");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("applications")
          .select(`
            id,
            status,
            created_at,
            contractor_id,
            job_id,
            jobs(title, location, wage, description)
          `)
          .eq("worker_id", profile.user_id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const rawApplications = (data || []) as RawApplicationFromSupabase[];

        const parsedApplications: Application[] = rawApplications.map((app) => ({
          ...app,
          jobs: Array.isArray(app.jobs) ? app.jobs[0] : app.jobs,
        }));

        const contractorIds = Array.from(
          new Set(parsedApplications.map((app) => app.contractor_id))
        );

        const { data: contractorsData } = await supabase
          .from("profiles")
          .select("user_id, phone")
          .in("user_id", contractorIds);

        const contractors = (contractorsData || []) as Contractor[];

        const enrichedApps = parsedApplications.map((app) => {
          const contractor = contractors.find(
            (c) => c.user_id === app.contractor_id
          );
          return { ...app, contractorPhone: contractor?.phone || null };
        });

        setApplications(enrichedApps);
      } catch (err) {
        console.error("❌ Applications fetch error:", err);
        alert("Applications fetch में समस्या हुई");
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [router]);

  const startShift = async (app: Application) => {
    const storedProfile = JSON.parse(localStorage.getItem("fake_user_profile") || "{}");

    const { data, error } = await supabase
      .from("shift_logs")
      .insert({
        worker_id: storedProfile.user_id,
        contractor_id: app.contractor_id,
        job_id: app.job_id,
        start_time: new Date().toISOString(),
        status: "ongoing",
      })
      .select()
      .single();

    if (error) {
      alert("❌ शिफ्ट शुरू करने में समस्या");
      console.error(error);
      return;
    }

    const shiftData = data as ShiftLog;
    alert("✅ शिफ्ट शुरू हो गई");
    setActiveShift((prev) => ({ ...prev, [app.id]: shiftData }));
  };

  const endShift = async (app: Application) => {
    const shift = activeShift[app.id];
    if (!shift) {
      alert("❌ कोई ongoing शिफ्ट नहीं मिली");
      return;
    }

    const { error } = await supabase
      .from("shift_logs")
      .update({
        end_time: new Date().toISOString(),
        status: "completed",
      })
      .eq("id", shift.id);

    if (error) {
      alert("❌ शिफ्ट समाप्त करने में समस्या");
      console.error(error);
      return;
    }

    alert("✅ शिफ्ट समाप्त हो गई");
    setActiveShift((prev) => ({ ...prev, [app.id]: null }));
    setShowRatingForm(app.id); // अब rating form दिखेगा
  };

  const submitRating = async (app: Application) => {
    const storedProfile = JSON.parse(localStorage.getItem("fake_user_profile") || "{}");

    try {
      const { error } = await supabase.from("ratings").insert({
        rater_id: storedProfile.user_id,
        rated_id: app.contractor_id,
        job_id: app.job_id,
        rating: ratingForm.rating,
        review: ratingForm.review,
      });

      if (error) throw error;

      alert("✅ रेटिंग सफलतापूर्वक सबमिट हुई");
      setShowRatingForm(null);
      setRatingForm({ rating: 5, review: "" });
    } catch (err) {
      console.error("❌ Rating insert error:", err);
      alert("रेटिंग सबमिट करने में समस्या हुई");
    }
  };

  const emergencyAlert = (app: Application) => {
    alert("🚨 आपातकालीन अलर्ट भेजा गया (Contractor को सूचित करें)");
  };

  if (loading) return <p className="p-6">लोड हो रहा है...</p>;

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-center">मेरे आवेदन</h1>
      <p className="flex items-center text-lg mb-2">
        यहाँ आप अपने भेजे हुए आवेदन देख सकते हैं
        <AudioButton text="यहाँ आप अपने भेजे हुए आवेदन देख सकते हैं" />
      </p>

      {applications.length === 0 ? (
        <p className="text-lg">❌ आपने अभी तक कोई आवेदन नहीं किया है</p>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const shift = activeShift[app.id];
            const isRatingVisible = showRatingForm === app.id;

            return (
              <div
                key={app.id}
                className="border rounded-lg p-4 shadow flex flex-col gap-2"
              >
                <p className="text-lg font-bold">
                  {app.jobs?.title || "—"} ({app.jobs?.location || "—"})
                </p>
                <p>मज़दूरी: ₹{app.jobs?.wage || "—"}</p>
                <p className="text-sm text-gray-600">
                  विवरण: {app.jobs?.description || "—"}
                </p>
                <p className="font-semibold">
                  स्थिति:{" "}
                  {app.status === "pending" && "⏳ प्रतीक्षा में"}
                  {app.status === "accepted" && "✅ स्वीकृत"}
                  {app.status === "rejected" && "❌ अस्वीकृत"}
                </p>

                {app.status === "accepted" && app.contractorPhone && (
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex gap-2">
                      <a
                        href={`tel:${app.contractorPhone}`}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg text-center"
                      >
                        कॉल करें 📞
                      </a>
                      <a
                        href={`https://wa.me/${app.contractorPhone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-center"
                      >
                        चैट करें 💬
                      </a>
                    </div>

                    {!shift ? (
                      <>
                        {!isRatingVisible && (
                          <button
                            onClick={() => startShift(app)}
                            className="bg-yellow-600 text-white py-2 rounded-lg"
                          >
                            शिफ्ट शुरू करें 🟢
                          </button>
                        )}

                        {isRatingVisible && (
                          <div className="mt-2 border p-3 rounded-lg bg-gray-100">
                            <h3 className="font-semibold mb-2">कॉन्ट्रैक्टर को रेट करें ⭐</h3>
                            <select
                              value={ratingForm.rating}
                              onChange={(e) =>
                                setRatingForm((prev) => ({
                                  ...prev,
                                  rating: Number(e.target.value),
                                }))
                              }
                              className="w-full border rounded p-2 mb-2"
                            >
                              {[1, 2, 3, 4, 5].map((r) => (
                                <option key={r} value={r}>
                                  {r} स्टार
                                </option>
                              ))}
                            </select>
                            <textarea
                              value={ratingForm.review}
                              onChange={(e) =>
                                setRatingForm((prev) => ({
                                  ...prev,
                                  review: e.target.value,
                                }))
                              }
                              placeholder="रिव्यू लिखें..."
                              className="w-full border rounded p-2 mb-2"
                            />
                            <button
                              onClick={() => submitRating(app)}
                              className="bg-green-700 text-white py-2 rounded-lg w-full"
                            >
                              सबमिट करें ✅
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => emergencyAlert(app)}
                          className="bg-red-600 text-white py-2 rounded-lg"
                        >
                          आपातकाल 🚨
                        </button>
                        <button
                          onClick={() => endShift(app)}
                          className="bg-gray-800 text-white py-2 rounded-lg"
                        >
                          शिफ्ट समाप्त करें 🛑
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
