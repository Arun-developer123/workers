// File: src/components/RefreshButton.tsx
"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function RefreshButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<boolean>(false);

  const handleRefresh = async () => {
    setLoading(true);

    try {
      // create a typed view of router without using `any`
      const maybeRouter = router as unknown as {
        refresh?: unknown;
        replace?: unknown;
      };

      // 1) If router.refresh exists, use it (revalidates server components)
      if (typeof maybeRouter.refresh === "function") {
        (maybeRouter.refresh as () => void)();
        // show loading briefly for UX
        setTimeout(() => setLoading(false), 350);
        return;
      }

      // 2) Fallback: full page reload
      if (typeof window !== "undefined" && typeof window.location?.reload === "function") {
        window.location.reload();
        return;
      }

      // 3) Fallback: router.replace to same URL (no new history entry)
      const sp = searchParams ? (searchParams.toString() ? `?${searchParams.toString()}` : "") : "";
      const url = `${pathname ?? "/"}${sp}`;

      if (typeof maybeRouter.replace === "function") {
        (maybeRouter.replace as (url: string) => void)(url);
        setTimeout(() => setLoading(false), 350);
        return;
      }
    } catch (err) {
      // log and continue — ensure loading cleared
      // eslint-disable-next-line no-console
      console.error("Refresh failed:", err);
    } finally {
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
