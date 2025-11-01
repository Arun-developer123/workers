// File: src/components/RefreshButton.tsx
"use client";


import { useRouter } from "next/navigation";


export default function RefreshButton() {
const router = useRouter();


const handleRefresh = () => {
// Prefer next/navigation's router.refresh (keeps React state and server cache behavior)
if (router && typeof router.refresh === "function") {
router.refresh();
return;
}


// Fallback to full reload
if (typeof window !== "undefined") window.location.reload();
};


return (
<button
onClick={handleRefresh}
className="px-3 py-1 rounded-lg shadow-sm border border-teal-600 bg-teal-500 text-white text-sm hover:opacity-90 transition"
aria-label="Refresh page"
title="Refresh page"
>
Refresh
</button>
);
}