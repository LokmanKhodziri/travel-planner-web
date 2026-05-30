"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PrayerConflict } from "@/types/api";

interface ConflictAlertsProps {
  tripId: string;
  defaultDate: string;
  hasLocations: boolean;
}

export default function ConflictAlerts({
  tripId,
  defaultDate,
  hasLocations,
}: ConflictAlertsProps) {
  const [date, setDate] = useState(defaultDate);
  const [conflicts, setConflicts] = useState<PrayerConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasLocations) return;

    setLoading(true);
    setError(null);
    api
      .getConflicts(tripId, date)
      .then(setConflicts)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to check conflicts"))
      .finally(() => setLoading(false));
  }, [tripId, date, hasLocations]);

  if (!hasLocations) {
    return (
      <p className="text-gray-500">
        Add locations and timed activities to check for prayer schedule conflicts.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Check date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-gray-300 rounded-lg p-2"
        />
      </div>

      {loading && <p className="text-gray-500">Checking schedule against prayer times...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && conflicts.length === 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          No prayer conflicts detected for this date.
        </div>
      )}

      {!loading && conflicts.length > 0 && (
        <ul className="space-y-3">
          {conflicts.map((conflict, index) => (
            <li
              key={`${conflict.activityId}-${conflict.prayerName}-${index}`}
              className="rounded-lg border border-amber-200 bg-amber-50 p-4"
            >
              <p className="font-semibold text-amber-900">Schedule conflict</p>
              <p className="text-sm text-amber-800 mt-1">{conflict.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
