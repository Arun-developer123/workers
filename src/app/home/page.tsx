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
  wage?: string | number | null;
  profile_image_url?: string | null; // optional, may be present in DB
}

interface Job {
  id: string;
  title: string;
  location: string; // can be address or "lat,lng"
  wage: number | string | null;
  contractor_id: string;
  created_at?: string;
  description?: string;
}

interface Application {
  id: string;
  worker_id: string;
  contractor_id: string;
  job_id: string;
  status: "pending" | "accepted" | "rejected";
  jobs?: Job[]; // jobs array from join or fetched separately
  shiftstatus?: string | null;
  offered_wage?: number | null;
  contractor_wage?: number | null;
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
  phone?: string;
  wage?: string | number | null;
}

interface OtpRow {
  id: string;
  application_id: string;
  contractor_id: string;
  worker_id: string;
  job_id: string;
  otp_code: string;
  type: "start" | "end";
  expires_at: string;
  used: boolean;
}

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null); // NEW: profile image URL
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [workersMap, setWorkersMap] = useState<{ [key: string]: string }>({});
  const [workerWageMap, setWorkerWageMap] = useState<{ [key: string]: number | null }>({});
  const [wallet, setWallet] = useState<number>(0);
  const [ratingsGiven, setRatingsGiven] = useState<{ [key: string]: boolean }>({});
  const [myRating, setMyRating] = useState<number | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<{ [jobId: string]: boolean }>({});
  const [completedApps, setCompletedApps] = useState<{ [appId: string]: boolean }>({});
  const [pendingOtpsMap, setPendingOtpsMap] = useState<{ [applicationId: string]: OtpRow[] }>({});
  const router = useRouter();

  useEffect(() => {
    const storedProfile = localStorage.getItem("fake_user_profile");
    if (!storedProfile) {
      router.push("/auth/sign-in");
      return;
    }
    const parsedProfile: Profile = JSON.parse(storedProfile);
    setProfile(parsedProfile);

    // fetch profile image from DB (if available) — non-destructive, doesn't change other logic
    fetchProfileImage(parsedProfile.user_id).catch((e) => {
      console.warn("fetchProfileImage failed", e);
    });

    // fetch common data for both roles
    fetchWallet(parsedProfile.user_id);
    fetchMyRating(parsedProfile.user_id);

    if (parsedProfile.role === "worker") {
      fetchJobs();
    } else if (parsedProfile.role === "contractor") {
      fetchContractorData(parsedProfile.user_id);
      fetchJobsForContractor(parsedProfile.user_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NEW: fetch profile image URL (tries profile_image_url column; if absent but path stored use storage.getPublicUrl)
  const fetchProfileImage = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("profile_image_url")
        .eq("user_id", userId)
        .single();
      if (error) {
        // non-fatal
        // console.warn("fetchProfileImage select error", error);
        return;
      }
      // avoid `any` cast by using a narrow type for the row
      const profileRow = data as { profile_image_url?: string } | null;
      const img = profileRow?.profile_image_url ?? null;
      if (img) {
        setProfileImageUrl(img);
      } else {
        // nothing saved or different column used — do nothing
        setProfileImageUrl(null);
      }
    } catch (err) {
      console.warn("fetchProfileImage unexpected", err);
    }
  };

  // Worker → Available Jobs (all jobs)
  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("fetchJobs error", error);
        setJobs([]);
        return;
      }
      setJobs((data as Job[]) || []);
    } catch (err) {
      console.error("fetchJobs unexpected", err);
      setJobs([]);
    }
  };

  // Contractor → fetch jobs posted by contractor
  const fetchJobsForContractor = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("contractor_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("fetchJobsForContractor error", error);
        setJobs([]);
        return;
      }
      setJobs((data as Job[]) || []);
    } catch (err) {
      console.error("fetchJobsForContractor unexpected", err);
      setJobs([]);
    }
  };

  // Contractor → Applications + join shift_logs + pending OTPs
  const fetchContractorData = async (userId: string) => {
    try {
      // 1) Fetch applications (try to get joined job via RPC select; but if not present, we'll fetch jobs separately)
      const { data: apps, error } = await supabase
        .from("applications")
        // attempt to include job fields if foreign key relationship present in Supabase
        .select("id, worker_id, contractor_id, job_id, status, offered_wage, contractor_wage, jobs(title, location, wage, contractor_id, description)")
        .eq("contractor_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("fetchContractorData error", error);
        setApplications([]);
        return;
      }

      if (!apps) {
        setApplications([]);
        return;
      }

      const applicationsData = apps as Application[];

      // 2) Worker phones and wages: fetch profiles for workers referenced in applications
      const workerIds = Array.from(new Set(applicationsData.map((a) => a.worker_id)));
      const mapPhone: { [key: string]: string } = {};
      const mapWage: { [key: string]: number | null } = {};
      if (workerIds.length > 0) {
        const { data: workersData, error: workersErr } = await supabase
          .from("profiles")
          .select("user_id, phone, wage")
          .in("user_id", workerIds);

        if (workersErr) {
          console.error("fetch worker profiles error", workersErr);
        }

        ((workersData as WorkerProfile[]) || []).forEach((w) => {
          if (w.user_id) mapPhone[w.user_id] = w.phone || "";
          // normalize wage to number if possible
          const wnum = w?.wage != null ? Number(w.wage) : null;
          mapWage[w.user_id] = isNaN(wnum as number) ? null : (wnum as number);
        });

        setWorkersMap(mapPhone);
        setWorkerWageMap(mapWage);
      } else {
        setWorkersMap({});
        setWorkerWageMap({});
      }

      // 3) Fetch jobs separately to ensure we have job title/wage even if join not present
      const jobIds = Array.from(new Set(applicationsData.map((a) => a.job_id).filter(Boolean)));
      const jobsDataById: { [key: string]: Job } = {};
      if (jobIds.length > 0) {
        const { data: jobsData, error: jobsErr } = await supabase
          .from("jobs")
          .select("*")
          .in("id", jobIds);

        if (jobsErr) {
          console.error("fetch jobs by ids error", jobsErr);
        } else {
          ((jobsData as Job[]) || []).forEach((j) => {
            jobsDataById[j.id] = j;
          });
        }
      }

      // 4) Fetch shift_logs
      let shifts: ShiftLog[] | null = null;
      if (jobIds.length > 0) {
        const { data: shiftsData } = await supabase
          .from("shift_logs")
          .select("worker_id, contractor_id, job_id, status")
          .in("job_id", jobIds);
        shifts = shiftsData as ShiftLog[] | null;
      }

      // 5) Merge applications with job (either from join or fetched), shift status and fallback wages
      const merged = applicationsData.map((a) => {
        // prefer joined job if available
        const joinedJob = Array.isArray(a.jobs) && a.jobs[0] ? a.jobs[0] : undefined;
        const fetchedJob = jobsDataById[a.job_id];
        const job = (joinedJob || fetchedJob) as Job | undefined;

       let resolvedWage: number | string | null = null;

// access application-level fields directly
const appContractor = a.contractor_wage ?? null;

if (appContractor != null && String(appContractor).trim() !== "") {
  resolvedWage = appContractor;
} else if (job && job.wage != null && String(job.wage).trim() !== "") {
  resolvedWage = job.wage;
} else {
  const wWage = mapWage[a.worker_id];
  if (wWage != null) resolvedWage = wWage;
}




        const shift = (shifts || [])?.find(
          (s) => s.worker_id === a.worker_id && s.contractor_id === a.contractor_id && s.job_id === a.job_id
        );

        const finalApp: Application = {
          ...a,
          jobs: job ? [{ ...job, wage: resolvedWage }] : [],
          shiftstatus: shift?.status || null,
        };

        return finalApp;
      });

      setApplications(merged);

      // 6) Fetch pending OTPs for this contractor (unused and not expired)
      const nowIso = new Date().toISOString();
      const { data: otpsData, error: otpsErr } = await supabase
        .from("shift_otps")
        .select("*")
        .eq("contractor_id", userId)
        .eq("used", false)
        .gt("expires_at", nowIso);

      if (otpsErr) {
        console.error("fetch OTPs error", otpsErr);
        setPendingOtpsMap({});
        return;
      }

      const otps = (otpsData || []) as OtpRow[];
      const mapByApp: { [applicationId: string]: OtpRow[] } = {};
      otps.forEach((o) => {
        if (!mapByApp[o.application_id]) mapByApp[o.application_id] = [];
        mapByApp[o.application_id].push(o);
      });
      setPendingOtpsMap(mapByApp);
    } catch (err) {
      console.error("fetchContractorData unexpected", err);
      setApplications([]);
      setPendingOtpsMap({});
    }
  };

  // Worker → Apply Job
  // Replace existing applyJob with this
const applyJob = async (jobId: string) => {
  try {
    const contractorId = jobs.find((j) => j.id === jobId)?.contractor_id;
    if (!contractorId) return alert("❌ Contractor ID नहीं मिली");

    // 1) Ask worker for the wage they want to request
    const wageStr = prompt("आप इस काम के लिए कितना वेतन मांगते हैं? (₹) — सिर्फ़ नंबर दर्ज करें:");
    if (!wageStr) return; // cancelled
    const wageNum = Number(wageStr);
    if (isNaN(wageNum) || wageNum <= 0) return alert("कृपया वैध संख्या दर्ज करें");

    // 2) compute +10%
    const plusTen = wageNum * 1.1;

    // 3) apply your rounding/adding rule:
    //    if after +10% the amount is between 1 and 50 (inclusive) => add 50
    //    if above 50 => add 100
    let contractorShown = plusTen;
    if (plusTen > 0 && plusTen <= 50) {
      contractorShown = plusTen + 50;
    } else if (plusTen > 50) {
      contractorShown = plusTen + 100;
    }
    // final rounding to nearest integer
    contractorShown = Math.round(contractorShown);

    // 4) Show confirmation to worker (so they know what contractor will see)
    const ok = confirm(
      `आपने ₹${wageNum} माँगा। \nक्या आप आवेदन भेजना चाहते हैं?`
    );
    if (!ok) return;

    // 5) Insert application with offered_wage and contractor_wage fields
    const { error } = await supabase.from("applications").insert({
      worker_id: profile?.user_id,
      contractor_id: contractorId,
      job_id: jobId,
      status: "pending",
      offered_wage: wageNum,        // worker का दिया हुआ वेतन
      contractor_wage: contractorShown, // contractor को दिखाने के लिए तैयार रकम
    });

    if (error) {
      console.error("applyJob insert error:", error);
      alert("आवेदन भेजने में समस्या ❌");
    } else {
      alert("✅ आवेदन भेज दिया गया — contractor को आपका प्रस्ताव दिख जाएगा");
      // refresh UI (optional)
      if (profile?.role === "worker") fetchJobs();
      if (profile?.role === "contractor") fetchContractorData(profile.user_id);
    }
  } catch (err) {
    console.error("applyJob unexpected", err);
    alert("कुछ गलत हुआ — बाद में कोशिश करें");
  }
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

  // ---------- Helper: compute displayed (contractor) wage ----------
  const computeDisplayedWage = (raw: string | number | null | undefined) => {
    const base = Number(raw || 0);
    if (!base || isNaN(base) || base <= 0) return 0;
    const marked = base * 1.1; // +10%
    const roundedUp50 = Math.ceil(marked / 50) * 50; // round up to next multiple of 50
    return roundedUp50;
  };

  // Worker → Start Shift
  const startShift = async (app: Application) => {
    try {
      if (!app || !app.worker_id || !app.contractor_id) {
        alert("❌ Invalid application details");
        return;
      }

      // 1) fetch worker's profile wage from profiles table (ensure numeric)
      const { data: workerProfile, error: wpErr } = await supabase
        .from("profiles")
        .select("wage")
        .eq("user_id", app.worker_id)
        .single();

      if (wpErr) {
        console.error("startShift: worker profile fetch error", wpErr);
        alert("❌ Worker की प्रोफ़ाइल नहीं मिली");
        return;
      }

      const baseWage = Number(workerProfile?.wage || 0);
      if (isNaN(baseWage) || baseWage <= 0) {
        alert("❌ Worker का valid wage नहीं मिला — शिफ्ट शुरू नहीं हो सकती");
        return;
      }

      const amountToDeduct = computeDisplayedWage(baseWage);
      if (!amountToDeduct || amountToDeduct <= 0) {
        alert("❌ गणना में समस्या — शिफ्ट शुरू नहीं हो सकती");
        return;
      }

      // 3) fetch contractor wallet
      const { data: contractorWalletRow, error: walletErr } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", app.contractor_id)
        .single();

      if (walletErr || !contractorWalletRow) {
        console.error("startShift: contractor wallet fetch error", walletErr);
        alert("❌ Contractor का वॉलेट नहीं मिला");
        return;
      }

      const contractorBalance = Number(contractorWalletRow.balance || 0);
      if (contractorBalance < amountToDeduct) {
        alert(`❌ Contractor के पास पर्याप्त बैलेंस नहीं है — ₹${amountToDeduct} चाहिए`);
        return;
      }

      // 4) Deduct contractor balance (update)
      const newContractorBalance = contractorBalance - amountToDeduct;
      const { error: deductErr } = await supabase
        .from("wallets")
        .update({ balance: newContractorBalance })
        .eq("user_id", app.contractor_id);

      if (deductErr) {
        console.error("startShift: deduct contractor error", deductErr);
        alert("❌ Contractor के वॉलेट से राशि घटाने में समस्या");
        return;
      }

      // 5) Credit worker using existing RPC increment_wallet
      const { error: incErr } = await supabase.rpc("increment_wallet", {
        worker_id: app.worker_id,
        amount: amountToDeduct,
      });

      if (incErr) {
        console.error("startShift: increment worker error", incErr);
        // rollback contractor deduction (best-effort)
        await supabase.from("wallets").update({ balance: contractorBalance }).eq("user_id", app.contractor_id);
        alert("❌ Worker को क्रेडिट करने में समस्या — ट्रांज़ैक्शन रिवर्ट की जा रही है");
        return;
      }

      // 6) Insert shift_logs record (mark ongoing)
      const { error: insertShiftErr } = await supabase.from("shift_logs").insert({
        worker_id: app.worker_id,
        contractor_id: app.contractor_id,
        job_id: app.job_id,
        start_time: new Date().toISOString(),
        status: "ongoing",
      });

      if (insertShiftErr) {
        console.error("startShift: insert shift log error", insertShiftErr);
        try {
          await supabase.rpc("increment_wallet", {
            worker_id: app.worker_id,
            amount: -amountToDeduct,
          });
        } catch (e) {
          console.warn("rollback: decrement worker via RPC failed", e);
        }
        try {
          await supabase.from("wallets").update({ balance: contractorBalance }).eq("user_id", app.contractor_id);
        } catch (e) {
          console.warn("rollback: restore contractor wallet failed", e);
        }
        alert("❌ शिफ्ट रिकॉर्ड बनाने में समस्या — ट्रांज़ैक्शन रिवर्ट की कोशिश की जा रही है");
        return;
      }

      alert(`✅ शिफ्ट शुरू कर दी गई — ₹${amountToDeduct} contractor के वॉलेट से काटा गया और worker के वॉलेट में डाला गया`);
      fetchContractorData(app.contractor_id);
    } catch (err) {
      console.error("startShift unexpected", err);
      alert("❌ शिफ्ट शुरू करने में समस्या");
    }
  };

  // Worker → End Shift (contractor side helper)
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

      // if job wage missing, fallback to worker's profile wage
      let wageNum = Number(jobRow.wage);
      if (isNaN(wageNum) || wageNum <= 0) {
        const { data: wp } = await supabase.from("profiles").select("wage").eq("user_id", app.worker_id).single();
        wageNum = Number(wp?.wage || 0);
      }

      if (isNaN(wageNum) || wageNum <= 0) {
        alert("❌ इस जॉब का valid wage नहीं मिला");
        return;
      }

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

      alert(`✅ Worker को ₹${wageNum} का भुगतान कर दिया गया`);

      // Mark app as paid locally
      setCompletedApps((prev) => ({ ...prev, [app.id]: !!ratingsGiven[app.id] || true }));

      // Refresh wallets in UI: update worker's wallet and contractor's if logged-in user is contractor
      fetchWallet(app.worker_id);
      if (profile?.user_id === contractorId) {
        setWallet(newContractorBalance);
      }

      // Optionally refresh contractor data (applications, shifts, OTPs)
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
      setCompletedApps((prev) => ({ ...prev, [app.id]: !!prev[app.id] || true }));
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
    try {
      const { data } = await supabase.from("wallets").select("balance").eq("user_id", userId).single();
      setWallet(Number((data?.balance as number) || 0));
    } catch (err) {
      console.error("fetchWallet unexpected", err);
      setWallet(0);
    }
  };

  // Fetch average rating for a user (works for both worker & contractor)
  const fetchMyRating = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("ratings").select("rating").eq("rated_id", userId);
      if (error) {
        console.error("fetchMyRating error", error);
        setMyRating(null);
        return;
      }
      if (!data || data.length === 0) {
        setMyRating(null);
        return;
      }
      const avg = (data as { rating: number }[]).reduce((sum, r) => sum + (r.rating || 0), 0) / data.length;
      setMyRating(Number(avg.toFixed(1)));
    } catch (err) {
      console.error("fetchMyRating unexpected", err);
      setMyRating(null);
    }
  };

  // Toggle expand job tile to show description
  const toggleJobExpand = (jobId: string) => {
    setExpandedJobs((prev) => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  // Add funds to contractor wallet (simple prompt-based)
  const addFunds = async () => {
    const amountStr = prompt("कितनी राशि जोड़नी है (₹):");
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert("कृपया वैध राशि दर्ज करें");
      return;
    }

    try {
      const { data: existing } = await supabase.from("wallets").select("balance").eq("user_id", profile?.user_id).single();
      const current = Number(existing?.balance || 0);
      const newBal = current + amount;
      const { error } = await supabase.from("wallets").upsert({ user_id: profile?.user_id, balance: newBal });
      if (error) {
        console.error("addFunds error", error);
        alert("❌ वॉलेट में राशि जोड़ने में समस्या");
        return;
      }
      setWallet(newBal);
      alert(`✅ ₹${amount} वॉलेट में जोड़ दिए गए`);
    } catch (err) {
      console.error("addFunds unexpected", err);
      alert("❌ समस्या हुई");
    }
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
            {/* Profile avatar: show image if available, otherwise fallback to initial */}
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt="profile"
                className="w-14 h-14 rounded-full object-cover border-2 border-white"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center font-semibold">
                {profile.name ? profile.name[0] : "U"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

            {/* Jobs: show one-per-row horizontally (full width rows) with expandable description */}
            {jobs.length === 0 ? (
              <div className="p-6 border border-dashed rounded-lg text-center opacity-80">अभी कोई काम उपलब्ध नहीं है ❌</div>
            ) : (
              <div className="flex flex-col gap-4">
                {jobs.map((job) => (
                  <div key={job.id} className="border rounded-xl p-4 shadow hover:shadow-lg transition-shadow bg-white w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-lg font-bold">{job.title}</div>
                      <div className="text-sm opacity-80 mt-1">स्थान: {renderLocation(job.location)}</div>
                    
                      <div className="text-xs opacity-60 mt-1">Posted: {job.created_at ? new Date(job.created_at).toLocaleString() : "—"}</div>

                      {/* expanded description */}
                      {expandedJobs[job.id] && (
                        <div className="mt-3 text-sm text-gray-700">
                          <h4 className="font-semibold">डिस्क्रिप्शन</h4>
                          <p className="mt-1">{job.description || "डिस्क्रिप्शन उपलब्ध नहीं है"}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 items-end md:items-center md:justify-center">
                      <div className="flex flex-col gap-2">
                        <button onClick={() => applyJob(job.id)} className="bg-gradient-to-r from-green-500 to-lime-500 text-white py-2 px-4 rounded-lg font-semibold">आवेदन करें ✅</button>
                        <button onClick={() => toggleJobExpand(job.id)} className="text-sm underline opacity-80">{expandedJobs[job.id] ? "डिस्क्रिप्शन छुपाएँ" : "डिटेल देखें"}</button>
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
            <div className="flex gap-2 items-center">
              <div className="text-sm mr-2">वॉलेट: <span className="font-bold">₹{wallet}</span></div>
              <button onClick={addFunds} className="bg-green-700 text-white py-2 px-3 rounded-lg">Add +</button>
              <button onClick={() => router.push("/jobs/new")} className="bg-blue-600 text-white py-2 px-3 rounded-lg">नया काम डालें ➕</button>

              {/* NEW: See Workers button */}
              <button
                onClick={() => router.push("/workers")}
                className="bg-yellow-400 text-white py-2 px-3 rounded-lg"
              >
                Workers देखें 👥
              </button>
            </div>
          </div>


          {applications.length === 0 ? (
            <div className="p-6 border rounded-xl text-center opacity-80">अभी कोई आवेदन नहीं आया ❌</div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => {
                const workerPhone = workersMap[app.worker_id] || null;
                const jobObj = app.jobs && app.jobs[0] ? app.jobs[0] : undefined;

                // isCompleted: both paid & rated (local heuristic)
                const isCompleted = !!completedApps[app.id] && !!ratingsGiven[app.id];

                // Show green border until both pay & rating are done
                const shouldHighlightGreen = !isCompleted && (app.status === "pending" || app.status === "accepted");

                // safe wage display: prefer application.contractor_wage, then job's wage, then worker profile wage
let wageDisplayRaw: number | string | null | undefined = app.contractor_wage ?? jobObj?.wage;
if ((wageDisplayRaw == null || wageDisplayRaw === "" || Number(wageDisplayRaw) === 0) && workerWageMap[app.worker_id] != null) {
  wageDisplayRaw = workerWageMap[app.worker_id] as number;
}


                const wageDisplay = wageDisplayRaw != null && wageDisplayRaw !== "" ? wageDisplayRaw : "—";

                // Pending OTPs for this application (if any)
                const otpsForApp = pendingOtpsMap[app.id] || [];

                return (
                  <div
                    key={app.id}
                    className={`border rounded-xl p-4 shadow-md bg-white ${isCompleted ? "border-red-500" : shouldHighlightGreen ? "border-green-500" : "border-gray-200"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-bold">{jobObj?.title ?? "(Job name unavailable)"} <span className="text-sm opacity-70">({jobObj?.location ?? "—"})</span></div>
                        <div className="text-sm opacity-70 mt-1">स्थिति: <span className={`font-semibold ${app.status === 'pending' ? 'text-yellow-600' : app.status === 'accepted' ? 'text-green-600' : 'text-red-600'}`}>{app.status}</span></div>
                        <div className="text-sm opacity-60 mt-1">शिफ्ट: <span className="font-medium">{app.shiftstatus || '—'}</span></div>
                        <div className="text-sm opacity-60 mt-1">वेज: <span className="font-medium">₹{wageDisplay}</span></div>

                        {/* Show pending OTPs (so contractor can give OTP to worker) */}
                        {otpsForApp.length > 0 && (
                          <div className="mt-2 p-2 bg-yellow-50 border rounded">
                            <div className="text-sm font-semibold">Pending OTPs:</div>
                            {otpsForApp.map((o) => (
                              <div key={o.id} className="text-sm mt-1">
                                <span className="font-medium">{o.type === "start" ? "Start OTP" : "End OTP"}:</span>{" "}
                                <span className="inline-block ml-2 px-2 py-1 bg-gray-100 rounded">{o.otp_code}</span>
                                <span className="text-xs opacity-70 ml-2">expires: {new Date(o.expires_at).toLocaleTimeString()}</span>
                              </div>
                            ))}
                            <div className="mt-1 text-xs opacity-70">इन OTP को worker को दें — वे इन्हें app में दर्ज करेंगे</div>
                          </div>
                        )}

                        {isCompleted && (
                          <div className="mt-2 text-sm font-semibold text-red-700">✅ Job Done</div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 items-end">
                        {/* Actions */}
                        {app.status === "pending" && (
                          <div className="flex gap-2">
                            <button onClick={() => updateApplication(app.id, "accepted")} className="bg-blue-600 text-white py-2 px-3 rounded-lg">स्वीकारें</button>
                            <button onClick={() => updateApplication(app.id, "rejected")} className="bg-red-600 text-white py-2 px-3 rounded-lg">अस्वीकारें</button>
                          </div>
                        )}

                        {/* If accepted and not completed, show contact + pay/rate when appropriate */}
                        {app.status === "accepted" && !isCompleted && (
                          <>
                            {workerPhone && (
                              <div className="flex gap-2">
                                <a href={`tel:${workerPhone}`} className="px-3 py-2 rounded-lg bg-green-600 text-white">कॉल करें</a>
                                <a href={`https://wa.me/${workerPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-blue-600 text-white">व्हाट्सएप</a>
                              </div>
                            )}

                            <div className="flex flex-col gap-2 w-full mt-2">
                              {/* show pay button only if shiftstatus is completed */}
                              {app.shiftstatus === "completed" && (
                                <>

                                  {!ratingsGiven[app.id] && (
                                    <button onClick={async () => {
                                      await rateWorker(app);
                                      const bothDone = !!completedApps[app.id];
                                      if (bothDone) setCompletedApps((p) => ({ ...p, [app.id]: true }));
                                    }} className="bg-orange-500 text-white py-2 px-3 rounded-lg w-full">Rate Worker ⭐</button>
                                  )}
                                </>
                              )}
                            </div>
                          </>
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

// Helper: render location as human link if lat,lng else show text
function renderLocation(location: string | undefined) {
  if (!location) return "—";
  // crude lat,lng detection
  const coordsMatch = location.match(/^\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*$/);
  if (coordsMatch) {
    const lat = coordsMatch[1];
    const lng = coordsMatch[2];
    const maps = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    return (
      <a href={maps} target="_blank" rel="noopener noreferrer" className="underline">
        देखें (क्लिक करें)
      </a>
    );
  }
  return location;
}
