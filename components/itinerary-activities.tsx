"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type {
  ActivityRecommendationsResponse,
  ActivityTravelTimeSegment,
  ApiActivity,
  ApiLocation,
  NearbyPlace,
  PlaceSuggestion,
} from "@/types/api";
import { formatDateTime } from "@/lib/utils";
import { Button } from "./ui/button";
import { CalendarDays, Clock, MapPin } from "lucide-react";

interface ItineraryActivitiesProps {
  tripId: string;
  startDate: string;
  endDate: string;
  locations: Pick<
    ApiLocation,
    "id" | "locationTitle" | "latitude" | "longitude" | "order"
  >[];
  hasLocations: boolean;
}

interface PlannerDay {
  dateKey: string;
  dayNumber: number;
  label: string;
  shortDate: string;
}

const DEFAULT_ACTIVITY_DURATION_MINUTES = 120;
const PLANNER_DAY_START_HOUR = 9;

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildPlannerDays(startDate: string, endDate: string): PlannerDay[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const finalDay = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  );
  const days: PlannerDay[] = [];

  while (cursor <= finalDay && days.length < 31) {
    const dateKey = toDateKey(cursor);
    days.push({
      dateKey,
      dayNumber: days.length + 1,
      label: `Day ${days.length + 1}`,
      shortDate: cursor.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

function activityDateKey(activity: ApiActivity) {
  return toDateKey(new Date(activity.startTime));
}

function timeOnly(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function buildDateTime(dateKey: string, hour: number, minute = 0) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function timeRangesOverlap(
  start: Date,
  end: Date,
  existingStart: Date,
  existingEnd: Date,
) {
  return start < existingEnd && end > existingStart;
}

export default function ItineraryActivities({
  tripId,
  startDate,
  endDate,
  locations,
  hasLocations,
}: ItineraryActivitiesProps) {
  const plannerDays = buildPlannerDays(startDate, endDate);
  const firstPlannerDate =
    plannerDays[0]?.dateKey ?? toDateKey(new Date(startDate));
  const [activities, setActivities] = useState<ApiActivity[]>([]);
  const [recommendations, setRecommendations] =
    useState<ActivityRecommendationsResponse | null>(null);
  const [travelTimeSegments, setTravelTimeSegments] = useState<
    ActivityTravelTimeSegment[]
  >([]);
  const [travelTimesLoading, setTravelTimesLoading] = useState(false);
  const [travelTimesError, setTravelTimesError] = useState<string | null>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(firstPlannerDate);
  const [activeRecommendationCategory, setActiveRecommendationCategory] =
    useState("All");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityLocationId, setActivityLocationId] = useState("");
  const [activityAddress, setActivityAddress] = useState("");
  const [activityLatitude, setActivityLatitude] = useState<number | null>(null);
  const [activityLongitude, setActivityLongitude] = useState<number | null>(
    null,
  );
  const [addressSuggestions, setAddressSuggestions] = useState<
    PlaceSuggestion[]
  >([]);
  const [addressSuggestionsLoading, setAddressSuggestionsLoading] =
    useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [recommendationTimes, setRecommendationTimes] = useState<
    Record<string, { startTime: string; endTime: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addressDebounceRef = useRef<number | null>(null);

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
    setSelectedDate(firstPlannerDate);
    setStartTime("");
    setEndTime("");
    setRecommendationTimes({});
    resetActivityLocation();
  }, [firstPlannerDate, tripId]);

  useEffect(() => {
    const trimmedAddress = activityAddress.trim();
    if (activityLocationId || trimmedAddress.length < 2) {
      setAddressSuggestions([]);
      return;
    }

    setAddressSuggestionsLoading(true);
    if (addressDebounceRef.current) {
      window.clearTimeout(addressDebounceRef.current);
    }

    addressDebounceRef.current = window.setTimeout(async () => {
      try {
        const results = await api.searchPlaces(trimmedAddress);
        setAddressSuggestions(results);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setAddressSuggestionsLoading(false);
      }
    }, 300);

    return () => {
      if (addressDebounceRef.current) {
        window.clearTimeout(addressDebounceRef.current);
      }
    };
  }, [activityAddress, activityLocationId]);

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

  useEffect(() => {
    const dayActivities = getActivitiesForDate(selectedDate);
    if (dayActivities.length < 2) {
      setTravelTimeSegments([]);
      setTravelTimesError(null);
      return;
    }

    setTravelTimesLoading(true);
    setTravelTimesError(null);
    api
      .getActivityTravelTimes(tripId, selectedDate)
      .then((response) => setTravelTimeSegments(response.segments))
      .catch((err) => {
        setTravelTimeSegments([]);
        setTravelTimesError(
          err instanceof Error ? err.message : "Failed to load travel times",
        );
      })
      .finally(() => setTravelTimesLoading(false));
  }, [tripId, selectedDate, activities]);
  function resetActivityLocation() {
    setActivityLocationId("");
    setActivityAddress("");
    setActivityLatitude(null);
    setActivityLongitude(null);
    setAddressSuggestions([]);
  }

  function handleSelectSavedLocation(locationId: string) {
    setActivityLocationId(locationId);
    if (!locationId) {
      setActivityAddress("");
      setActivityLatitude(null);
      setActivityLongitude(null);
      return;
    }

    const location = locations.find((item) => item.id === locationId);
    if (!location) return;

    setActivityAddress(location.locationTitle);
    setActivityLatitude(location.latitude);
    setActivityLongitude(location.longitude);
    setAddressSuggestions([]);
  }

  function handleActivityAddressChange(value: string) {
    setActivityLocationId("");
    setActivityAddress(value);
    setActivityLatitude(null);
    setActivityLongitude(null);
  }

  function handleSelectAddressSuggestion(description: string) {
    setActivityLocationId("");
    setActivityAddress(description);
    setActivityLatitude(null);
    setActivityLongitude(null);
    setAddressSuggestions([]);
  }

  function getActivitiesForDate(
    dateKey: string,
    activityList: ApiActivity[] = activities,
  ) {
    return activityList
      .filter((activity) => activityDateKey(activity) === dateKey)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  function findOverlappingActivity(
    start: Date,
    end: Date,
    activityList: ApiActivity[] = activities,
  ) {
    return activityList.find((activity) =>
      timeRangesOverlap(
        start,
        end,
        new Date(activity.startTime),
        new Date(activity.endTime),
      ),
    );
  }

  function findNextAvailableSlot(
    dateKey = selectedDate,
    activityList: ApiActivity[] = activities,
    durationMinutes = DEFAULT_ACTIVITY_DURATION_MINUTES,
  ) {
    let cursor = buildDateTime(dateKey, PLANNER_DAY_START_HOUR);

    for (const activity of getActivitiesForDate(dateKey, activityList)) {
      const activityStart = new Date(activity.startTime);
      const activityEnd = new Date(activity.endTime);
      const candidateEnd = addMinutes(cursor, durationMinutes);

      if (candidateEnd <= activityStart) break;
      if (cursor < activityEnd) cursor = activityEnd;
    }

    return {
      startTime: toDateTimeLocalValue(cursor),
      endTime: toDateTimeLocalValue(addMinutes(cursor, durationMinutes)),
    };
  }

  function showNextAvailableRecommendationTime(placeId: string) {
    const nextSlot = findNextAvailableSlot();
    setRecommendationTimes((prev) => ({
      ...prev,
      [placeId]: nextSlot,
    }));
    return nextSlot;
  }

  function defaultRecommendationTime(placeId: string) {
    return recommendationTimes[placeId] ?? findNextAvailableSlot();
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
    address?: string;
    latitude?: number;
    longitude?: number;
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
    const defaultSlot = findNextAvailableSlot();
    const activityStartTime = startTime || defaultSlot.startTime;
    const activityEndTime = endTime || defaultSlot.endTime;
    if (!title || !activityStartTime || !activityEndTime) return;

    const start = new Date(activityStartTime);
    const end = new Date(activityEndTime);
    const overlappingActivity = findOverlappingActivity(start, end);
    if (overlappingActivity) {
      const nextSlot = findNextAvailableSlot();
      setStartTime(nextSlot.startTime);
      setEndTime(nextSlot.endTime);
      setError(
        `"${overlappingActivity.title}" already uses that time. Showing next available time: ${timeOnly(
          nextSlot.startTime,
        )} - ${timeOnly(nextSlot.endTime)}.`,
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createActivity({
        title,
        description: description || undefined,
        address: activityAddress.trim() || undefined,
        latitude: activityLatitude ?? undefined,
        longitude: activityLongitude ?? undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      resetActivityLocation();
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

    const overlappingActivity = findOverlappingActivity(start, end);
    if (overlappingActivity) {
      const nextSlot = showNextAvailableRecommendationTime(place.id);
      setError(
        `"${overlappingActivity.title}" already uses that time. Showing next available time: ${timeOnly(
          nextSlot.startTime,
        )} - ${timeOnly(nextSlot.endTime)}.`,
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await createActivity({
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
        address: place.address || undefined,
        latitude: place.latitude,
        longitude: place.longitude,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      const nextSlot = findNextAvailableSlot(selectedDate, [
        ...activities,
        created,
      ]);
      setRecommendationTimes((prev) => ({
        ...prev,
        [place.id]: nextSlot,
      }));
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

  async function handleDelete(activityId: string, activityTitle: string) {
    const confirmed = window.confirm(
      `Delete "${activityTitle}" from your itinerary? This action cannot be undone.`,
    );
    if (!confirmed) return;

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

  function handleSelectDate(dateKey: string) {
    setSelectedDate(dateKey);
    setStartTime("");
    setEndTime("");
    setRecommendationTimes({});
    resetActivityLocation();
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
  const selectedDay =
    plannerDays.find((day) => day.dateKey === selectedDate) ?? plannerDays[0];
  const activitiesByDate = activities.reduce<Record<string, ApiActivity[]>>(
    (groups, activity) => {
      const key = activityDateKey(activity);
      groups[key] = [...(groups[key] ?? []), activity];
      return groups;
    },
    {},
  );
  const selectedActivities = activitiesByDate[selectedDate] ?? [];
  const nextAvailableActivityTime = findNextAvailableSlot();
  const travelTimeByFromActivity = new Map(
    travelTimeSegments.map((segment) => [segment.fromActivityId, segment]),
  );
  const unplannedActivities = activities.filter(
    (activity) => !plannerDays.some((day) => day.dateKey === activityDateKey(activity)),
  );
  const sortedLocations = [...locations].sort((a, b) => a.order - b.order);

  return (
    <div className='space-y-6'>
      <section className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <div>
            <div className='flex items-center gap-2 text-blue-700'>
              <CalendarDays className='h-5 w-5' />
              <h2 className='text-xl font-bold text-gray-900'>
                Day-by-day trip planner
              </h2>
            </div>
            <p className='mt-1 text-sm text-gray-600'>
              Plan each trip day with timed activities, saved places, and
              recommendations.
            </p>
          </div>
          <div className='rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700'>
            {activities.length} planned activit
            {activities.length === 1 ? "y" : "ies"}
          </div>
        </div>

        <div className='mt-4 flex gap-2 overflow-x-auto pb-1'>
          {plannerDays.map((day) => {
            const count = activitiesByDate[day.dateKey]?.length ?? 0;
            return (
              <button
                key={day.dateKey}
                type='button'
                onClick={() => handleSelectDate(day.dateKey)}
                className={`min-w-28 rounded-xl border px-4 py-3 text-left transition ${
                  selectedDate === day.dateKey
                    ? "border-blue-600 bg-blue-600 text-white shadow"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-200 hover:bg-blue-50"
                }`}
              >
                <span className='block text-sm font-semibold'>{day.label}</span>
                <span className='block text-xs opacity-80'>{day.shortDate}</span>
                <span className='mt-2 block text-xs'>
                  {count} activit{count === 1 ? "y" : "ies"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'>
        <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h3 className='text-lg font-semibold text-gray-900'>
                {selectedDay?.label ?? "Selected day"} timeline
              </h3>
              <p className='text-sm text-gray-500'>
                {selectedDay?.shortDate ?? selectedDate}
              </p>
            </div>
            <span className='rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600'>
              {selectedActivities.length} planned
            </span>
          </div>

          {loading ? (
            <p className='text-sm text-gray-500'>Loading activities...</p>
          ) : selectedActivities.length === 0 ? (
            <div className='rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center'>
              <p className='font-medium text-gray-700'>
                No activities planned for this day yet.
              </p>
              <p className='mt-1 text-sm text-gray-500'>
                Add your own activity below or choose one from recommendations.
              </p>
            </div>
          ) : (
            <ol className='space-y-3'>
              {selectedActivities.map((activity, index) => {
                const travelSegment = travelTimeByFromActivity.get(activity.id);
                const hasNextActivity = index < selectedActivities.length - 1;

                return (
                  <Fragment key={activity.id}>
                    <li className='relative rounded-lg border border-gray-200 bg-gray-50 p-4 pl-16'>
                      <div className='absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white'>
                        {index + 1}
                      </div>
                      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                        <div>
                          <p className='font-semibold text-gray-900'>
                            {activity.title}
                          </p>
                          {activity.description && (
                            <p className='mt-1 text-sm text-gray-600'>
                              {activity.description}
                            </p>
                          )}
                          <p className='mt-2 flex items-center gap-2 text-sm text-gray-500'>
                            <Clock className='h-4 w-4' />
                            {timeOnly(activity.startTime)} -{" "}
                            {timeOnly(activity.endTime)}
                          </p>
                          {activity.address ? (
                            <p className='mt-2 flex items-start gap-2 text-sm text-gray-600'>
                              <MapPin className='mt-0.5 h-4 w-4 shrink-0' />
                              <span>{activity.address}</span>
                            </p>
                          ) : null}
                          {activity.latitude != null &&
                          activity.longitude != null ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${activity.latitude},${activity.longitude}`}
                              target='_blank'
                              rel='noreferrer'
                              className='mt-2 inline-block text-xs text-blue-600 hover:underline'
                            >
                              View on Maps
                            </a>
                          ) : activity.address ? (
                            <p className='mt-2 text-xs text-amber-700'>
                              Coordinates not saved yet for travel-time
                              estimates.
                            </p>
                          ) : (
                            <p className='mt-2 text-xs text-amber-700'>
                              No location saved for travel-time estimates.
                            </p>
                          )}
                        </div>
                        <Button
                          variant='destructive'
                          size='sm'
                          onClick={() => handleDelete(activity.id, activity.title)}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                    {hasNextActivity && (
                      <li className='ml-16 rounded-lg border border-dashed border-blue-200 bg-blue-50/60 p-3 text-sm text-blue-800'>
                        {travelTimesLoading ? (
                          <span>Calculating travel time to next activity...</span>
                        ) : travelSegment?.estimate ? (
                          <span>
                            Travel to {travelSegment.toTitle}:{" "}
                            <strong>{travelSegment.estimate.durationText}</strong>{" "}
                            by car ({travelSegment.estimate.distanceText})
                          </span>
                        ) : travelSegment?.error ? (
                          <span>{travelSegment.error}</span>
                        ) : travelTimesError ? (
                          <span>{travelTimesError}</span>
                        ) : (
                          <span>Travel time unavailable for this segment.</span>
                        )}
                      </li>
                    )}
                  </Fragment>
                );
              })}
            </ol>
          )}
        </div>

        <aside className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='mb-3 flex items-center gap-2'>
            <MapPin className='h-5 w-5 text-blue-600' />
            <h3 className='font-semibold text-gray-900'>Saved trip places</h3>
          </div>
          {sortedLocations.length === 0 ? (
            <p className='text-sm text-gray-500'>
              Add locations first to make recommendations stronger.
            </p>
          ) : (
            <ul className='space-y-2'>
              {sortedLocations.map((location, index) => (
                <li
                  key={location.id}
                  className='rounded-lg border border-gray-100 bg-gray-50 p-3'
                >
                  <p className='text-sm font-medium text-gray-900'>
                    {index + 1}. {location.locationTitle}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                    target='_blank'
                    rel='noreferrer'
                    className='mt-1 inline-block text-xs text-blue-600 hover:underline'
                  >
                    View on Maps
                  </a>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>

      <form
        onSubmit={handleSubmit}
        className='rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4'
      >
        <h3 className='font-semibold text-gray-800'>
          Add activity to {selectedDay?.label ?? "selected day"}
        </h3>
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
          {sortedLocations.length > 0 && (
            <select
              value={activityLocationId}
              onChange={(e) => handleSelectSavedLocation(e.target.value)}
              className='border border-gray-300 rounded-lg p-3 md:col-span-2'
            >
              <option value=''>Use a saved trip place (optional)</option>
              {sortedLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.locationTitle}
                </option>
              ))}
            </select>
          )}
          <div className='relative md:col-span-2'>
            <input
              type='text'
              placeholder='Activity location or address (optional)'
              value={activityAddress}
              onChange={(e) => handleActivityAddressChange(e.target.value)}
              onBlur={() =>
                window.setTimeout(() => setAddressSuggestions([]), 150)
              }
              className='w-full border border-gray-300 rounded-lg p-3'
            />
            {addressSuggestions.length > 0 && (
              <ul className='absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg'>
                {addressSuggestions.map((suggestion) => (
                  <li
                    key={suggestion.id}
                    className='cursor-pointer px-4 py-3 text-sm text-gray-800 hover:bg-slate-50'
                    onMouseDown={() =>
                      handleSelectAddressSuggestion(suggestion.description)
                    }
                  >
                    {suggestion.description}
                  </li>
                ))}
              </ul>
            )}
            {addressSuggestionsLoading && (
              <p className='mt-2 text-xs text-gray-500'>
                Loading location suggestions...
              </p>
            )}
            {activityLatitude != null && activityLongitude != null ? (
              <p className='mt-2 text-xs text-emerald-700'>
                Location coordinates ready for travel-time estimates.
              </p>
            ) : activityAddress.trim() ? (
              <p className='mt-2 text-xs text-gray-500'>
                Address will be geocoded when you save this activity.
              </p>
            ) : null}
          </div>
          <input
            type='datetime-local'
            value={startTime || nextAvailableActivityTime.startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className='border border-gray-300 rounded-lg p-3'
          />
          <input
            type='datetime-local'
            value={endTime || nextAvailableActivityTime.endTime}
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
                        const selectedStart = new Date(time.startTime);
                        const selectedEnd = new Date(time.endTime);
                        const overlappingActivity =
                          Number.isNaN(selectedStart.getTime()) ||
                          Number.isNaN(selectedEnd.getTime())
                            ? null
                            : findOverlappingActivity(selectedStart, selectedEnd);
                        const nextAvailableTime = overlappingActivity
                          ? findNextAvailableSlot()
                          : null;

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
                            {overlappingActivity && nextAvailableTime && (
                              <p className='mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700'>
                                This time is unavailable because it overlaps
                                with "{overlappingActivity.title}". Next
                                available: {timeOnly(nextAvailableTime.startTime)}{" "}
                                - {timeOnly(nextAvailableTime.endTime)}.
                              </p>
                            )}
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

      {unplannedActivities.length > 0 && (
        <section className='rounded-xl border border-amber-200 bg-amber-50 p-4'>
          <h3 className='font-semibold text-amber-900'>
            Activities outside trip dates
          </h3>
          <p className='mt-1 text-sm text-amber-800'>
            These activities have times outside the trip date range.
          </p>
          <ul className='mt-3 space-y-3'>
            {unplannedActivities.map((activity) => (
              <li
                key={activity.id}
                className='flex justify-between gap-4 rounded-lg border border-amber-100 bg-white p-4'
              >
                <div>
                  <p className='font-semibold'>{activity.title}</p>
                  <p className='mt-1 text-sm text-gray-500'>
                    {formatDateTime(new Date(activity.startTime))} -{" "}
                    {formatDateTime(new Date(activity.endTime))}
                  </p>
                </div>
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={() => handleDelete(activity.id, activity.title)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
