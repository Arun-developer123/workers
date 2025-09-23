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
  wage: number;
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

  // Contractor → Pay Worker
  const payWorker = async (app: Application) => {
    const wage = Number(app.jobs?.[0]?.wage || 0); // ✅ FIX
    if (!wage) {
      alert("❌ Wage सेट नहीं है");
      return;
    }
    const { error } = await supabase.rpc("increment_wallet", { worker_id: app.worker_id, amount: wage });
    if (error) {
      alert("❌ भुगतान में समस्या");
      return;
    }
    alert(`✅ Worker को ₹${wage} का भुगतान कर दिया गया`);
    fetchWallet(app.worker_id);
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">स्वागत है, {profile.name} 👋</h1>

      {/* Worker Dashboard */}
      {profile.role === "worker" && (
        <div>
          <h2 className="text-xl font-semibold mb-2 flex items-center">
            Worker Dashboard
            <AudioButton text="वर्कर डैशबोर्ड देखें" />
          </h2>

          <p className="mb-2">💰 वॉलेट बैलेंस: ₹{wallet}</p>
          <p className="mb-4">⭐ मेरी रेटिंग: {myRating ? myRating : "अभी कोई रेटिंग नहीं"}</p>

          {wallet > 0 && (
            <button onClick={withdrawSalary} className="bg-purple-600 text-white py-2 px-4 rounded-lg mb-6">
              सैलरी निकालें 💸
            </button>
          )}

          <h3 className="text-lg font-semibold mb-2">उपलब्ध काम</h3>
          {jobs.length === 0 ? (
            <p>अभी कोई काम उपलब्ध नहीं है ❌</p>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-4 shadow flex flex-col gap-2">
                  <p className="text-lg font-bold">{job.title}</p>
                  <p>स्थान: {job.location}</p>
                  <button onClick={() => applyJob(job.id)} className="bg-green-600 text-white py-2 rounded-lg">
                    आवेदन करें ✅
                  </button>
                  <button
                    onClick={() => router.push("/applications")}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg mt-6"
                  >
                    मेरे आवेदन देखें 📄
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contractor Dashboard */}
      {profile.role === "contractor" && (
        <div>
          <h2 className="text-xl font-semibold mb-2 flex items-center">
            Contractor Dashboard
            <AudioButton text="कॉन्ट्रैक्टर डैशबोर्ड देखें" />
          </h2>
          {applications.length === 0 ? (
            <p>अभी कोई आवेदन नहीं आया ❌</p>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => {
                const workerPhone = workersMap[app.worker_id] || null;
                return (
                  <div key={app.id} className="border rounded-lg p-4 shadow flex flex-col gap-2">
                    <p className="text-lg font-bold">
                      {app.jobs?.[0]?.title} ({app.jobs?.[0]?.location})
                    </p>
                    <p>स्थिति: {app.status}</p>
                    <p>शिफ्ट स्थिति: {app.shiftstatus || "—"}</p>

                    {/* Accept/Reject */}
                    {app.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateApplication(app.id, "accepted")}
                          className="flex-1 bg-blue-600 text-white py-2 rounded-lg"
                        >
                          स्वीकारें
                        </button>
                        <button
                          onClick={() => updateApplication(app.id, "rejected")}
                          className="flex-1 bg-red-600 text-white py-2 rounded-lg"
                        >
                          अस्वीकारें
                        </button>
                      </div>
                    )}

                    {/* Contractor → Call & Chat */}
                    {app.status === "accepted" && workerPhone && (
                      <div className="flex gap-2 mt-2">
                        <a
                          href={`tel:${workerPhone}`}
                          className="flex-1 bg-green-600 text-white py-2 rounded-lg text-center"
                        >
                          कॉल करें 📞
                        </a>
                        <a
                          href={`https://wa.me/${workerPhone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-center"
                        >
                          चैट करें 💬
                        </a>
                      </div>
                    )}

                    {/* Contractor → Pay & Rate */}
                    {app.shiftstatus === "completed" && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => payWorker(app)}
                          className="bg-purple-600 text-white py-2 rounded-lg"
                        >
                          भुगतान करें 💰 (₹{app.jobs?.[0]?.wage})
                        </button>
                        {!ratingsGiven[app.id] && (
                          <button
                            onClick={() => rateWorker(app)}
                            className="bg-orange-600 text-white py-2 rounded-lg"
                          >
                            Rate Worker ⭐
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <button
            onClick={() => router.push("/jobs/new")}
            className="w-full bg-green-700 text-white py-3 rounded-lg text-lg mt-6"
          >
            नया काम डालें ➕
          </button>
        </div>
      )}
    </div>
  );
}
