"use client";
import { useState, useEffect } from "react";

// Unique ID generator
const generateUniqueId = () =>
  `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

// OTP generator
const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

export default function ContractorDashboard() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [jobs, setJobs] = useState<any[]>([]);
  const [contractor, setContractor] = useState<any>(null);

  useEffect(() => {
    const savedContractor = localStorage.getItem("contractor_profile");
    if (savedContractor) {
      setContractor(JSON.parse(savedContractor));
    } else {
      const demoContractor = {
        id: 1,
        name: "विजय कुमार",
        mobile: "9876501234",
        company: "शिवा कंस्ट्रक्शन",
      };
      localStorage.setItem("contractor_profile", JSON.stringify(demoContractor));
      setContractor(demoContractor);
    }

    const savedJobs = localStorage.getItem("jobs");
    if (savedJobs) setJobs(JSON.parse(savedJobs));
  }, []);

  const saveJobs = (updated: any[]) => {
    setJobs(updated);
    localStorage.setItem("jobs", JSON.stringify(updated));
  };

  const postJob = () => {
    if (!title.trim() || !location.trim()) {
      alert("⚠️ कृपया काम और स्थान भरें 🙏");
      return;
    }

    const newJob = {
      id: generateUniqueId(),
      title: title.trim(),
      location: location.trim(),
      status: "pending",
      postedAt: Date.now(),
      contractorId: contractor?.id,
      otp: null,
      workerId: null,
      rating: null,
    };

    const updated = [...jobs, newJob];
    saveJobs(updated);

    setTitle("");
    setLocation("");
    alert("✅ काम सफलतापूर्वक पोस्ट हो गया");
  };

  // ✅ Assign worker + OTP
  const assignWorker = (jobId: string) => {
    const otp = generateOtp();
    const updated = jobs.map((job) =>
      job.id === jobId
        ? { ...job, otp, status: "otp_sent" }
        : job
    );
    saveJobs(updated);

    localStorage.setItem("pending_otp", JSON.stringify({ jobId, otp }));
    alert(`🔐 OTP भेज दिया गया है: ${otp} (Worker को देना है)`);
  };

  // ✅ Give rating
  const giveRating = (jobId: string, rating: number) => {
    const updated = jobs.map((job) =>
      job.id === jobId ? { ...job, rating, status: "completed" } : job
    );
    saveJobs(updated);

    const workerRatings = JSON.parse(localStorage.getItem("worker_ratings") || "[]");
    workerRatings.push(rating);
    localStorage.setItem("worker_ratings", JSON.stringify(workerRatings));

    alert("⭐ रेटिंग दी गई!");
  };

  return (
    <div className="p-6 bg-gradient-to-br from-green-100 to-emerald-50 min-h-screen">
      {/* Contractor Profile Card */}
      {contractor && (
        <div className="bg-white p-6 rounded-2xl shadow-lg mb-8 border border-gray-200">
          <h2 className="text-3xl font-extrabold text-green-700 mb-3">
            👋 स्वागत है, {contractor.name}
          </h2>
          <p className="text-gray-700">📱 मोबाइल: {contractor.mobile}</p>
          <p className="text-gray-700 mt-1">🏢 कंपनी: {contractor.company}</p>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-6 text-green-700">👨‍💼 ठेकेदार डैशबोर्ड</h2>

      {/* Post Job Form */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-10 border border-gray-200">
        <h3 className="font-semibold mb-4 text-gray-800 text-lg">➕ नया काम डालें</h3>
        <div className="grid gap-4">
          <input
            type="text"
            placeholder="काम का नाम"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border p-3 w-full rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
          />
          <input
            type="text"
            placeholder="स्थान"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border p-3 w-full rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
          />
          <button
            onClick={postJob}
            className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg font-medium transition"
          >
            ✅ काम सेव करें
          </button>
        </div>
      </div>

      {/* Job List */}
      <div>
        <h3 className="font-semibold mb-4 text-gray-800 text-lg">📂 मेरे पोस्ट किए गए काम</h3>
        {jobs.length === 0 ? (
          <p className="text-gray-500 italic">अभी तक कोई काम पोस्ट नहीं हुआ</p>
        ) : (
          <div className="grid gap-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white p-5 rounded-xl shadow-md border hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-lg">{job.title}</p>
                    <p className="text-sm text-gray-600">📍 {job.location}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      स्थिति:{" "}
                      <span
                        className={`font-medium ${
                          job.status === "completed"
                            ? "text-green-600"
                            : job.status === "otp_sent"
                            ? "text-blue-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {job.status}
                      </span>
                    </p>
                  </div>

                  {/* Assign Button */}
                  {job.status === "pending" && (
                    <button
                      onClick={() => assignWorker(job.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                    >
                      ✅ Worker Assign करें
                    </button>
                  )}
                </div>

                {/* Rating Section */}
                {job.status === "verified" && !job.rating && (
                  <div className="mt-3">
                    <p className="mb-2 text-sm font-medium">⭐ रेटिंग दें:</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => giveRating(job.id, star)}
                          className="px-3 py-1 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition text-yellow-600 text-lg"
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {job.rating && (
                  <p className="mt-3 text-gray-700 font-medium">
                    ⭐ दी गई रेटिंग:{" "}
                    <span className="text-yellow-600 font-bold">{job.rating}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
