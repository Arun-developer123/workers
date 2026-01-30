"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AudioButton from "@/components/AudioButton";
import { FaShoppingCart, FaCar } from "react-icons/fa";
import Link from "next/link";
import ThreeDotsMenu from "@/components/ThreeDotsMenu";

// ===== Razorpay types (no `any`) =====
interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOrder {
  id: string;
  amount: number;
  currency?: string;
}

interface RazorpayOptions {
  key: string;
  amount?: number;
  currency?: string;
  name?: string;
  description?: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  handler: (response: RazorpayPaymentResponse) => void | Promise<void>;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

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

  // operation-level loading maps
  const [opApplying, setOpApplying] = useState<{ [jobId: string]: boolean }>({});
  const [opUpdatingApp, setOpUpdatingApp] = useState<{ [appId: string]: boolean }>({});
  const [opStartShift, setOpStartShift] = useState<{ [appId: string]: boolean }>({});
  const [opEndShift, setOpEndShift] = useState<{ [appId: string]: boolean }>({});

  const router = useRouter();
  const mountedRef = useRef(true);

  useEffect(() => {
    // mounted guard
    mountedRef.current = true;
    try {
      const storedProfile = typeof window !== "undefined" ? localStorage.getItem("fake_user_profile") : null;
      if (!storedProfile) {
        router.push("/auth/sign-in");
        return;
      }

      const parsedProfile: Profile | null = safeParseProfile(storedProfile);
      if (!parsedProfile) {
        // invalid data -> redirect to sign in
        localStorage.removeItem("fake_user_profile");
        router.push("/auth/sign-in");
        return;
      }

      setProfile(parsedProfile);

      // fetch profile image from DB (if available)
      fetchProfileImage(parsedProfile.user_id).catch((e) => {
        console.warn("fetchProfileImage failed", e);
      });

      // fetch common data for both roles
      fetchMyRating(parsedProfile.user_id).catch((e) => console.warn(e));

      if (parsedProfile.role === "worker") {
        fetchJobs().catch((e) => console.warn(e)); // worker: uses shift_logs to filter available jobs
      } else if (parsedProfile.role === "contractor") {
        fetchContractorData(parsedProfile.user_id).catch((e) => console.warn(e));
        fetchJobsForContractor(parsedProfile.user_id).catch((e) => console.warn(e));
      }
    } catch (err) {
      console.error("initialization error", err);
      router.push("/auth/sign-in");
    }

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // safe parser to avoid throwing
  function safeParseProfile(raw: string): Profile | null {
    try {
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object" || !("user_id" in obj)) return null;
      return obj as Profile;
    } catch (e) {
      return null;
    }
  }

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
          const typed = profRow as { phone?: string } | null;
          phoneToQuery = typed?.phone;
        }
      }

      if (!phoneToQuery) {
        alert("इस प्रोफ़ाइल का फोन नंबर उपलब्ध नहीं है।");
        return;
      }

      setProfilesLoading(true);
      const { data, error } = await supabase.from("profiles").select("*").eq("phone", phoneToQuery);

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
    try {
      localStorage.setItem("fake_user_profile", JSON.stringify(p));
    } catch (e) {
      console.warn("localStorage set failed", e);
    }

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
    if (!userId) return;
    try {
      const { data, error } = await supabase.from("profiles").select("profile_image_url").eq("user_id", userId).single();
      if (error) {
        // not fatal — keep default
        return;
      }
      const profileRow = data as { profile_image_url?: string } | null;
      const img = profileRow?.profile_image_url ?? null;
      if (mountedRef.current) setProfileImageUrl(img);
    } catch (err) {
      console.warn("fetchProfileImage unexpected", err);
    }
  };

  // Worker → Available Jobs (all jobs) BUT: filter out jobs that have only completed shifts (i.e. existed shift_logs and none ongoing)
  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });

      if (error) {
        console.error("fetchJobs error", error);
        if (mountedRef.current) setJobs([]);
        return;
      }

      const allJobs = (data as Job[]) || [];

      // if no jobs, quick return
      if (allJobs.length === 0) {
        if (mountedRef.current) setJobs([]);
        return;
      }

      // collect job ids and query shift_logs to decide availability
      const jobIds = allJobs.map((j) => j.id).filter(Boolean);

      // fetch shift_logs for these jobs
      const { data: shiftsData, error: shiftsErr } = await supabase.from("shift_logs").select("job_id, status").in("job_id", jobIds);

      if (shiftsErr) {
        // if shift fetch failed, fallback to showing all jobs (safer)
        console.error("fetch shift_logs error", shiftsErr);
        if (mountedRef.current) setJobs(allJobs);
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

      if (mountedRef.current) setJobs(filtered);
    } catch (err) {
      console.error("fetchJobs unexpected", err);
      if (mountedRef.current) setJobs([]);
    }
  };

  // Contractor → fetch jobs posted by contractor (contractor should still see their jobs even if completed; keep original behavior)
  const fetchJobsForContractor = async (userId: string) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.from("jobs").select("*").eq("contractor_id", userId).order("created_at", { ascending: false });
      if (error) {
        console.error("fetchJobsForContractor error", error);
        if (mountedRef.current) setJobs([]);
        return;
      }
      if (mountedRef.current) setJobs((data as Job[]) || []);
    } catch (err) {
      console.error("fetchJobsForContractor unexpected", err);
      if (mountedRef.current) setJobs([]);
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
    if (!userId) return;
    try {
      const { data: apps, error } = await supabase
        .from("applications")
        .select("id, worker_id, contractor_id, job_id, status, offered_wage, contractor_wage, jobs(title, location, wage, contractor_id, description)")
        .eq("contractor_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("fetchContractorData error", error);
        if (mountedRef.current) setApplications([]);
        return;
      }

      if (!apps) {
        if (mountedRef.current) setApplications([]);
        return;
      }

      const applicationsData = apps as Application[];

      // worker profiles
      const workerIds = Array.from(new Set(applicationsData.map((a) => a.worker_id)));
      const mapPhone: { [key: string]: string } = {};
      const mapWage: { [key: string]: number | null } = {};
      if (workerIds.length > 0) {
        const { data: workersData, error: workersErr } = await supabase.from("profiles").select("user_id, phone, wage").in("user_id", workerIds);

        if (workersErr) {
          console.error("fetch worker profiles error", workersErr);
        }

        ((workersData as WorkerProfile[]) || []).forEach((w) => {
          if (w.user_id) mapPhone[w.user_id] = w.phone || "";
          const wnum = parseWage(w?.wage);
          mapWage[w.user_id] = wnum;
        });

        if (mountedRef.current) {
          setWorkersMap(mapPhone);
          setWorkerWageMap(mapWage);
        }
      } else {
        if (mountedRef.current) {
          setWorkersMap({});
          setWorkerWageMap({});
        }
      }

      // fetch jobs by ids
      const jobIds = Array.from(new Set(applicationsData.map((a) => a.job_id).filter(Boolean)));
      const jobsDataById: { [key: string]: Job } = {};
      if (jobIds.length > 0) {
        const { data: jobsData, error: jobsErr } = await supabase.from("jobs").select("*").in("id", jobIds);

        if (jobsErr) {
          console.error("fetch jobs by ids error", jobsErr);
        } else {
          ((jobsData as Job[]) || []).forEach((j) => {
            const wageNum = parseWage(j.wage);
            jobsDataById[j.id] = { ...(j as Job), wage: wageNum } as Job;
          });
        }
      }

      // fetch shift_logs
      let shifts: ShiftLog[] | null = null;
      if (jobIds.length > 0) {
        const { data: shiftsData } = await supabase.from("shift_logs").select("worker_id, contractor_id, job_id, status, id").in("job_id", jobIds);
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

      if (mountedRef.current) setApplications(filteredMerged);

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
        if (mountedRef.current) setPendingOtpsMap({});
        return;
      }

      const otps = (otpsData || []) as OtpRow[];
      const mapByApp: { [applicationId: string]: OtpRow[] } = {};
      otps.forEach((o) => {
        if (!mapByApp[o.application_id]) mapByApp[o.application_id] = [];
        mapByApp[o.application_id].push(o);
      });
      if (mountedRef.current) setPendingOtpsMap(mapByApp);
    } catch (err) {
      console.error("fetchContractorData unexpected", err);
      if (mountedRef.current) {
        setApplications([]);
        setPendingOtpsMap({});
      }
    }
  };

  // Worker → Apply Job
  const applyJob = async (jobId: string) => {
    if (!profile) return alert("प्रोफ़ाइल लोड नहीं हुई। फिर से साइन-इन करें।");
    try {
      const contractorId = jobs.find((j) => j.id === jobId)?.contractor_id;
      if (!contractorId) return alert("❌ Contractor ID नहीं मिली");

      const wageStr = prompt("आप इस काम के लिए कितना वेतन मांगते हैं? (₹) — सिर्फ़ नंबर दर्ज करें:");
      if (!wageStr) return;
      const wageNum = Number(wageStr);
      if (isNaN(wageNum) || wageNum <= 0) return alert("कृपया वैध संख्या दर्ज करें");

      // mark applying
      setOpApplying((p) => ({ ...p, [jobId]: true }));

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
        if (profile?.role === "worker") fetchJobs().catch(() => {});
        if (profile?.role === "contractor" && profile.user_id) fetchContractorData(profile.user_id).catch(() => {});
      }
    } catch (err) {
      console.error("applyJob unexpected", err);
      alert("कुछ गलत हुआ — बाद में कोशिश करें");
    } finally {
      setOpApplying((p) => ({ ...p, [jobId]: false }));
    }
  };

  // Contractor → Accept/Reject (NO payment RPCs)
  const updateApplication = async (appId: string, status: "accepted" | "rejected") => {
    setOpUpdatingApp((p) => ({ ...p, [appId]: true }));
    try {
      const { error } = await supabase.from("applications").update({ status }).eq("id", appId);
      if (error) {
        console.error("update applications error", error);
        return alert("❌ आवेदन अपडेट करने में समस्या");
      }

      setApplications((prev) => prev.map((x) => (x.id === appId ? { ...x, status } : x)));
      if (profile?.user_id) {
        fetchContractorData(profile.user_id).catch(() => {});
      }

      alert(status === "accepted" ? "✅ आवेदन स्वीकार कर दिया गया" : "✅ आवेदन अस्वीकृत कर दिया गया");
    } catch (err) {
      console.error("updateApplication unexpected", err);
      alert("❌ आवेदन अपडेट में समस्या आई");
    } finally {
      setOpUpdatingApp((p) => ({ ...p, [appId]: false }));
    }
  };

  // ---------- Razorpay payment helpers (frontend) ----------
  async function loadRazorpaySdk(): Promise<void> {
    if (typeof window === "undefined") return;
    if (window.Razorpay) return;
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Razorpay SDK load failed"));
      document.body.appendChild(script);
    });
  }

  // type-guard to detect { error: ... } objects safely (no `any`)
  const isErrorObject = (v: unknown): v is { error: unknown } =>
    typeof v === "object" && v !== null && "error" in v;

  /**
   * Start payment flow for contractor accepting an application.
   * - fetches order from server
   * - opens Razorpay checkout
   * - on success calls verify endpoint
   */
  async function startPaymentForApplication(app: Application) {
    if (!app || !app.id) return alert("Invalid application");
    try {
      // compute amount from contractor_wage OR resolveWageForApp fallback
      const contractorWage = parseWage(app.contractor_wage) ?? resolveWageForApp(app);
      if (contractorWage == null || contractorWage <= 0) {
        return alert("Contractor wage invalid for payment");
      }

      // start spinner for this app
      setOpUpdatingApp((p) => ({ ...p, [app.id]: true }));

      // 1) create order on server
      const createResp = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: app.id, amount: contractorWage }),
      });

      const createJson = (await createResp.json()) as { order?: RazorpayOrder; keyId?: string } | null;
      if (!createResp.ok || !createJson || !createJson.order) {
        console.error("create order failed", createJson);
        alert("Order बनाते समय त्रुटि आई");
        setOpUpdatingApp((p) => ({ ...p, [app.id]: false }));
        return;
      }

      const { order } = createJson;
      const keyId = createJson.keyId ?? "";

      // 2) load SDK
      await loadRazorpaySdk();

      // Ensure Razorpay exists
      if (!window.Razorpay) {
        throw new Error("Razorpay SDK not available after load");
      }

      // 3) open checkout
      const options: RazorpayOptions = {
        key: keyId,
        amount: order.amount, // paise
        currency: order.currency ?? "INR",
        name: "Your App Name",
        description: `Payment for application ${app.id}`,
        order_id: order.id,
        prefill: {
          name: profile?.name ?? "",
        },
        handler: async function (response: RazorpayPaymentResponse) {
          // response contains: razorpay_payment_id, razorpay_order_id, razorpay_signature
          try {
            const verifyResp = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                applicationId: app.id,
                amount: contractorWage,
              }),
            });

            const verifyJson = await verifyResp.json();

            // use type-guard instead of `any`
            if (!verifyResp.ok || (verifyJson && isErrorObject(verifyJson))) {
              console.error("verify failed", verifyJson);
              alert("Payment verify में समस्या — console देखें");
              setOpUpdatingApp((p) => ({ ...p, [app.id]: false }));
              return;
            }

            alert("✅ Payment successful और Application accepted");
            // refresh data
            if (profile?.user_id) fetchContractorData(profile.user_id).catch(() => {});
          } catch (err) {
            console.error("post-verify error", err);
            alert("Payment के बाद सर्वर में verify करते समय त्रुटि आई");
          } finally {
            setOpUpdatingApp((p) => ({ ...p, [app.id]: false }));
          }
        },
        modal: {
          ondismiss: function () {
            // user closed checkout
            setOpUpdatingApp((p) => ({ ...p, [app.id]: false }));
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("startPaymentForApplication error", err);
      alert("Payment शुरू करने में समस्या");
      setOpUpdatingApp((p) => ({ ...p, [app.id]: false }));
    }
  }

  // ---------- Helper: compute displayed (contractor) wage ----------
  const computeDisplayedWage = (raw: string | number | null | undefined) => {
    const base = parseWage(raw);
    if (base == null || isNaN(base) || base <= 0) return 0;
    const marked = base * 1.1; // +10%
    const roundedUp50 = Math.ceil(marked / 50) * 50;
    return roundedUp50;
  };

  // Worker → Start Shift (only shift log + OTP flows)
  const startShift = async (app: Application) => {
    if (!app || !app.id) return;
    if (app.status !== "accepted") {
      alert("❌ शिफ्ट शुरू करने से पहले आवेदन को स्वीकार होना चाहिए");
      return;
    }

    setOpStartShift((p) => ({ ...p, [app.id]: true }));
    try {
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
      fetchContractorData(app.contractor_id).catch(() => {});
      if (profile?.role === "worker") fetchJobs().catch(() => {});
    } catch (err) {
      console.error("startShift unexpected", err);
      alert("❌ शिफ्ट शुरू करने में समस्या");
    } finally {
      setOpStartShift((p) => ({ ...p, [app.id]: false }));
    }
  };

  // Worker → End Shift (contractor side helper) — no payment logic here
  const endShift = async (app: Application) => {
    if (!app || !app.id) return;
    setOpEndShift((p) => ({ ...p, [app.id]: true }));
    try {
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
      fetchContractorData(app.contractor_id).catch(() => {});
      if (profile?.role === "worker") fetchJobs().catch(() => {});
    } catch (err) {
      console.error(err);
      alert("❌ शिफ्ट समाप्त करने में समस्या");
    } finally {
      setOpEndShift((p) => ({ ...p, [app.id]: false }));
    }
  };

  // Contractor → Rate Worker
  const rateWorker = async (app: Application) => {
    const ratingStr = prompt("⭐ Worker को रेट करें (1-5):");
    if (!ratingStr) return;
    const rating = Number(ratingStr);
    if (isNaN(rating) || rating < 1 || rating > 5) return alert("कृपया 1 से 5 के बीच एक वैध रेटिंग दें");
    const review = prompt("✍ Review लिखें (optional):");

    try {
      const { error } = await supabase.from("ratings").insert({
        rater_id: profile?.user_id,
        rated_id: app.worker_id,
        job_id: app.job_id,
        rating: rating,
        review: review || "",
      });

      if (error) {
        alert("❌ Rating save नहीं हुई");
      } else {
        alert("✅ Rating save हो गई");
        setRatingsGiven((p) => ({ ...p, [app.id]: true }));
        setCompletedApps((prev) => ({ ...prev, [app.id]: !!prev[app.id] || true }));
      }
    } catch (err) {
      console.error("rateWorker error", err);
      alert("❌ Rating save में समस्या");
    }
  };

  // Fetch average rating for a user (works for both worker & contractor)
  const fetchMyRating = async (userId: string) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.from("ratings").select("rating").eq("rated_id", userId);
      if (error) {
        console.error("fetchMyRating error", error);
        if (mountedRef.current) setMyRating(null);
        return;
      }
      if (!data || data.length === 0) {
        if (mountedRef.current) setMyRating(null);
        return;
      }
      const avg = (data as { rating: number }[]).reduce((sum, r) => sum + (r.rating || 0), 0) / data.length;
      if (mountedRef.current) setMyRating(Number(avg.toFixed(1)));
    } catch (err) {
      console.error("fetchMyRating unexpected", err);
      if (mountedRef.current) setMyRating(null);
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

      {/* ===== Join Safety Fund (glowing CTA) — केवल Worker के लिए ===== */}
      {profile?.role === "worker" && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => router.push("/safety-fund-details")}
            className="inline-flex items-center gap-3 px-5 py-3 rounded-full text-sm font-semibold
                   bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-lg
                   ring-4 ring-amber-300/30 hover:scale-[1.02] transform transition
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400"
            aria-label="Join Safety Fund"
          >
            <svg className="w-5 h-5 -ml-1" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 2v20" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M5 12h14" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Join Safety Fund — ₹20 / month
            <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">Voluntary</span>
          </button>
        </div>
      )}

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
          {/* ---------- Role-specific bottom nav (mobile) ---------- */}
          {profile.role === "worker" ? (
            <nav
              aria-label="Worker Primary"
              className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-[min(980px,94%)] max-w-2xl
                 bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg p-2 flex items-center justify-between md:hidden"
            >
              <button
                type="button"
                onClick={() => router.push("/svari")}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 focus:outline-none"
                aria-label="Svari"
              >
                <FaCar className="w-5 h-5" />
                <span className="text-sm font-medium">Svari</span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/shop")}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 focus:outline-none"
                aria-label="Shop"
              >
                <FaShoppingCart className="w-5 h-5" />
                <span className="text-sm font-medium">Shop</span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/applications")}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 focus:outline-none"
                aria-label="My applications"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                <span className="text-sm font-medium">Applications</span>
              </button>
            </nav>
          ) : (
            /* contractor mobile nav */
            <nav
              aria-label="Contractor Primary"
              className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-[min(980px,94%)] max-w-2xl
                 bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg p-2 flex items-center justify-between md:hidden"
            >
              <button
                type="button"
                onClick={() => router.push("/jobs/new")}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 focus:outline-none"
              >
                <span className="text-sm font-medium">नया काम डालें ➕</span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/workers")}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 focus:outline-none"
              >
                <span className="text-sm font-medium">Workers देखें 👥</span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/contractor/materials")}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 focus:outline-none"
              >
                <span className="text-sm font-medium">🧱 Materials</span>
              </button>
            </nav>
          )}

          {/* ---------- Role-specific floating cluster (desktop) ---------- */}
          {profile.role === "worker" ? (
            <div className="hidden md:flex fixed right-6 bottom-8 z-40 flex-col gap-3">
              <button
                type="button"
                onClick={() => router.push("/svari")}
                className="bg-white p-3 rounded-full shadow hover:scale-[1.03] transition transform"
                aria-label="Svari"
              >
                <FaCar className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => router.push("/shop")}
                className="bg-white p-3 rounded-full shadow hover:scale-[1.03] transition transform"
                aria-label="Shop"
              >
                <FaShoppingCart className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => router.push("/applications")}
                className="bg-white p-3 rounded-full shadow hover:scale-[1.03] transition transform"
                aria-label="Applications"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="hidden md:flex fixed right-6 bottom-8 z-40 flex-col gap-3">
              <button
                type="button"
                onClick={() => router.push("/jobs/new")}
                className="bg-white p-3 rounded-full shadow hover:scale-[1.03] transition transform"
              >
                <span className="sr-only">नया काम डालें</span>
                <div className="text-sm font-medium">➕</div>
              </button>

              <button
                type="button"
                onClick={() => router.push("/workers")}
                className="bg-white p-3 rounded-full shadow hover:scale-[1.03] transition transform"
              >
                <span className="sr-only">Workers देखें</span>
                <div className="text-sm font-medium">👥</div>
              </button>

              <button
                type="button"
                onClick={() => router.push("/contractor/materials")}
                className="bg-white p-3 rounded-full shadow hover:scale-[1.03] transition transform"
              >
                <span className="sr-only">Materials</span>
                <div className="text-sm font-medium">🧱</div>
              </button>
            </div>
          )}
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

            {/* compact placeholder (actions moved to bottom navbar) */}
            <ThreeDotsMenu profileRole={profile.role} profile={profile} />

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
                        <button onClick={() => applyJob(job.id)} disabled={!!opApplying[job.id]} className="bg-gradient-to-r from-green-500 to-lime-500 text-white py-2 px-4 rounded-lg font-semibold">
                          {opApplying[job.id] ? "Applying..." : "आवेदन करें ✅"}
                        </button>
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
            {/* actions moved to bottom navbar */}
            <ThreeDotsMenu profileRole={profile.role} profile={profile} />


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
                            {/* REPLACED: Accept now triggers payment flow */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // start payment flow which will update application -> accepted after verification
                                startPaymentForApplication(app);
                              }}
                              disabled={!!opUpdatingApp[app.id]}
                              className="bg-blue-600 text-white py-2 px-3 rounded-lg"
                            >
                              {opUpdatingApp[app.id] ? 'Processing...' : 'स्वीकारें'}
                            </button>

                            <button onClick={(e) => { e.stopPropagation(); updateApplication(app.id, "rejected"); }} disabled={!!opUpdatingApp[app.id]} className="bg-red-600 text-white py-2 px-3 rounded-lg">{opUpdatingApp[app.id] ? 'Processing...' : 'अस्वीकारें'}</button>
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
