"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);

  const handleRefresh = async () => {
    console.log("Refresh clicked");
    setLoading(true);

    try {
      // Preferred: router.refresh() (App Router)
      // TypeScript may not know refresh exists on all router shapes, so use any for safety.
      const anyRouter = router as any;
      if (typeof anyRouter.refresh === "function") {
        anyRouter.refresh();
        // small UX delay so spinner is visible
        setTimeout(() => setLoading(false), 350);
        return;
      }

      // fallback: full page reload
      if (typeof window !== "undefined" && typeof window.location?.reload === "function") {
        window.location.reload();
        return;
      }

      // last fallback: replace current URL (client navigation)
      if (typeof window !== "undefined" && typeof anyRouter.replace === "function") {
        const url = `${window.location.pathname}${window.location.search || ""}${window.location.hash || ""}`;
        anyRouter.replace(url);
        setTimeout(() => setLoading(false), 350);
        return;
      }
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      // ensure we stop loading in case of unexpected path
      setLoading(false);
    }
  };

  return (
    <button
      id="refresh-btn"
      onClick={handleRefresh}
      disabled={loading}
      className={`px-3 py-1 rounded-lg shadow-sm border border-teal-600 bg-teal-500 text-white text-sm hover:opacity-90 transition flex items-center gap-2 ${
        loading ? "opacity-70 cursor-wait" : ""
      }`}
      aria-label="Refresh page"
      title="Refresh page"
    >
      {loading ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 100 24 12 12 0 010-24z"
              className="opacity-75"
            />
          </svg>
          Refreshing…
        </>
      ) : (
        "Refresh"
      )}
    </button>
  );
}
