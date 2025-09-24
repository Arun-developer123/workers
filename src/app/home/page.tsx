"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AudioButton from "@/components/AudioButton";

// ==== Types ====
interface Profile {
  user_id: string;
  name: string;
  role: "worker" | "contractor";
  phone?: string;
}

interface Job {
  id: string;
  title: string;
  location: string;
  wage: number | string;
  contractor_id: string;
  created_at?: string;
}

interface Application {
  id: string;
  worker_id: string;
  contractor_id: string;
  job_id: string;
  status: "pending" | "accepted" | "rejected";
  jobs?: Job[]; // ✅ FIX: array instead of object
  shiftstatus?: string | null;
}

interface ShiftLog {
  worker_id: string;
  contractor_id: string;
  job_id: string;
  status: string;
  start_time?: string;
  end_time?: string;
}

interface WorkerProfile {
  user_id: string;
  phone: string;
}

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [workersMap, setWorkersMap] = useState<{ [key: string]: string }>({});
  const [wallet, setWallet] = useState<number>(0);
  const [ratingsGiven, setRatingsGiven] = useState<{ [key: string]: boolean }>({});
  const [myRating, setMyRating] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedProfile = localStorage.getItem("fake_user_profile");
    if (!storedProfile) {
      router.push("/auth/sign-in");
      return;
    }
    const parsedProfile: Profile = JSON.parse(storedProfile);
    setProfile(parsedProfile);

    if (parsedProfile.role === "worker") {
      fetchJobs();
      fetchWallet(parsedProfile.user_id);
      fetchMyRating(parsedProfile.user_id);
    } else if (parsedProfile.role === "contractor") {
      fetchContractorData(parsedProfile.user_id);
      // optional: fetch contractor wallet so quick-stats show real value for contractor
      fetchWallet(parsedProfile.user_id);
    }
  }, []);

  // Worker → Available Jobs
  const fetchJobs = async () => {
    const { data } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    setJobs((data as Job[]) || []);
  };

  // Contractor → Applications + join shift_logs
  const fetchContractorData = async (userId: string) => {
    const { data: apps } = await supabase
      .from("applications")
      .select("id, worker_id, contractor_id, job_id, status, jobs(title, location, wage, contractor_id)")
      .eq("contractor_id", userId)
      .order("created_at", { ascending: false });

    if (!apps) {
      setApplications([]);
      return;
    }

    const applicationsData = apps as Application[];

    // Worker phones
    const workerIds = Array.from(new Set(applicationsData.map((a) => a.worker_id)));
    const { data: workersData } = await supabase
      .from("profiles")
      .select("user_id, phone")
      .in("user_id", workerIds);

    const map: { [key: string]: string } = {};
    ((workersData as WorkerProfile[]) || []).forEach((w) => {
      map[w.user_id] = w.phone;
    });
    setWorkersMap(map);

    // Fetch shift_logs
    const { data: shifts } = await supabase
      .from("shift_logs")
      .select("worker_id, contractor_id, job_id, status")
      .in("job_id", applicationsData.map((a) => a.job_id));

    const merged = applicationsData.map((a) => {
      const shift = (shifts as ShiftLog[] | null)?.find(
        (s) => s.worker_id === a.worker_id && s.contractor_id === a.contractor_id && s.job_id === a.job_id
      );
      return { ...a, shiftstatus: shift?.status || null };
    });

    setApplications(merged);
  };

  // Worker → Apply Job
  const applyJob = async (jobId: string) => {
    const contractorId = jobs.find((j) => j.id === jobId)?.contractor_id;
    const { error } = await supabase.from("applications").insert({
      worker_id: profile?.user_id,
      contractor_id: contractorId,
      job_id: jobId,
      status: "pending",
    });

    if (error) alert("आवेदन करने में समस्या ❌");
    else alert("✅ आवेदन भेज दिया गया");
  };

  // Contractor → Accept/Reject
  const updateApplication = async (appId: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("applications").update({ status }).eq("id", appId);

    if (error) alert("❌ समस्या हुई");
    else {
      alert(`✅ आवेदन ${status === "accepted" ? "स्वीकृत" : "अस्वीकृत"}`);
      setApplications(applications.map((a) => (a.id === appId ? { ...a, status } : a)));
    }
  };

  // Worker → Start Shift
  const startShift = async (app: Application) => {
    const { error } = await supabase.from("shift_logs").insert({
      worker_id: app.worker_id,
      contractor_id: app.contractor_id,
      job_id: app.job_id,
      start_time: new Date().toISOString(),
      status: "ongoing",
    });
    if (error) {
      alert("❌ शिफ्ट शुरू नहीं हो सकी");
      return;
    }
    alert("✅ शिफ्ट शुरू हो गई");
    fetchContractorData(app.contractor_id);
  };

  // Worker → End Shift
  const endShift = async (app: Application) => {
    const { error } = await supabase
      .from("shift_logs")
      .update({
        end_time: new Date().toISOString(),
        status: "completed",
      })
      .eq("worker_id", app.worker_id)
      .eq("job_id", app.job_id)
      .eq("status", "ongoing");

    if (error) {
      alert("❌ शिफ्ट समाप्त करने में समस्या");
      return;
    }
    alert("✅ शिफ्ट समाप्त हो गई, Contractor से भुगतान की प्रतीक्षा करें");
    fetchContractorData(app.contractor_id);
  };

  // Contractor → Pay Worker (UPDATED: fetch wage from jobs table; deduct contractor wallet; credit worker)
  const payWorker = async (app: Application) => {
    try {
      // 1) Fetch wage (from jobs table)
      const { data: jobRow, error: jobErr } = await supabase
        .from("jobs")
        .select("wage, contractor_id")
        .eq("id", app.job_id)
        .single();

      if (jobErr || !jobRow) {
        console.error("job fetch error", jobErr);
        alert("❌ जॉब की जानकारी प्राप्त करने में समस्या");
        return;
      }

      // wage may be stored as text — parse to number
      const wageNum = Number(jobRow.wage);
      if (isNaN(wageNum) || wageNum <= 0) {
        alert("❌ इस जॉब का valid wage नहीं मिला");
        return;
      }

      // Determine payer (contractor). Use jobRow.contractor_id fallback to app.contractor_id
      const contractorId = jobRow.contractor_id || app.contractor_id;
      if (!contractorId) {
        alert("❌ Contractor ID नहीं मिली");
        return;
      }

      // 2) Fetch contractor wallet balance
      const { data: contractorWalletRow, error: walletErr } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", contractorId)
        .single();

      if (walletErr || !contractorWalletRow) {
        console.error("wallet fetch error", walletErr);
        alert("❌ Contractor का वॉलेट नहीं मिला");
        return;
      }

      const contractorBalance = Number(contractorWalletRow.balance || 0);
      if (contractorBalance < wageNum) {
        alert("❌ पर्याप्त बैलेंस नहीं है — पहले वॉलेट रिचार्ज करें");
        return;
      }

      // 3) Deduct contractor balance (client-side update)
      const newContractorBalance = contractorBalance - wageNum;
      const { error: deductErr } = await supabase
        .from("wallets")
        .update({ balance: newContractorBalance })
        .eq("user_id", contractorId);

      if (deductErr) {
        console.error("deduct error", deductErr);
        alert("❌ Contractor के वॉलेट से राशि घटाने में समस्या");
        return;
      }

      // 4) Credit worker using existing RPC increment_wallet
      const { error: incErr } = await supabase.rpc("increment_wallet", {
        worker_id: app.worker_id,
        amount: wageNum,
      });

      if (incErr) {
        console.error("increment_worker error", incErr);
        // rollback contractor deduction (best-effort)
        await supabase.from("wallets").update({ balance: contractorBalance }).eq("user_id", contractorId);
        alert("❌ Worker को भुगतान करने में समस्या — ट्रांज़ैक्शन रिवर्ट की जा रही है");
        return;
      }

      // Success
      alert(`✅ Worker को ₹${wageNum} का भुगतान कर दिया गया`);

      // Refresh wallets in UI: update worker's wallet and contractor's if logged-in user is contractor
      fetchWallet(app.worker_id);
      if (profile?.user_id === contractorId) {
        setWallet(newContractorBalance);
      }

      // Optionally refresh contractor data (applications, shifts)
      fetchContractorData(contractorId);
    } catch (err) {
      console.error("payWorker unexpected error", err);
      alert("❌ भुगतान में समस्या");
    }
  };

  // Contractor → Rate Worker
  const rateWorker = async (app: Application) => {
    const rating = prompt("⭐ Worker को रेट करें (1-5):");
    const review = prompt("✍ Review लिखें (optional):");
    if (!rating) return;

    const { error } = await supabase.from("ratings").insert({
      rater_id: profile?.user_id,
      rated_id: app.worker_id,
      job_id: app.job_id,
      rating: Number(rating),
      review: review || "",
    });

    if (error) alert("❌ Rating save नहीं हुई");
    else {
      alert("✅ Rating save हो गई");
      setRatingsGiven({ ...ratingsGiven, [app.id]: true });
    }
  };

  // Worker → Withdraw Salary
  const withdrawSalary = async () => {
    if (wallet <= 0) {
      alert("❌ वॉलेट खाली है");
      return;
    }
    const { error } = await supabase.rpc("withdraw_wallet", { worker_id: profile?.user_id });
    if (error) {
      alert("❌ सैलरी निकालने में समस्या");
      return;
    }
    alert("✅ सैलरी निकाल ली गई");
    setWallet(0);
  };

  const fetchWallet = async (userId: string) => {
    const { data } = await supabase.from("wallets").select("balance").eq("user_id", userId).single();
    setWallet((data?.balance as number) || 0);
  };

  const fetchMyRating = async (userId: string) => {
    const { data } = await supabase.from("ratings").select("rating").eq("rated_id", userId);
    if (!data || data.length === 0) {
      setMyRating(null);
      return;
    }
    const avg = (data as { rating: number }[]).reduce((sum, r) => sum + r.rating, 0) / data.length;
    setMyRating(Number(avg.toFixed(1)));
  };

  if (!profile) return <p className="p-6">लोड हो रहा है...</p>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-indigo-600 via-pink-600 to-amber-400 text-white shadow-lg mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">स्वागत है, {profile.name} 👋</h1>
            <p className="mt-1 opacity-90">आइए आज का काम शानदार तरीके से करें — तेज़ और सुरक्षित</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs opacity-90">Role</div>
              <div className="font-bold text-lg">{profile.role.toUpperCase()}</div>
            </div>
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center font-semibold">{profile.name[0]}</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-80">वॉलेट बैलेंस</div>
              <div className="text-2xl font-bold">₹{wallet}</div>
            </div>
            <div>
              <AudioButton text="वॉलेट देखें" />
            </div>
          </div>
          <div className="mt-3 text-sm opacity-70">सुरक्षित और तुरन्त निकासी विकल्प</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-80">मेरी रेटिंग</div>
              <div className="text-2xl font-bold">{myRating ? myRating : "—"} {myRating && <span className="text-sm opacity-70">/5</span>}</div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-80">सभी जॉब्स</div>
              <div className="font-semibold">{jobs.length}</div>
            </div>
          </div>
          <div className="mt-3 text-sm opacity-70">सकारात्मक रेटिंग से काम मिलने की संभावना बढ़ती है</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow flex flex-col justify-between hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-80">त्वरित कार्य</div>
              <div className="text-2xl font-bold">तेज़ आवेदन</div>
            </div>
            <div>
              <button onClick={() => router.push("/jobs/new")} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-2 rounded-lg font-semibold">
                नया काम डालें
              </button>
            </div>
          </div>
          <div className="mt-3 text-sm opacity-70">कॉन्ट्रैक्टर तुरंत जॉब पोस्ट कर सकते हैं</div>
        </div>
      </div>

      {/* Worker Dashboard */}
      {profile.role === "worker" && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">Worker Dashboard <AudioButton text="वर्कर डैशबोर्ड देखें" /></h2>
            <div className="flex gap-2">
              {wallet > 0 && (
                <button onClick={withdrawSalary} className="bg-purple-600 text-white py-2 px-4 rounded-lg shadow-md">सैलरी निकालें 💸</button>
              )}
              <button onClick={() => router.push("/applications")} className="bg-blue-50 border border-blue-200 text-blue-700 py-2 px-3 rounded-lg">मेरे आवेदन 📄</button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white/80 to-white/60 rounded-xl p-4 shadow">
            <p className="mb-2">💰 वॉलेट: <span className="font-bold">₹{wallet}</span></p>
            <p className="mb-4">⭐ रेटिंग: <span className="font-bold">{myRating ? myRating : "अभी कोई रेटिंग नहीं"}</span></p>

            <h3 className="text-lg font-semibold mb-3">उपलब्ध काम</h3>
            {jobs.length === 0 ? (
              <div className="p-6 border border-dashed rounded-lg text-center opacity-80">अभी कोई काम उपलब्ध नहीं है ❌</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map((job) => (
                  <div key={job.id} className="border rounded-xl p-4 shadow hover:shadow-lg transition-shadow bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-bold">{job.title}</div>
                        <div className="text-sm opacity-80 mt-1">स्थान: {job.location}</div>
                        <div className="text-sm opacity-70 mt-2">₹{job.wage} भुगतान</div>
                        <div className="text-xs opacity-60 mt-1">Posted: {job.created_at ? new Date(job.created_at).toLocaleString() : "—"}</div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <button onClick={() => applyJob(job.id)} className="bg-gradient-to-r from-green-500 to-lime-500 text-white py-2 px-4 rounded-lg font-semibold">आवेदन करें ✅</button>
                        <button onClick={() => router.push("/jobs/" + job.id)} className="text-sm underline opacity-80">डिटेल देखें</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contractor Dashboard */}
      {profile.role === "contractor" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">Contractor Dashboard <AudioButton text="कॉन्ट्रैक्टर डैशबोर्ड देखें" /></h2>
            <div className="flex gap-2">
              <button onClick={() => router.push("/jobs/new")} className="bg-green-700 text-white py-2 px-3 rounded-lg">नया काम डालें ➕</button>
            </div>
          </div>

          {applications.length === 0 ? (
            <div className="p-6 border rounded-xl text-center opacity-80">अभी कोई आवेदन नहीं आया ❌</div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => {
                const workerPhone = workersMap[app.worker_id] || null;
                return (
                  <div key={app.id} className="border rounded-xl p-4 shadow-md bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-bold">{app.jobs?.[0]?.title} <span className="text-sm opacity-70">({app.jobs?.[0]?.location})</span></div>
                        <div className="text-sm opacity-70 mt-1">स्थिति: <span className={`font-semibold ${app.status === 'pending' ? 'text-yellow-600' : app.status === 'accepted' ? 'text-green-600' : 'text-red-600'}`}>{app.status}</span></div>
                        <div className="text-sm opacity-60 mt-1">शिफ्ट: <span className="font-medium">{app.shiftstatus || '—'}</span></div>
                      </div>

                      <div className="flex flex-col gap-2 items-end">
                        {/* Actions */}
                        {app.status === "pending" && (
                          <div className="flex gap-2">
                            <button onClick={() => updateApplication(app.id, "accepted")} className="bg-blue-600 text-white py-2 px-3 rounded-lg">स्वीकारें</button>
                            <button onClick={() => updateApplication(app.id, "rejected")} className="bg-red-600 text-white py-2 px-3 rounded-lg">अस्वीकारें</button>
                          </div>
                        )}

                        {app.status === "accepted" && workerPhone && (
                          <div className="flex gap-2">
                            <a href={`tel:${workerPhone}`} className="px-3 py-2 rounded-lg bg-green-600 text-white">कॉल करें</a>
                            <a href={`https://wa.me/${workerPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-blue-600 text-white">व्हाट्सएप</a>
                          </div>
                        )}

                        {app.shiftstatus === "completed" && (
                          <div className="flex flex-col gap-2 w-full">
                            <button onClick={() => payWorker(app)} className="bg-purple-600 text-white py-2 px-3 rounded-lg w-full">भुगतान करें ₹{app.jobs?.[0]?.wage}</button>
                            {!ratingsGiven[app.id] && (
                              <button onClick={() => rateWorker(app)} className="bg-orange-500 text-white py-2 px-3 rounded-lg w-full">Rate Worker ⭐</button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
