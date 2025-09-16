"use client";
import { useState, useEffect } from "react";

// Unique ID generator
const generateUniqueId = () =>
  `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

// Type definitions
type Worker = {
  id: string;
  name: string;
  mobile: string;
  skills: string[];
};

type JobStatus = "pending" | "otp_pending" | "otp_sent" | "verified" | "completed";

type Job = {
  id: string;
  title: string;
  location: string;
  status: JobStatus;
  postedAt?: number;
  contractorId?: number;
  contractorMobile?: string;
  otp?: string | null;
  workerId?: string | null;
  uniqueId?: string;
  rating?: number | null;
  acceptedAt?: number;
};

export default function WorkerDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [otpInput, setOtpInput] = useState<string>("");

  // ✅ localStorage ko useEffect ke andar hi access kar rahe hain
  useEffect(() => {
    if (typeof window === "undefined") return; // SSR me skip

    const savedWorker = localStorage.getItem("worker_profile");
    if (savedWorker) {
      setWorker(JSON.parse(savedWorker) as Worker);
    } else {
      const demoWorker: Worker = {
        id: "demo-1",
        name: "रामेश्वर",
        mobile: "9876543210",
        skills: ["मिस्त्री", "प्लम्बर"],
      };
      localStorage.setItem("worker_profile", JSON.stringify(demoWorker));
      setWorker(demoWorker);
    }

    const savedJobs = localStorage.getItem("jobs");
    if (savedJobs) setJobs(JSON.parse(savedJobs) as Job[]);

    const savedMyJobs = localStorage.getItem("my_jobs");
    if (savedMyJobs) setMyJobs(JSON.parse(savedMyJobs) as Job[]);
  }, []);

  const acceptJob = (job: Job) => {
    if (!worker) return;

    const jobWithStatus: Job = {
      ...job,
      status: "otp_pending",
      acceptedAt: Date.now(),
      uniqueId: generateUniqueId(),
      workerId: worker.id,
    };

    setMyJobs((prev) => {
      const updated = [...prev, jobWithStatus];
      if (typeof window !== "undefined") {
        localStorage.setItem("my_jobs", JSON.stringify(updated));
      }
      return updated;
    });

    alert("✅ आपने काम स्वीकार कर लिया (OTP का इंतज़ार करें)");
  };

  const verifyOtp = (jobId: string) => {
    if (typeof window === "undefined") return; // SSR me skip

    const pendingOtp = JSON.parse(localStorage.getItem("pending_otp") || "{}") as { jobId?: string; otp?: string };
    if (pendingOtp.jobId === jobId && pendingOtp.otp === otpInput) {
      const updated = myJobs.map((job) =>
        job.uniqueId === jobId ? { ...job, status: "verified" as JobStatus } : job
      );
      setMyJobs(updated);
      localStorage.setItem("my_jobs", JSON.stringify(updated));

      const allJobs = JSON.parse(localStorage.getItem("jobs") || "[]") as Job[];
      const updatedJobs = allJobs.map((job) =>
        job.id === jobId ? { ...job, status: "verified" as JobStatus } : job
      );
      localStorage.setItem("jobs", JSON.stringify(updatedJobs));

      alert("✅ OTP सही है! काम कन्फर्म हो गया");
      localStorage.removeItem("pending_otp");
      setOtpInput("");
    } else {
      alert("❌ गलत OTP!");
    }
  };

  const ratings =
    typeof window !== "undefined"
      ? (JSON.parse(localStorage.getItem("worker_ratings") || "[]") as number[])
      : [];
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : "N/A";

  return (
    <div className="p-6 bg-gradient-to-br from-orange-100 to-yellow-50 min-h-screen">
      {/* Profile Card */}
      {worker && (
        <div className="bg-white p-6 rounded-2xl shadow-lg mb-8 border border-gray-200">
          <h2 className="text-3xl font-extrabold text-orange-700 mb-3">
            👋 नमस्ते, {worker.name}
          </h2>
          <p className="text-gray-700">📱 मोबाइल: {worker.mobile}</p>
          <p className="text-gray-700">🛠️ स्किल्स: {worker.skills.join(", ")}</p>
          <p className="mt-2 font-medium text-gray-800">
            ⭐ औसत रेटिंग:{" "}
            <span className="text-yellow-600 font-bold">{avgRating}</span>
          </p>
        </div>
      )}

      {/* Available Jobs Section */}
      <div className="mb-10">
        <h3 className="text-xl font-bold text-gray-800 mb-4">🆕 उपलब्ध काम</h3>
        {jobs.length === 0 ? (
          <p className="text-gray-500 italic">अभी कोई काम उपलब्ध नहीं है</p>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white p-5 rounded-xl shadow-md border hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">{job.title}</p>
                    <p className="text-sm text-gray-600">📍 {job.location}</p>
                  </div>
                  <button
                    onClick={() => acceptJob(job)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    काम करना है
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Jobs Section */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4">📋 मेरे चालू काम</h3>
        {myJobs.length === 0 ? (
          <p className="text-gray-500 italic">आपने अभी तक कोई काम नहीं लिया</p>
        ) : (
          <div className="grid gap-4">
            {myJobs.map((job) => (
              <div
                key={job.uniqueId}
                className="bg-white p-5 rounded-xl shadow-md border hover:shadow-lg transition-all"
              >
                <p className="font-semibold text-lg">
                  {job.title} - 📍 {job.location}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  स्थिति:{" "}
                  <span
                    className={`font-medium ${
                      job.status === "verified"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {job.status}
                  </span>
                </p>

                {/* OTP Verification */}
                {job.status === "otp_pending" && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      placeholder="OTP डालें"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="border p-2 rounded-lg flex-1"
                    />
                    <button
                      onClick={() => verifyOtp(job.uniqueId || job.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition"
                    >
                      ✅ Verify
                    </button>
                  </div>
                )}

                {/* Contact Buttons */}
                <div className="mt-4 flex gap-3">
                  <a
                    href={`tel:${job.contractorMobile || "9999999999"}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition"
                  >
                    📞 कॉल
                  </a>
                  <a
                    href={`https://wa.me/${job.contractorMobile || "9999999999"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
