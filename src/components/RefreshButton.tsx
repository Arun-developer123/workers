// src/components/RefreshButton.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

/** Minimal router interface we rely on (no `any`) */
type MinimalRouter = {
  refresh?: () => void;
  replace?: (url: string) => void;
};

export default function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);

  const handleRefresh = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // debug: visible in console to confirm handler runs
    // eslint-disable-next-line no-console
    console.log("Refresh clicked (handler start)", { time: Date.now() });
    setLoading(true);

    try {
      const maybeRouter = router as unknown as MinimalRouter;

      // Preferred: app-router refresh (revalidates server components)
      if (typeof maybeRouter.refresh === "function") {
        try {
          maybeRouter.refresh!();
          setTimeout(() => setLoading(false), 350);
          // eslint-disable-next-line no-console
          console.log("router.refresh() called");
          return;
        } catch (err: unknown) {
          // eslint-disable-next-line no-console
          console.warn("router.refresh() threw, falling back to reload:", err);
        }
      }

      // Fallback: full page reload, most reliable
      if (typeof window !== "undefined" && typeof window.location?.reload === "function") {
        // eslint-disable-next-line no-console
        console.log("Falling back to window.location.reload()");
        window.location.reload();
        return;
      }

      // Final fallback: router.replace if available
      if (typeof maybeRouter.replace === "function" && typeof window !== "undefined") {
        const url = `${window.location.pathname}${window.location.search || ""}${window.location.hash || ""}`;
        maybeRouter.replace!(url);
        setTimeout(() => setLoading(false), 350);
        // eslint-disable-next-line no-console
        console.log("router.replace() fallback used:", url);
        return;
      }

      // Nothing worked
      // eslint-disable-next-line no-console
      console.error("No refresh method available");
      alert("Refresh not supported in this environment — try reloading the page manually.");
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("Unexpected error in refresh handler:", err);
      alert("Refresh failed (check console).");
    } finally {
      // ensure loading cleared unless a full reload happened
      setLoading(false);
    }
  };

  return (
    <button
      id="refresh-btn"
      onClick={handleRefresh}
      disabled={loading}
      aria-label="Refresh page"
      title="Refresh page"
      style={{
        zIndex: 9999,
        pointerEvents: loading ? "none" : "auto",
      }}
      className={`px-3 py-1 rounded-lg shadow-sm border border-teal-600 bg-teal-500 text-white text-sm hover:opacity-90 transition flex items-center gap-2 ${
        loading ? "opacity-70 cursor-wait" : ""
      }`}
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
