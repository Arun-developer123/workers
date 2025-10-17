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
  offered_wage?: number | null;
  contractor_wage?: number | null;
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

type ShiftOtp = {
  id: string;
  application_id: string;
  contractor_id: string;
  worker_id: string;
  job_id: string;
  otp_code: string;
  type: "start" | "end";
  expires_at: string;
  used: boolean;
};


export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<ActiveShifts>({});
  const [showRatingForm, setShowRatingForm] = useState<string | null>(null); // app.id
  const [ratingForm, setRatingForm] = useState<RatingFormState>({ rating: 5, review: "" });
  const router = useRouter();
  // --- Helper: coerce unknown -> number | null ---
const toNumberOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};


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
  offered_wage,
  contractor_wage,
  jobs(title, location, wage, description)
`)

          .eq("worker_id", profile.user_id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const rawApplications = (data || []) as RawApplicationFromSupabase[];

        const parsedApplications: Application[] = rawApplications.map((app) => {
  // jobs might come back as array from Supabase (jobs(title, ...)) — pick first if array
  const jobsSingle: Job =
    Array.isArray((app as unknown as { jobs: unknown }).jobs)
      ? ((app as unknown as { jobs: Job[] }).jobs[0] ?? {
          title: "",
          location: "",
          wage: 0,
          description: "",
        })
      : ((app as unknown as { jobs: Job }).jobs as Job);

  return {
    ...app,
    jobs: jobsSingle,
    // coerce to number|null safely instead of casting to any
    offered_wage: toNumberOrNull((app as unknown as { offered_wage?: unknown }).offered_wage),
    contractor_wage: toNumberOrNull((app as unknown as { contractor_wage?: unknown }).contractor_wage),
  } as Application;
});



        const contractorIds = Array.from(
          new Set(parsedApplications.map((app) => app.contractor_id))
        );

        const { data: contractorsData } = await supabase
          .from("profiles")
          .select("user_id, phone")
          .in("user_id", contractorIds);

        const contractors = (contractorsData || []) as Contractor[];

        const enrichedApps = parsedApplications.map((app) => {
          const contractor = contractors.find((c) => c.user_id === app.contractor_id);
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

  // Helper: generate 6-digit OTP
  const generateOtpCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Create OTP record in DB (shift_otps) for contractor to see on their dashboard.
  const createOtpRecord = async (payload: {
    application_id: string;
    contractor_id: string;
    worker_id: string;
    job_id: string;
    type: "start" | "end";
  }) => {
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 5).toISOString(); // 5 minutes
    const { data, error } = await supabase
      .from("shift_otps")
      .insert({
        application_id: payload.application_id,
        contractor_id: payload.contractor_id,
        worker_id: payload.worker_id,
        job_id: payload.job_id,
        otp_code: code,
        type: payload.type,
        expires_at: expiresAt,
        used: false,
      })
      .select()
      .single();

    if (error) {
      console.error("createOtpRecord error", error);
      return null;
    }
    return data;
  };

  // Validate OTP for a given application and type
  const validateOtp = async (applicationId: string, code: string, type: "start" | "end") => {
    try {
      const { data, error } = await supabase
        .from("shift_otps")
        .select("*")
        .eq("application_id", applicationId)
        .eq("otp_code", code)
        .eq("type", type)
        .eq("used", false)
        .limit(1)
        .single();

      if (error || !data) {
        return { valid: false, row: null };
      }

      const otpRow = data as ShiftOtp;
      if (otpRow.expires_at && new Date(otpRow.expires_at) < new Date()) {
        return { valid: false, row: otpRow };
      }
      return { valid: true, row: otpRow };
    } catch (err) {
      console.error("validateOtp error", err);
      return { valid: false, row: null };
    }
  };

  // Mark OTP used
  const markOtpUsed = async (otpId: string) => {
    try {
      const { error } = await supabase.from("shift_otps").update({ used: true }).eq("id", otpId);
      if (error) console.error("markOtpUsed error", error);
    } catch (err) {
      console.error("markOtpUsed unexpected", err);
    }
  };

  // START SHIFT flow with OTP + contractor wallet deduction (worker prompted for OTP)
  const startShift = async (app: Application) => {
    const storedProfile = JSON.parse(localStorage.getItem("fake_user_profile") || "{}");
    const workerId = storedProfile.user_id;

    // create OTP record (contractor will see it on their dashboard)
    const otp = await createOtpRecord({
      application_id: app.id,
      contractor_id: app.contractor_id,
      worker_id: workerId,
      job_id: app.job_id,
      type: "start",
    });

    if (!otp) {
      alert("❌ शिफ्ट शुरू करने के लिए OTP बनाते समय समस्या हुई");
      return;
    }

    alert(
      "🔐 OTP contractor के dashboard पर भेज दिया गया है — contractor से OTP लें और उसे दर्ज करें। (OTP 5 मिनट में समाप्त हो जाएगा)"
    );

    // Prompt worker to enter OTP provided by contractor
    const entered = prompt("कृपया contractor द्वारा दिया गया START OTP दर्ज करें:");
    if (!entered) {
      alert("❌ OTP दर्ज नहीं किया गया");
      return;
    }

    const { valid, row } = await validateOtp(app.id, entered.trim(), "start");
    if (!valid || !row) {
      alert("❌ OTP गलत या expired है");
      return;
    }

    // Fetch wage (prefer job object)
    const wageNum = Number(app.jobs?.wage || 0);
    if (isNaN(wageNum) || wageNum <= 0) {
      alert("❌ इस जॉब का valid wage नहीं मिला");
      return;
    }

    // Ensure contractor has sufficient balance, then deduct
    try {
      const { data: walletRow, error: walletErr } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", app.contractor_id)
        .single();

      if (walletErr || !walletRow) {
        console.error("wallet fetch error", walletErr);
        alert("❌ Contractor का वॉलेट नहीं मिला");
        return;
      }

      const contractorBalance = Number(walletRow.balance || 0);
      if (contractorBalance < wageNum) {
        alert("❌ Contractor के पास पर्याप्त बैलेंस नहीं है — पहले contractor वॉलेट रिचार्ज करें");
        return;
      }

      // Deduct contractor balance
      const newContractorBalance = contractorBalance - wageNum;
      const { error: deductErr } = await supabase
        .from("wallets")
        .update({ balance: newContractorBalance })
        .eq("user_id", app.contractor_id);

      if (deductErr) {
        console.error("deduct error", deductErr);
        alert("❌ Contractor के वॉलेट से राशि घटाने में समस्या");
        return;
      }

      // Mark OTP used
      await markOtpUsed(row.id);

      // Create shift_log (ongoing)
      const { data: shiftData, error: shiftErr } = await supabase
        .from("shift_logs")
        .insert({
          worker_id: workerId,
          contractor_id: app.contractor_id,
          job_id: app.job_id,
          start_time: new Date().toISOString(),
          status: "ongoing",
        })
        .select()
        .single();

      if (shiftErr) {
        console.error("shift insert error", shiftErr);
        // rollback contractor deduction (best-effort)
        await supabase.from("wallets").update({ balance: contractorBalance }).eq("user_id", app.contractor_id);
        alert("❌ शिफ्ट शुरू करने में समस्या — रिवर्ट हो रहा है");
        return;
      }

      const shift: ShiftLog = shiftData as ShiftLog;
      alert("✅ शिफ्ट सफलतापूर्वक शुरू हो गई — Contractor के वॉलेट से राशि कट चुकी है (Worker को तब तक क्रेडिट नहीं मिली)");

      setActiveShift((prev) => ({ ...prev, [app.id]: shift }));
    } catch (err) {
      console.error("startShift unexpected", err);
      alert("❌ शिफ्ट शुरू करने में समस्या");
    }
  };

  // END SHIFT flow with OTP + credit worker wallet only after OTP validated
  const endShift = async (app: Application) => {
    const shift = activeShift[app.id];
    if (!shift) {
      alert("❌ कोई ongoing शिफ्ट नहीं मिली");
      return;
    }

    // create OTP for end
    const storedProfile = JSON.parse(localStorage.getItem("fake_user_profile") || "{}");
    const workerId = storedProfile.user_id;

    const otp = await createOtpRecord({
      application_id: app.id,
      contractor_id: app.contractor_id,
      worker_id: workerId,
      job_id: app.job_id,
      type: "end",
    });

    if (!otp) {
      alert("❌ End OTP बनाते समय समस्या हुई");
      return;
    }

    alert(
      "🔐 End OTP contractor के dashboard पर भेज दिया गया है — contractor से OTP लें और उसे दर्ज करें। (OTP 5 मिनट में समाप्त हो जाएगा)"
    );

    const entered = prompt("कृपया contractor द्वारा दिया गया END OTP दर्ज करें:");
    if (!entered) {
      alert("❌ OTP दर्ज नहीं किया गया");
      return;
    }

    const { valid, row } = await validateOtp(app.id, entered.trim(), "end");
    if (!valid || !row) {
      alert("❌ OTP गलत या expired है");
      return;
    }

    try {
      // Mark OTP used
      await markOtpUsed(row.id);

      // Update shift_logs: set end_time + status completed (use shift.id)
      const { error: endErr } = await supabase
        .from("shift_logs")
        .update({
          end_time: new Date().toISOString(),
          status: "completed",
        })
        .eq("id", shift.id);

      if (endErr) {
        console.error("end shift update error", endErr);
        alert("❌ शिफ्ट समाप्त करने में समस्या");
        return;
      }

      // Credit worker wallet via RPC increment_wallet (same as contractor flow)
      const wageNum = Number(app.jobs?.wage || 0);
      if (isNaN(wageNum) || wageNum <= 0) {
        alert("❌ इस जॉब का valid wage नहीं मिला");
        return;
      }

      const { error: incErr } = await supabase.rpc("increment_wallet", {
        worker_id: workerId,
        amount: wageNum,
      });

      if (incErr) {
        console.error("increment_wallet error", incErr);
        alert("❌ Worker को भुगतान करने में समस्या हुई — कृपया support से संपर्क करें");
        return;
      }

      alert("✅ शिफ्ट समाप्त मानी गई और Worker के वॉलेट में राशि क्रेडिट कर दी गई");
      setActiveShift((prev) => ({ ...prev, [app.id]: null }));
      setShowRatingForm(app.id); // अब rating form दिखेगा
    } catch (err) {
      console.error("endShift unexpected", err);
      alert("❌ शिफ्ट समाप्त करने में समस्या");
    }
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
                {/* compute display wage: prefer application.offered_wage, then job.wage */}
{(() => {
  const offeredNum = toNumberOrNull(app.offered_wage);
  const jobWageNum = toNumberOrNull(app.jobs?.wage);
  const useVal = offeredNum ?? jobWageNum;

  return (
    <p>
      मज़दूरी:{" "}
      {useVal != null ? `₹${Math.round(useVal)}` : "—"}
    </p>
  );
})()}


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
