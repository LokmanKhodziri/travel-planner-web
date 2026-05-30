"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ApiActivity } from "@/types/api";
import { Button } from "./ui/button";

interface ItineraryActivitiesProps {
  tripId: string;
}

export default function ItineraryActivities({ tripId }: ItineraryActivitiesProps) {
  const [activities, setActivities] = useState<ApiActivity[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = () => {
    setLoading(true);
    api
      .getActivities(tripId)
      .then(setActivities)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load activities"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadActivities();
  }, [tripId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !startTime || !endTime) return;

    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createActivity(tripId, {
        title,
        description: description || undefined,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      setActivities((prev) => [...prev, created].sort((a, b) => a.startTime.localeCompare(b.startTime)));
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create activity");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(activityId: string) {
    try {
      await api.deleteActivity(tripId, activityId);
      setActivities((prev) => prev.filter((activity) => activity.id !== activityId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete activity");
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
        <h3 className="font-semibold text-gray-800">Add timed activity</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            type="text"
            placeholder="Activity title (e.g. Museum visit)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="border border-gray-300 rounded-lg p-3 md:col-span-2"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border border-gray-300 rounded-lg p-3 md:col-span-2"
          />
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="border border-gray-300 rounded-lg p-3"
          />
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="border border-gray-300 rounded-lg p-3"
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Add Activity"}
        </Button>
      </form>

      {error && <p className="text-red-600">{error}</p>}
      {loading && <p className="text-gray-500">Loading activities...</p>}

      {!loading && activities.length === 0 && (
        <p className="text-gray-500">
          No timed activities yet. Add activities to enable prayer conflict detection.
        </p>
      )}

      <ul className="space-y-3">
        {activities.map((activity) => (
          <li key={activity.id} className="rounded-lg border border-gray-200 bg-white p-4 flex justify-between gap-4">
            <div>
              <p className="font-semibold">{activity.title}</p>
              {activity.description && (
                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                {new Date(activity.startTime).toLocaleString()} –{" "}
                {new Date(activity.endTime).toLocaleString()}
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(activity.id)}>
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
