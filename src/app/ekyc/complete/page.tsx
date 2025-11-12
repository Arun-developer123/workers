import React, { Suspense } from "react";
import CompleteClient from "./CompleteClient";

export default function EkycCompletePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <CompleteClient />
    </Suspense>
  );
}
