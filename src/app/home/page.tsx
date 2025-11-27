"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AudioButton from "@/components/AudioButton";
import { FaShoppingCart, FaCar } from "react-icons/fa";
import Link from "next/link";

// ==== Types ====
interface Profile {
  occupation: string;
  user_id: string;
  name: string;
  role: "worker" | "contractor";
  phone?: string;
  wage?: string | number | null;
  profile_image_url?: string | null;

  // eKYC fields (optional, may be absent for older rows)
  is_ekyc_complete?: boolean;
  ekyc_status?: "pending" | "verified" | "none";
  aadhaar_masked?: string | null;
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
  jobs?: Job[];
  shiftstatus?: string | null;
  offered_wage?: number | string | null;
  contractor_wage?: number | string | null;
}

interface ShiftLog {
  worker_id: string;
  contractor_id: string;
  job_id: string;
  status: string;
  start_time?: string;
  end_time?: string;
  id?: string;
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
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [workersMap, setWorkersMap] = useState<{ [key: string]: string }>({});
  const [workerWageMap, setWorkerWageMap] = useState<{ [key: string]: number | null }>({});
  const [ratingsGiven, setRatingsGiven] = useState<{ [key: string]: boolean }>({});
  const [myRating, setMyRating] = useState<number | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<{ [jobId: string]: boolean }>({});
  const [completedApps, setCompletedApps] = useState<{ [appId: string]: boolean }>({});
  const [pendingOtpsMap, setPendingOtpsMap] = useState<{ [applicationId: string]: OtpRow[] }>({});
  const [samePhoneProfiles, setSamePhoneProfiles] = useState<Profile[] | null>(null);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesModalOpen, setProfilesModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedProfile = localStorage.getItem("fake_user_profile");
    if (!storedProfile) {
      router.push("/auth/sign-in");
      return;
    }
    const parsedProfile: Profile = JSON.parse(storedProfile);
    setProfile(parsedProfile);

    // fetch profile image from DB (if available)
    fetchProfileImage(parsedProfile.user_id).catch((e) => {
      console.warn("fetchProfileImage failed", e);
    });

    // fetch common data for both roles
    fetchMyRating(parsedProfile.user_id);

    if (parsedProfile.role === "worker") {
      fetchJobs(); // worker: uses shift_logs to filter available jobs
    } else if (parsedProfile.role === "contractor") {
      fetchContractorData(parsedProfile.user_id);
      fetchJobsForContractor(parsedProfile.user_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // utility: determine whether profile has completed eKYC
const isEkycComplete = (p: Profile | null) => {
  if (!p) return false;
  // prefer explicit boolean
  if (typeof p.is_ekyc_complete === "boolean") return p.is_ekyc_complete;
  // fallback to status
  if (p.ekyc_status === "verified") return true;
  // fallback to masked aadhaar presence
  if (p.aadhaar_masked && p.aadhaar_masked.length >= 4) return true;
  return false;
};


  useEffect(() => {
    // typed CustomEvent carrying a Profile in detail
    const onProfileChanged = (ev: Event) => {
      try {
        // safely treat as CustomEvent<Profile>
        const ce = ev as CustomEvent<Profile>;
        const newProfile = ce.detail;
        if (!newProfile) return;

        setProfile(newProfile);
        // fetch fresh image & rating & data based on role
        fetchProfileImage(newProfile.user_id).catch(() => {});
        fetchMyRating(newProfile.user_id).catch(() => {});
        if (newProfile.role === "worker") {
          fetchJobs().catch(() => {});
        } else {
          fetchContractorData(newProfile.user_id).catch(() => {});
          fetchJobsForContractor(newProfile.user_id).catch(() => {});
        }
      } catch (err) {
        console.error("onProfileChanged handler error", err);
      }
    };

    window.addEventListener("fake_profile_changed", onProfileChanged);

    return () => {
      window.removeEventListener("fake_profile_changed", onProfileChanged);
    };
  }, []);

  // fetch all profiles that share the same phone number as the current profile
  const fetchProfilesWithSamePhone = async () => {
    try {
      // try to get phone from in-memory profile (localStorage)
      let phoneToQuery = profile?.phone;

      // if not present, attempt to fetch it from DB for current user ID
      if (!phoneToQuery && profile?.user_id) {
        const { data: profRow, error: pErr } = await supabase
          .from("profiles")
          .select("phone")
          .eq("user_id", profile.user_id)
          .single();

        if (!pErr && profRow) {
          // typed cast into expected shape (avoid any)
          const typed = profRow as { phone?: string } | null;
          phoneToQuery = typed?.phone;
        }
      }

      if (!phoneToQuery) {
        alert("इस प्रोफ़ाइल का फोन नंबर उपलब्ध नहीं है।");
        return;
      }

      setProfilesLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("phone", phoneToQuery);

      if (error) {
        console.error("fetchProfilesWithSamePhone error", error);
        alert("Profiles लाने में समस्या आई — console देखें");
        setProfilesLoading(false);
        return;
      }
      setSamePhoneProfiles((data as Profile[]) || []);
      setProfilesModalOpen(true);
      setProfilesLoading(false);
    } catch (err) {
      console.error("fetchProfilesWithSamePhone unexpected", err);
      setProfilesLoading(false);
      alert("Profiles लाने में गड़बड़।");
    }
  };

  // when user chooses a profile from the list, store it (same as sign-in) and redirect
  const switchToProfile = (p: Profile) => {
    // save selected profile
    localStorage.setItem("fake_user_profile", JSON.stringify(p));

    // close modal UI
    setProfilesModalOpen(false);
    setSamePhoneProfiles(null);

    // dispatch event so HomePage will pick up new profile without reload
    try {
      window.dispatchEvent(new CustomEvent("fake_profile_changed", { detail: p }));
    } catch (e) {
      console.warn("event dispatch failed", e);
    }

    // if not already on /home navigate there (optional)
    if (typeof window !== "undefined" && window.location.pathname !== "/home") {
      router.push("/home");
    }
  };

  // fetch profile image URL
  const fetchProfileImage = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("profile_image_url")
        .eq("user_id", userId)
        .single();
      if (error) {
        return;
      }
      const profileRow = data as { profile_image_url?: string } | null;
      const img = profileRow?.profile_image_url ?? null;
      if (img) {
        setProfileImageUrl(img);
      } else {
        setProfileImageUrl(null);
      }
    } catch (err) {
      console.warn("fetchProfileImage unexpected", err);
    }
  };

  // Worker → Available Jobs (all jobs) BUT: filter out jobs that have only completed shifts (i.e. existed shift_logs and none ongoing)
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

      const allJobs = (data as Job[]) || [];

      // if no jobs, quick return
      if (allJobs.length === 0) {
        setJobs([]);
        return;
      }

      // collect job ids and query shift_logs to decide availability
      const jobIds = allJobs.map((j) => j.id).filter(Boolean);

      // fetch shift_logs for these jobs
      const { data: shiftsData, error: shiftsErr } = await supabase
        .from("shift_logs")
        .select("job_id, status")
        .in("job_id", jobIds);

      if (shiftsErr) {
        // if shift fetch failed, fallback to showing all jobs (safer)
        console.error("fetch shift_logs error", shiftsErr);
        setJobs(allJobs);
        return;
      }

      const shifts = (shiftsData || []) as { job_id: string; status: string }[];

      // group shifts by job_id
      const shiftsByJob: { [jobId: string]: { job_id: string; status: string }[] } = {};
      shifts.forEach((s) => {
        if (!s || !s.job_id) return;
        if (!shiftsByJob[s.job_id]) shiftsByJob[s.job_id] = [];
        shiftsByJob[s.job_id].push(s);
      });

      // filter logic:
      // - If a job has no shift_logs -> keep it (available)
      // - If a job has any shift_log with status 'ongoing' -> keep it (still active)
      // - If a job has shift_logs but none are 'ongoing' (i.e. all completed) -> remove from available jobs
      const filtered = allJobs.filter((job) => {
        const logs = shiftsByJob[job.id] || [];
        if (logs.length === 0) return true; // never started -> available
        const hasOngoing = logs.some((l) => String(l.status).toLowerCase() === "ongoing");
        if (hasOngoing) return true; // currently ongoing -> still show
        // otherwise logs exist but no ongoing -> all completed -> remove from available
        return false;
      });

      setJobs(filtered);
    } catch (err) {
      console.error("fetchJobs unexpected", err);
      setJobs([]);
    }
  };

  // Contractor → fetch jobs posted by contractor (contractor should still see their jobs even if completed; keep original behavior)
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

  // resolve wage for app (fallbacks)
  const resolveWageForApp = (app: Application, jobObj?: Job): number | null => {
    const c = parseWage(app.contractor_wage);
    if (c != null) return c;

    const o = parseWage(app.offered_wage);
    if (o != null) return o;

    if (jobObj) {
      const jraw = jobObj.wage;
      const j = typeof jraw === "number" ? jraw : parseWage(jraw);
      if (j != null) return j;
    }

    const w = workerWageMap[app.worker_id];
    if (w != null) return w;

    console.warn("resolveWageForApp: no wage found", {
      appId: app.id,
      contractor_wage: app.contractor_wage,
      offered_wage: app.offered_wage,
      jobId: app.job_id,
      jobObjWage: jobObj?.wage,
      workerProfileWage: workerWageMap[app.worker_id]
    });
    return null;
  };

  const parseWage = (val: string | number | null | undefined): number | null => {
    if (val == null) return null;
    if (typeof val === "number" && Number.isFinite(val)) return val;
    const s = String(val).trim();
    if (s === "") return null;
    const cleaned = s.replace(/[^\d.-]/g, "");
    if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
    const n = Number(cleaned);
    if (!Number.isFinite(n)) return null;
    return n > 0 ? n : (n === 0 ? 0 : null);
  };

  // Contractor → Applications + join shift_logs + pending OTPs
  const fetchContractorData = async (userId: string) => {
    try {
      const { data: apps, error } = await supabase
        .from("applications")
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

      // worker profiles
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
          const wnum = parseWage(w?.wage);
          mapWage[w.user_id] = wnum;
        });

        setWorkersMap(mapPhone);
        setWorkerWageMap(mapWage);
      } else {
        setWorkersMap({});
        setWorkerWageMap({});
      }

      // fetch jobs by ids
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
            // parseWage returns number|null — keep Job.wage as number|string|null
            const wageNum = parseWage(j.wage);
            jobsDataById[j.id] = { ...(j as Job), wage: wageNum } as Job;
          });
        }
      }

      // fetch shift_logs
      let shifts: ShiftLog[] | null = null;
      if (jobIds.length > 0) {
        const { data: shiftsData } = await supabase
          .from("shift_logs")
          .select("worker_id, contractor_id, job_id, status, id")
          .in("job_id", jobIds);
        shifts = shiftsData as ShiftLog[] | null;
      }

      // Determine jobs that are "done" (have at least one shift_log and NONE ongoing)
      const doneJobIds = new Set<string>();
      if (shifts && shifts.length > 0) {
        const grouped: { [jobId: string]: ShiftLog[] } = {};
        shifts.forEach((s) => {
          if (!s || !s.job_id) return;
          if (!grouped[s.job_id]) grouped[s.job_id] = [];
          grouped[s.job_id].push(s);
        });

        Object.keys(grouped).forEach((jid) => {
          const logs = grouped[jid];
          const hasOngoing = logs.some((l) => String(l.status).toLowerCase() === "ongoing");
          const hasAny = logs.length > 0;
          if (hasAny && !hasOngoing) {
            doneJobIds.add(jid);
          }
        });
      }

      // merge
      const merged = applicationsData.map((a) => {
        const joinedJob = Array.isArray(a.jobs) && a.jobs[0] ? a.jobs[0] : undefined;
        const fetchedJob = jobsDataById[a.job_id];
        const job = (joinedJob || fetchedJob) as Job | undefined;

        const shift = (shifts || [])?.find(
          (s) => s.worker_id === a.worker_id && s.contractor_id === a.contractor_id && s.job_id === a.job_id
        );

        const contractorWageNum = parseWage(a.contractor_wage);
        const offeredWageNum = parseWage(a.offered_wage);
        const jobWageNum = job ? parseWage(job.wage) : null;

        const finalApp: Application = {
          ...a,
          contractor_wage: contractorWageNum,
          offered_wage: offeredWageNum,
          jobs: job ? [{ ...job, wage: jobWageNum }] : [],
          shiftstatus: shift?.status || null,
        };

        return finalApp;
      });

      // Filter out applications for jobs that are "done" so that on reload they no longer appear in contractor dashboard
      const filteredMerged = merged.filter((app) => !doneJobIds.has(app.job_id));

      setApplications(filteredMerged);

      // pending OTPs for this contractor (unused and not expired)
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
  const applyJob = async (jobId: string) => {
    try {
      const contractorId = jobs.find((j) => j.id === jobId)?.contractor_id;
      if (!contractorId) return alert("❌ Contractor ID नहीं मिली");

      const wageStr = prompt("आप इस काम के लिए कितना वेतन मांगते हैं? (₹) — सिर्फ़ नंबर दर्ज करें:");
      if (!wageStr) return;
      const wageNum = Number(wageStr);
      if (isNaN(wageNum) || wageNum <= 0) return alert("कृपया वैध संख्या दर्ज करें");

      const plusTen = wageNum * 1.1;

      let contractorShown = plusTen;
      if (plusTen > 0 && plusTen <= 50) {
        contractorShown = plusTen + 50;
      } else if (plusTen > 50) {
        contractorShown = plusTen + 100;
      }
      contractorShown = Math.round(contractorShown);

      const ok = confirm(`आपने ₹${wageNum} माँगा। \nक्या आप आवेदन भेजना चाहते हैं?`);
      if (!ok) return;

      const { error } = await supabase.from("applications").insert({
        worker_id: profile?.user_id,
        contractor_id: contractorId,
        job_id: jobId,
        status: "pending",
        offered_wage: wageNum,
        contractor_wage: contractorShown,
      });

      if (error) {
        console.error("applyJob insert error:", error);
        alert("आवेदन भेजने में समस्या ❌");
      } else {
        alert("✅ आवेदन भेज दिया गया — contractor को आपका प्रस्ताव दिख जाएगा");
        if (profile?.role === "worker") fetchJobs();
        if (profile?.role === "contractor") fetchContractorData(profile.user_id);
      }
    } catch (err) {
      console.error("applyJob unexpected", err);
      alert("कुछ गलत हुआ — बाद में कोशिश करें");
    }
  };

  // Contractor → Accept/Reject (NO payment RPCs)
  const updateApplication = async (appId: string, status: "accepted" | "rejected") => {
    try {
      const { error } = await supabase.from("applications").update({ status }).eq("id", appId);
      if (error) {
        console.error("update applications error", error);
        return alert("❌ आवेदन अपडेट करने में समस्या");
      }

      setApplications((prev) => prev.map((x) => (x.id === appId ? { ...x, status } : x)));
      if (profile?.user_id) {
        fetchContractorData(profile.user_id);
      }

      alert(status === "accepted" ? "✅ आवेदन स्वीकार कर दिया गया" : "✅ आवेदन अस्वीकृत कर दिया गया");
    } catch (err) {
      console.error("updateApplication unexpected", err);
      alert("❌ आवेदन अपडेट में समस्या आई");
    }
  };

  // ---------- Helper: compute displayed (contractor) wage ----------
  const computeDisplayedWage = (raw: string | number | null | undefined) => {
    const base = parseWage(raw);
    if (!base || isNaN(base) || base <= 0) return 0;
    const marked = base * 1.1; // +10%
    const roundedUp50 = Math.ceil(marked / 50) * 50;
    return roundedUp50;
  };

  // Worker → Start Shift (only shift log + OTP flows)
  const startShift = async (app: Application) => {
    try {
      if (app.status !== "accepted") {
        alert("❌ शिफ्ट शुरू करने से पहले आवेदन को स्वीकार होना चाहिए");
        return;
      }

      const { error: insertShiftErr } = await supabase.from("shift_logs").insert({
        worker_id: app.worker_id,
        contractor_id: app.contractor_id,
        job_id: app.job_id,
        start_time: new Date().toISOString(),
        status: "ongoing",
      });

      if (insertShiftErr) {
        console.error("startShift: insert shift log error", insertShiftErr);
        alert("❌ शिफ्ट शुरू करने में समस्या");
        return;
      }

      alert("✅ शिफ्ट शुरू कर दी गई");
      fetchContractorData(app.contractor_id);
      // refresh available jobs because a new ongoing was created (so job should remain visible)
      if (profile?.role === "worker") fetchJobs();
    } catch (err) {
      console.error("startShift unexpected", err);
      alert("❌ शिफ्ट शुरू करने में समस्या");
    }
  };

  // Worker → End Shift (contractor side helper) — no payment logic here
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
    alert("✅ शिफ्ट समाप्त हो गई");
    fetchContractorData(app.contractor_id);
    // refresh available jobs because if this job now has only completed entries it should be removed
    if (profile?.role === "worker") fetchJobs();
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
            {/* clickable profile image — shows other profiles with same phone */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                // open modal — fetch profiles with same phone
                fetchProfilesWithSamePhone();
              }}
              className="focus:outline-none"
              title="इसी नंबर के अन्य profiles देखें"
            >
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="profile"
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center font-semibold">
                  {profile.name ? profile.name[0] : "U"}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* IMPORTANT eKYC banner: show if eKYC not complete */}
{!isEkycComplete(profile) && (
  <div className="mb-6 p-4 rounded-xl border-2 border-red-300 bg-red-50 text-red-900 shadow-sm">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <div className="font-bold text-lg">महत्वपूर्ण: आपकी eKYC पूरी नहीं हुई</div>
        <div className="text-sm mt-1 opacity-90">
          आपकी eKYC पूरी नहीं होने के कारण आपको अभी काम नहीं मिलेगा और सरकारी योजनाओं/भुगतान के लिए पात्रता नहीं बनेगी। कृपया तुरंत eKYC पूरा करें।
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            // navigate to eKYC completion page with user id param
            router.push(`/ekyc/complete?user_id=${encodeURIComponent(profile.user_id)}`);
          }}
          className="bg-red-600 text-white py-2 px-4 rounded-lg font-semibold shadow hover:opacity-95"
        >
          अभी eKYC करें
        </button>
      </div>
    </div>
  </div>
)}



      {/* ---------------- Profiles modal (shows when profilesModalOpen is true) ---------------- */}
      {profilesModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            setProfilesModalOpen(false);
            setSamePhoneProfiles(null);
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl p-4 ring-1 ring-gray-200 text-gray-900"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">इस नंबर के profiles</h3>
              <button
                className="text-sm text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                onClick={() => { setProfilesModalOpen(false); setSamePhoneProfiles(null); }}
              >
                बंद करें
              </button>
            </div>

            {profilesLoading ? (
              <div className="py-6 text-center text-gray-700">लॉड कर रहे हैं...</div>
            ) : !samePhoneProfiles || samePhoneProfiles.length === 0 ? (
              <div className="py-6 text-center text-gray-600">कोई अन्य प्रोफ़ाइल नहीं मिली</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-auto">
                {samePhoneProfiles.map((p) => (
                  <button
                    key={p.user_id}
                    onClick={() => switchToProfile(p)}
                    className="w-full flex items-center gap-3 p-2 border rounded-lg hover:shadow-sm text-left bg-white text-gray-900"
                  >
                    <img
                      src={p.profile_image_url ?? "/default-avatar.png"}
                      alt={p.name ?? "profile"}
                      className="w-11 h-11 rounded-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.png"; }}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{p.name ?? "नाम उपलब्ध नहीं"}</div>
                      <div className="text-sm text-gray-600">{p.role ?? p.occupation ?? "रोल उपलब्ध नहीं"}</div>
                    </div>
                    <div className="text-sm text-gray-400">खोलें →</div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 text-xs text-gray-500">
              नोट: यहाँ क्लिक करने पर selected profile के रूप में localStorage में सेट होगा और आप redirect हो जाएंगे।
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

        {/* placeholder card */}
        <div className="bg-white rounded-xl p-4 shadow hover:scale-[1.01] transition-transform">
          <div className="text-sm opacity-80">Activity</div>
          <div className="mt-2 text-sm opacity-70">नवीनतम गतिविधियाँ और नोटिफिकेशन जल्द आ रहे हैं</div>
        </div>
      </div>

      {/* Worker Dashboard */}
      {profile.role === "worker" && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">Worker Dashboard <AudioButton text="वर्कर डैशबोर्ड देखें" /></h2>

            {/* --- ADD QUICK ACTION ICONS HERE --- */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/svari")}
                title="Svari — Shared Auto booking"
                className="flex items-center gap-2 bg-black text-white px-3 py-2 rounded-lg shadow hover:opacity-90"
              >
                <FaCar /> <span className="hidden sm:inline">Svari</span>
              </button>

              <button
                onClick={() => router.push("/shop")}
                title="Shop — Buy tools & safety gear"
                className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg shadow hover:opacity-90"
              >
                <FaShoppingCart /> <span className="hidden sm:inline">Shop</span>
              </button>

              <button onClick={() => router.push("/applications")} className="bg-blue-50 border border-blue-200 text-blue-700 py-2 px-3 rounded-lg">मेरे आवेदन 📄</button>
            </div>
            {/* Safety Fund quick link (under action buttons) */}
<div className="mt-2 text-sm">
  <Link href="/safety-terms" className="text-blue-600 underline">
    Read Terms & Conditions — Safety Fund
  </Link>
</div>

          </div>

          <div className="bg-gradient-to-br from-white/80 to-white/60 rounded-xl p-4 shadow">
            <p className="mb-4">⭐ रेटिंग: <span className="font-bold">{myRating ? myRating : "अभी कोई रेटिंग नहीं"}</span></p>

            <h3 className="text-lg font-semibold mb-3">उपलब्ध काम</h3>

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
              <button onClick={() => router.push("/jobs/new")} className="bg-blue-600 text-white py-2 px-3 rounded-lg">नया काम डालें ➕</button>
              <button onClick={() => router.push("/workers")} className="bg-yellow-400 text-white py-2 px-3 rounded-lg">Workers देखें 👥</button>

              <button onClick={() => router.push("/contractor/materials")} className="bg-indigo-600 text-white py-2 px-3 rounded-lg flex items-center gap-2">
                🧱 <span className="hidden sm:inline">Materials</span>
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

                const isCompleted = !!completedApps[app.id] && !!ratingsGiven[app.id];
                const shouldHighlightGreen = !isCompleted && (app.status === "pending" || app.status === "accepted");

                const wageNumber = resolveWageForApp(app, jobObj);
                const wageDisplay = wageNumber != null && wageNumber > 0 ? wageNumber.toFixed(0) : "—";

                const otpsForApp = pendingOtpsMap[app.id] || [];

                return (
                  <div
                    key={app.id}
                    onClick={() => {
                      if (app.worker_id) {
                        router.push(`/workers/${app.worker_id}`);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && app.worker_id) {
                        router.push(`/workers/${app.worker_id}`);
                      }
                    }}
                    className={`cursor-pointer border rounded-xl p-4 shadow-md bg-white ${isCompleted ? "border-red-500" : shouldHighlightGreen ? "border-green-500" : "border-gray-200"} hover:shadow-lg`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-bold">{jobObj?.title ?? "(Job name unavailable)"} <span className="text-sm opacity-70">({jobObj?.location ?? "—"})</span></div>
                        <div className="text-sm opacity-70 mt-1">स्थिति: <span className={`font-semibold ${app.status === 'pending' ? 'text-yellow-600' : app.status === 'accepted' ? 'text-green-600' : 'text-red-600'}`}>{app.status}</span></div>
                        <div className="text-sm opacity-60 mt-1">शिफ्ट: <span className="font-medium">{app.shiftstatus || '—'}</span></div>
                        <div className="text-sm opacity-60 mt-1">वेज: <span className="font-medium">₹{wageDisplay}</span></div>
                        <div className="text-sm opacity-60 mt-1">
                          कटेगा: <span className="font-medium">₹{ parseWage(app.contractor_wage) != null ? parseWage(app.contractor_wage) : "—" }</span>
                        </div>

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
                        {app.status === "pending" && (
                          <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); updateApplication(app.id, "accepted"); }} className="bg-blue-600 text-white py-2 px-3 rounded-lg">स्वीकारें</button>
                            <button onClick={(e) => { e.stopPropagation(); updateApplication(app.id, "rejected"); }} className="bg-red-600 text-white py-2 px-3 rounded-lg">अस्वीकारें</button>
                          </div>
                        )}

                        {app.status === "accepted" && !isCompleted && (
                          <>
                            {workerPhone && (
                              <div className="flex gap-2">
                                <a
                                  onClick={(e) => e.stopPropagation()}
                                  href={`tel:${workerPhone}`}
                                  className="px-3 py-2 rounded-lg bg-green-600 text-white"
                                >
                                  कॉल करें
                                </a>
                                <a
                                  onClick={(e) => e.stopPropagation()}
                                  href={`https://wa.me/${workerPhone.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-2 rounded-lg bg-blue-600 text-white"
                                >
                                  व्हाट्सएप
                                </a>
                              </div>
                            )}

                            <div className="flex flex-col gap-2 w-full mt-2">
                              {app.shiftstatus === "completed" && (
                                <>
                                  {!ratingsGiven[app.id] && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        await rateWorker(app);
                                        const bothDone = !!completedApps[app.id];
                                        if (bothDone) setCompletedApps((p) => ({ ...p, [app.id]: true }));
                                      }}
                                      className="bg-orange-500 text-white py-2 px-3 rounded-lg w-full"
                                    >
                                      Rate Worker ⭐
                                    </button>
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
