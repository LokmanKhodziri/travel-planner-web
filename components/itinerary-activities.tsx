"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type {
  ActivityRecommendationsResponse,
  ApiActivity,
  NearbyPlace,
} from "@/types/api";
import { formatDateTime } from "@/lib/utils";
import { Button } from "./ui/button";

interface ItineraryActivitiesProps {
  tripId: string;
  defaultDate: string;
  hasLocations: boolean;
}

export default function ItineraryActivities({
  tripId,
  defaultDate,
  hasLocations,
}: ItineraryActivitiesProps) {
  const [activities, setActivities] = useState<ApiActivity[]>([]);
  const [recommendations, setRecommendations] =
    useState<ActivityRecommendationsResponse | null>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [activeRecommendationCategory, setActiveRecommendationCategory] =
    useState("All");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [recommendationTimes, setRecommendationTimes] = useState<
    Record<string, { startTime: string; endTime: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = () => {
    setLoading(true);
    api
      .getActivities(tripId)
      .then(setActivities)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load activities",
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadActivities();
  }, [tripId]);

  useEffect(() => {
    if (!hasLocations) return;

    setRecommendationsLoading(true);
    api
      .getActivityRecommendations(tripId)
      .then(setRecommendations)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load activity recommendations",
        ),
      )
      .finally(() => setRecommendationsLoading(false));
  }, [tripId, hasLocations]);

  function defaultRecommendationTime(placeId: string) {
    return (
      recommendationTimes[placeId] ?? {
        startTime: `${defaultDate}T09:00`,
        endTime: `${defaultDate}T11:00`,
      }
    );
  }

  function updateRecommendationTime(
    placeId: string,
    field: "startTime" | "endTime",
    value: string,
  ) {
    setRecommendationTimes((prev) => ({
      ...prev,
      [placeId]: {
        ...defaultRecommendationTime(placeId),
        ...prev[placeId],
        [field]: value,
      },
    }));
  }

  async function createActivity(body: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
  }) {
    const created = await api.createActivity(tripId, body);
    setActivities((prev) =>
      [...prev, created].sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      ),
    );
    return created;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !startTime || !endTime) return;

    setSubmitting(true);
    setError(null);
    try {
      await createActivity({
        title,
        description: description || undefined,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create activity",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddRecommendation(
    place: NearbyPlace,
    sourceTitle: string,
  ) {
    const time = defaultRecommendationTime(place.id);
    const start = new Date(time.startTime);
    const end = new Date(time.endTime);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      setError("Choose a valid start and end time for the recommendation.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createActivity({
        title: place.name,
        description: [
          place.category ? `Category: ${place.category}` : null,
          place.about ? `About: ${place.about}` : null,
          place.address ? `Address: ${place.address}` : null,
          `Recommended near ${sourceTitle}`,
          place.rating != null ? `Rating: ${place.rating.toFixed(1)}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to add recommended activity",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(activityId: string) {
    try {
      await api.deleteActivity(tripId, activityId);
      setActivities((prev) =>
        prev.filter((activity) => activity.id !== activityId),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete activity",
      );
    }
  }

  const recommendationCategories = recommendations
    ? [
        "All",
        ...Array.from(
          new Set(
            recommendations.rows
              .flatMap((row) => row.recommendations)
              .map((place) => place.category)
              .filter((category): category is string => Boolean(category)),
          ),
        ),
      ]
    : ["All"];

  return (
    <div className='space-y-6'>
      <form
        onSubmit={handleSubmit}
        className='rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4'
      >
        <h3 className='font-semibold text-gray-800'>Add timed activity</h3>
        <div className='grid gap-4 md:grid-cols-2'>
          <input
            type='text'
            placeholder='Activity title (e.g. Museum visit)'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className='border border-gray-300 rounded-lg p-3 md:col-span-2'
          />
          <input
            type='text'
            placeholder='Description (optional)'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className='border border-gray-300 rounded-lg p-3 md:col-span-2'
          />
          <input
            type='datetime-local'
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className='border border-gray-300 rounded-lg p-3'
          />
          <input
            type='datetime-local'
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className='border border-gray-300 rounded-lg p-3'
          />
        </div>
        <Button type='submit' disabled={submitting}>
          {submitting ? "Saving..." : "Add Activity"}
        </Button>
      </form>

      {error && <p className='text-red-600'>{error}</p>}
      {loading && <p className='text-gray-500'>Loading activities...</p>}

      <section className='rounded-lg border border-blue-100 bg-blue-50/40 p-4'>
        <div className='mb-4'>
          <h3 className='font-semibold text-gray-800'>
            Recommended activities
          </h3>
          <p className='text-sm text-gray-600'>
            Suggestions are based on your saved trip locations. Pick a time
            range and add any suggestion into your itinerary activities.
          </p>
        </div>

        {!hasLocations ? (
          <p className='text-sm text-gray-500'>
            Add at least one location before requesting activity
            recommendations.
          </p>
        ) : recommendationsLoading ? (
          <p className='text-sm text-gray-500'>Loading recommendations...</p>
        ) : !recommendations ? (
          <p className='text-sm text-gray-500'>
            No recommendations loaded yet.
          </p>
        ) : (
          <div className='space-y-5'>
            <p className='rounded-lg bg-white p-3 text-sm text-blue-800'>
              {recommendations.note}
            </p>
            <div className='flex gap-2 overflow-x-auto pb-1'>
              {recommendationCategories.map((category) => (
                <button
                  key={category}
                  type='button'
                  onClick={() => setActiveRecommendationCategory(category)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeRecommendationCategory === category
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-blue-50"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            {recommendations.rows.map((row) => (
              <div
                key={row.sourceLocation.id}
                className='rounded-lg border border-blue-100 bg-white p-4'
              >
                <div className='mb-3'>
                  <p className='font-medium text-gray-900'>
                    Near {row.sourceLocation.title}
                  </p>
                  {row.error && (
                    <p className='mt-1 text-sm text-amber-700'>{row.error}</p>
                  )}
                </div>

                {(() => {
                  const filteredRecommendations =
                    activeRecommendationCategory === "All"
                      ? row.recommendations
                      : row.recommendations.filter(
                          (place) =>
                            place.category === activeRecommendationCategory,
                        );

                  if (filteredRecommendations.length === 0 && !row.error) {
                    return (
                      <p className='text-sm text-gray-500'>
                        {activeRecommendationCategory === "All"
                          ? "No activity recommendations"
                          : `No ${activeRecommendationCategory.toLowerCase()} recommendations`}{" "}
                        found near this location.
                      </p>
                    );
                  }

                  return (
                    <div className='grid gap-3 lg:grid-cols-2'>
                      {filteredRecommendations.slice(0, 6).map((place) => {
                        const time = defaultRecommendationTime(place.id);

                        return (
                          <div
                            key={place.id}
                            className='rounded-lg border border-gray-100 p-3'
                          >
                            <div className='flex flex-wrap items-start justify-between gap-2'>
                              <div>
                                <p className='font-semibold text-gray-900'>
                                  {place.name}
                                </p>
                                <p className='text-sm text-gray-500'>
                                  {place.address || "No address available"}
                                </p>
                                <p className='mt-2 text-sm text-gray-600'>
                                  {place.about}
                                </p>
                              </div>
                              {place.category && (
                                <span className='rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600'>
                                  {place.category}
                                </span>
                              )}
                            </div>
                            <div className='mt-2 flex flex-wrap gap-3 text-xs text-gray-500'>
                              {place.rating != null && (
                                <span>Rating {place.rating.toFixed(1)}</span>
                              )}
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`}
                                target='_blank'
                                rel='noreferrer'
                                className='text-blue-600 hover:underline'
                              >
                                View on Maps
                              </a>
                            </div>
                            <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                              <input
                                type='datetime-local'
                                value={time.startTime}
                                onChange={(e) =>
                                  updateRecommendationTime(
                                    place.id,
                                    "startTime",
                                    e.target.value,
                                  )
                                }
                                className='rounded-lg border border-gray-300 p-2 text-sm'
                              />
                              <input
                                type='datetime-local'
                                value={time.endTime}
                                onChange={(e) =>
                                  updateRecommendationTime(
                                    place.id,
                                    "endTime",
                                    e.target.value,
                                  )
                                }
                                className='rounded-lg border border-gray-300 p-2 text-sm'
                              />
                            </div>
                            <Button
                              type='button'
                              size='sm'
                              className='mt-3'
                              disabled={submitting}
                              onClick={() =>
                                handleAddRecommendation(
                                  place,
                                  row.sourceLocation.title,
                                )
                              }
                            >
                              Add to Activities
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </section>

      {!loading && activities.length === 0 && (
        <p className='text-gray-500'>
          No timed activities yet. Add activities to plan your itinerary.
        </p>
      )}

      <ul className='space-y-3'>
        {activities.map((activity) => (
          <li
            key={activity.id}
            className='rounded-lg border border-gray-200 bg-white p-4 flex justify-between gap-4'
          >
            <div>
              <p className='font-semibold'>{activity.title}</p>
              {activity.description && (
                <p className='text-sm text-gray-600 mt-1'>
                  {activity.description}
                </p>
              )}
              <p className='text-sm text-gray-500 mt-2'>
                {formatDateTime(new Date(activity.startTime))} –{" "}
                {formatDateTime(new Date(activity.endTime))}
              </p>
            </div>
            <Button
              variant='destructive'
              size='sm'
              onClick={() => handleDelete(activity.id)}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
