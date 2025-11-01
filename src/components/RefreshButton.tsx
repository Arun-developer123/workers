// File: src/components/RefreshButton.tsx
"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function RefreshButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    try {
      setLoading(true);

      // 1) Preferred: use router.refresh() if available (revalidates server components)
      if (router && typeof (router as any).refresh === "function") {
        (router as any).refresh();
        // allow UI to show loading briefly; router.refresh is synchronous (schedules revalidation)
        setTimeout(() => setLoading(false), 350);
        return;
      }

      // 2) Fallback: standard full page reload (works in all environments)
      if (typeof window !== "undefined" && typeof window.location?.reload === "function") {
        window.location.reload();
        return;
      }

      // 3) Another fallback: router.replace to same path (doesn't add history entry)
      const sp = searchParams ? (searchParams.toString() ? `?${searchParams.toString()}` : "") : "";
      const url = `${pathname ?? "/"}${sp}`;
      if (router && typeof router.replace === "function") {
        // replace to avoid creating new history entry
        router.replace(url);
        setTimeout(() => setLoading(false), 350);
        return;
      }
    } catch (err) {
      // if something goes wrong, ensure loading state cleared
      console.error("Refresh failed:", err);
      setLoading(false);
    }
  };

  return (
    <button
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
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 100 24 12 12 0 010-24z"
            ></path>
          </svg>
          Refreshing…
        </>
      ) : (
        "Refresh"
      )}
    </button>
  );
}
