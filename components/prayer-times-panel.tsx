"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PrayerTimings } from "@/types/api";

interface PrayerTimesPanelProps {
  tripId: string;
  defaultDate: string;
  hasLocations: boolean;
}

export default function PrayerTimesPanel({
  tripId,
  defaultDate,
  hasLocations,
}: PrayerTimesPanelProps) {
  const [date, setDate] = useState(defaultDate);
  const [data, setData] = useState<PrayerTimings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasLocations) return;

    setLoading(true);
    setError(null);
    api
      .getPrayerTimes(tripId, date)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load prayer times"))
      .finally(() => setLoading(false));
  }, [tripId, date, hasLocations]);

  if (!hasLocations) {
    return (
      <p className="text-gray-500">
        Add at least one trip location to view localized prayer times.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 rounded-lg p-2"
        />
      </div>

      {loading && <p className="text-gray-500">Loading prayer times...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {data && !loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(data.timings).map(([name, time]) => (
            <div key={name} className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm text-emerald-700">{name}</p>
              <p className="text-2xl font-semibold text-emerald-900">{time}</p>
            </div>
          ))}
        </div>
      )}

      {data && (
        <p className="text-sm text-gray-500">
          Times shown for {data.date} ({data.timezone}). Source: Aladhan API (calculation method 2).
        </p>
      )}
    </div>
  );
}
