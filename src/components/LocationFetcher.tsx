"use client";

import { useEffect, useState } from "react";

export default function LocationFetcher() {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(
    null
  );

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      (err) => console.error("❌ लोकेशन एरर:", err),
      { enableHighAccuracy: true }
    );
  }, []);

  return (
    <div className="mt-2">
      {location ? (
        <p>📍 आपकी लोकेशन: {location.lat}, {location.lon}</p>
      ) : (
        <p>लोकेशन लोड हो रही है...</p>
      )}
    </div>
  );
}
