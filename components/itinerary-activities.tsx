"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { api } from "@/lib/api";
import type {
  ActivityRecommendationsResponse,
  ActivityTravelTimeSegment,
  ApiActivity,
  ApiLocation,
  NearbyPlace,
  PlaceSuggestion,
  PrayerTimings,
  TravelMode,
} from "@/types/api";
import { formatDateTime } from "@/lib/utils";
import { computeTravelAdjustedSchedule, computeScheduleForOrderedActivities, getTravelBufferAfterActivity } from "@/lib/planner-schedule";
import {
  activityPrimaryDateKey,
  clipActivityToDay,
  getActivitiesOverlappingDate,
  plannerDateKey,
} from "@/lib/planner-dates";
import { filterRecommendationRows } from "@/lib/recommendation-matching";
import {
  getOpeningHoursLabel,
  isVisitWithinOpeningHours,
  suggestRecommendationTimeSlot,
} from "@/lib/recommendation-schedule";
import {
  getStoredTravelMode,
  storeTravelMode,
  TRAVEL_MODE_OPTIONS,
  travelModeLabel,
} from "@/lib/travel-modes";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import PlannerStretchTimeline from "./planner-stretch-timeline";
import ActivityEditDialog from "./activity-edit-dialog";
import ActivityAddDialog from "./activity-add-dialog";
import PlannerGettingStarted from "./planner-getting-started";
import PlannerRecommendationCard from "./planner-recommendation-card";
import SavedPlaceDraggable from "./saved-place-draggable";
import TimelineInsertDropZone from "./timeline-insert-drop-zone";
import {
  isSavedPlaceDragId,
  parseSavedPlaceDragId,
  parseTimelineInsertTarget,
  TIMELINE_INSERT_EMPTY,
} from "@/lib/planner-drag";
import {
  CalendarDays,
  ChevronDown,
  Compass,
  LayoutList,
  MapPin,
  Plus,
  RefreshCw,
  Route,
  Sparkles,
} from "lucide-react";

type PlannerView = "timeline" | "discover" | "places";

interface ItineraryActivitiesProps {
  tripId: string;
  startDate: string;
  endDate: string;
  locations: Pick<
    ApiLocation,
    "id" | "locationTitle" | "latitude" | "longitude" | "order"
  >[];
  hasLocations: boolean;
  onLocationAdded?: (location: ApiLocation) => void;
}

interface PlannerDay {
  dateKey: string;
  dayNumber: number;
  label: string;
  shortDate: string;
}

const DEFAULT_ACTIVITY_DURATION_MINUTES = 120;
const PLANNER_DAY_START_HOUR = 9;
const RECOMMENDATION_CATEGORY_ORDER = [
  "Attraction",
  "Museum",
  "Park",
  "Shopping",
  "Gallery",
  "Theme park",
  "Aquarium",
  "Zoo",
  "Local special",
] as const;

function buildRecommendationCategories(categories: Iterable<string | undefined>) {
  const discovered = new Set(
    [...categories].filter((category): category is string => Boolean(category)),
  );
  const ordered = RECOMMENDATION_CATEGORY_ORDER.filter((category) =>
    discovered.has(category),
  );
  const extras = [...discovered]
    .filter(
      (category) =>
        !RECOMMENDATION_CATEGORY_ORDER.includes(
          category as (typeof RECOMMENDATION_CATEGORY_ORDER)[number],
        ),
    )
    .sort();
  return ["All", ...ordered, ...extras];
}

function toDateKey(date: Date) {
  return plannerDateKey(date);
}

function activityDateKey(activity: ApiActivity) {
  return activityPrimaryDateKey(activity);
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

function findSuggestedDay(
  plannerDays: PlannerDay[],
  activities: ApiActivity[],
): string {
  if (plannerDays.length === 0) return "";

  return plannerDays.reduce((best, day) => {
    const bestCount = activities.filter(
      (activity) => activityDateKey(activity) === best.dateKey,
    ).length;
    const dayCount = activities.filter(
      (activity) => activityDateKey(activity) === day.dateKey,
    ).length;
    return dayCount < bestCount ? day : best;
  }).dateKey;
}

function activityDurationMinutes(activity: ApiActivity) {
  const durationMs =
    new Date(activity.endTime).getTime() - new Date(activity.startTime).getTime();
  return Math.max(
    DEFAULT_ACTIVITY_DURATION_MINUTES,
    Math.round(durationMs / 60000),
  );
}

function locationsAreNearby(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusM = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return (
    earthRadiusM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)) <
    150
  );
}

export default function ItineraryActivities({
  tripId,
  startDate,
  endDate,
  locations,
  hasLocations,
  onLocationAdded,
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
  const [recommendationsRefreshing, setRecommendationsRefreshing] =
    useState(false);
  const [excludedRecommendationIds, setExcludedRecommendationIds] = useState(
    () => new Set<string>(),
  );
  const [recommendationRefreshCount, setRecommendationRefreshCount] =
    useState(0);
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
  const [showAddActivityDialog, setShowAddActivityDialog] = useState(false);
  const [plannerView, setPlannerView] = useState<PlannerView>("timeline");
  const [showAdvancedSchedule, setShowAdvancedSchedule] = useState(false);
  const [movingActivityId, setMovingActivityId] = useState<string | null>(null);
  const [reorderingActivities, setReorderingActivities] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ApiActivity | null>(null);
  const [editingActivitySaving, setEditingActivitySaving] = useState(false);
  const [syncingSchedule, setSyncingSchedule] = useState(false);
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimings | null>(null);
  const [prayerTimesLoading, setPrayerTimesLoading] = useState(false);
  const [prayerTimesError, setPrayerTimesError] = useState<string | null>(null);
  const [showPrayerTimes, setShowPrayerTimes] = useState(true);
  const [travelMode, setTravelMode] = useState<TravelMode>("driving");
  const [error, setError] = useState<string | null>(null);
  const [draggingSavedPlaceId, setDraggingSavedPlaceId] = useState<string | null>(
    null,
  );
  const [addingSavedPlaceId, setAddingSavedPlaceId] = useState<string | null>(null);
  const addressDebounceRef = useRef<number | null>(null);

  const plannerSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

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
    setTravelMode(getStoredTravelMode());
  }, []);

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

  async function handleRefreshRecommendations() {
    if (!hasLocations || recommendationsRefreshing) return;

    const currentIds =
      recommendations?.rows.flatMap((row) =>
        row.recommendations.map((place) => place.id),
      ) ?? [];
    const exclude = [
      ...new Set([...excludedRecommendationIds, ...currentIds]),
    ];
    const nextRefreshCount = recommendationRefreshCount + 1;

    setExcludedRecommendationIds(new Set(exclude));
    setRecommendationRefreshCount(nextRefreshCount);
    setRecommendationsRefreshing(true);
    setError(null);

    try {
      const refreshed = await api.getActivityRecommendations(tripId, 5000, {
        exclude,
        extended: nextRefreshCount % 2 === 1,
      });
      setRecommendations(refreshed);
      setActiveRecommendationCategory("All");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to refresh activity recommendations",
      );
    } finally {
      setRecommendationsRefreshing(false);
    }
  }

  function rememberExcludedRecommendation(placeId: string) {
    setExcludedRecommendationIds((prev) => new Set([...prev, placeId]));
  }

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
      .getActivityTravelTimes(tripId, selectedDate, travelMode)
      .then((response) => setTravelTimeSegments(response.segments))
      .catch((err) => {
        setTravelTimeSegments([]);
        setTravelTimesError(
          err instanceof Error ? err.message : "Failed to load travel times",
        );
      })
      .finally(() => setTravelTimesLoading(false));
  }, [tripId, selectedDate, activities, travelMode]);

  function handleTravelModeChange(mode: TravelMode) {
    setTravelMode(mode);
    storeTravelMode(mode);
  }

  useEffect(() => {
    if (!hasLocations) {
      setPrayerTimes(null);
      setPrayerTimesError(null);
      return;
    }

    setPrayerTimesLoading(true);
    setPrayerTimesError(null);
    api
      .getPrayerTimes(tripId, selectedDate)
      .then(setPrayerTimes)
      .catch((err) => {
        setPrayerTimes(null);
        setPrayerTimesError(
          err instanceof Error ? err.message : "Failed to load prayer times",
        );
      })
      .finally(() => setPrayerTimesLoading(false));
  }, [tripId, selectedDate, hasLocations]);

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
    return getActivitiesOverlappingDate(activityList, dateKey);
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
    const dayActivities = getActivitiesForDate(dateKey, activityList);

    if (dayActivities.length > 0) {
      const lastActivity = dayActivities[dayActivities.length - 1];
      const cursor = addMinutes(new Date(lastActivity.endTime), 15);
      return {
        startTime: toDateTimeLocalValue(cursor),
        endTime: toDateTimeLocalValue(addMinutes(cursor, durationMinutes)),
      };
    }

    const cursor = buildDateTime(dateKey, PLANNER_DAY_START_HOUR);
    return {
      startTime: toDateTimeLocalValue(cursor),
      endTime: toDateTimeLocalValue(addMinutes(cursor, durationMinutes)),
    };
  }

  function computeRecommendationTime(place: NearbyPlace) {
    const suggested = suggestRecommendationTimeSlot({
      place,
      dateKey: selectedDate,
      activities,
      durationMinutes: DEFAULT_ACTIVITY_DURATION_MINUTES,
    });
    return {
      startTime: suggested.startTime,
      endTime: suggested.endTime,
      scheduleNote: suggested.scheduleNote,
      withinOpeningHours: suggested.withinOpeningHours,
    };
  }

  function showNextAvailableRecommendationTime(place: NearbyPlace) {
    const nextSlot = computeRecommendationTime(place);
    setRecommendationTimes((prev) => ({
      ...prev,
      [place.id]: {
        startTime: nextSlot.startTime,
        endTime: nextSlot.endTime,
      },
    }));
    return nextSlot;
  }

  function defaultRecommendationTime(place: NearbyPlace) {
    if (recommendationTimes[place.id]) {
      return recommendationTimes[place.id];
    }
    const suggested = computeRecommendationTime(place);
    return {
      startTime: suggested.startTime,
      endTime: suggested.endTime,
    };
  }

  function getRecommendationScheduleMeta(place: NearbyPlace) {
    const suggested = computeRecommendationTime(place);
    const stored = recommendationTimes[place.id];
    const start = new Date(stored?.startTime ?? suggested.startTime);
    const end = new Date(stored?.endTime ?? suggested.endTime);
    const hoursCheck = isVisitWithinOpeningHours(place, start, end, selectedDate);

    return {
      scheduleNote: stored ? undefined : suggested.scheduleNote,
      hoursLabel: getOpeningHoursLabel(place.openingHours, selectedDate),
      outsideOpeningHours: !hoursCheck.ok,
      openingHoursWarning: hoursCheck.ok ? null : hoursCheck.reason,
    };
  }

  function updateRecommendationTime(
    place: NearbyPlace,
    field: "startTime" | "endTime",
    value: string,
  ) {
    setRecommendationTimes((prev) => ({
      ...prev,
      [place.id]: {
        ...defaultRecommendationTime(place),
        ...prev[place.id],
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
    if (created.syncedLocation) {
      onLocationAdded?.(created.syncedLocation);
    }
    return created;
  }

  async function handleAddActivitySave(values: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const start = new Date(values.startTime);
    const end = new Date(values.endTime);
    const overlappingActivity = findOverlappingActivity(start, end);
    if (overlappingActivity) {
      setError(
        `"${overlappingActivity.title}" already uses that time. Try a different start time or duration.`,
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createActivity({
        title: values.title,
        description: values.description,
        address: values.address,
        latitude: values.latitude,
        longitude: values.longitude,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      setShowAddActivityDialog(false);
      setPlannerView("timeline");
      setScheduleNotice(
        `Added "${values.title}" to ${selectedDay?.label ?? "your day"}.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create activity",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function syncActivityToTripLocation(input: {
    title: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const hasCoords = input.latitude != null && input.longitude != null;
    const address = input.address?.trim() || input.title;
    if (!hasCoords && !input.address?.trim()) return;

    const alreadySaved = locations.some((location) => {
      if (hasCoords) {
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const earthRadiusM = 6371000;
        const dLat = toRad(input.latitude! - location.latitude);
        const dLng = toRad(input.longitude! - location.longitude);
        const lat1 = toRad(location.latitude);
        const lat2 = toRad(input.latitude!);
        const haversine =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        const distanceM =
          earthRadiusM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
        return distanceM < 150;
      }
      return location.locationTitle.trim().toLowerCase() === input.title.trim().toLowerCase();
    });
    if (alreadySaved) return;

    try {
      const location = await api.addLocation(tripId, address, {
        locationTitle: input.title,
        latitude: hasCoords ? input.latitude : undefined,
        longitude: hasCoords ? input.longitude : undefined,
      });
      onLocationAdded?.(location);
    } catch (err) {
      console.error("Failed to sync activity location:", err);
    }
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
    let time = defaultRecommendationTime(place);
    let start = new Date(time.startTime);
    let end = new Date(time.endTime);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      const suggested = computeRecommendationTime(place);
      time = {
        startTime: suggested.startTime,
        endTime: suggested.endTime,
      };
      start = new Date(time.startTime);
      end = new Date(time.endTime);
    }

    let overlappingActivity = findOverlappingActivity(start, end);
    if (overlappingActivity) {
      const nextSlot = computeRecommendationTime(place);
      time = {
        startTime: nextSlot.startTime,
        endTime: nextSlot.endTime,
      };
      start = new Date(time.startTime);
      end = new Date(time.endTime);
      setRecommendationTimes((prev) => ({
        ...prev,
        [place.id]: time,
      }));
      overlappingActivity = findOverlappingActivity(start, end);
    }

    if (overlappingActivity) {
      setError(
        `Could not find an open slot for "${place.name}" on ${selectedDay?.label ?? "this day"}. Try another day or adjust your schedule.`,
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
      if (!created.syncedLocation) {
        await syncActivityToTripLocation({
          title: place.name,
          address: place.address || undefined,
          latitude: place.latitude,
          longitude: place.longitude,
        });
      }
      const nextSlot = findNextAvailableSlot(selectedDate, [
        ...activities,
        created,
      ]);
      setRecommendationTimes((prev) => ({
        ...prev,
        [place.id]: nextSlot,
      }));
      rememberExcludedRecommendation(place.id);
      setPlannerView("timeline");
      setScheduleNotice(
        `Added "${place.name}" to ${selectedDay?.label ?? "your day"}.`,
      );
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

  async function handleReorderActivities(orderedActivityIds: string[]) {
    if (orderedActivityIds.length < 2) return;

    const dayActivities = getActivitiesForDate(selectedDate);
    const ordered = orderedActivityIds
      .map((id) => dayActivities.find((activity) => activity.id === id))
      .filter((activity): activity is ApiActivity => Boolean(activity));

    if (ordered.length < 2) return;

    setReorderingActivities(true);
    setError(null);
    setScheduleNotice(null);

    try {
      const travelResponse = await api.getActivityTravelTimes(
        tripId,
        selectedDate,
        travelMode,
        orderedActivityIds,
      );
      const updates = computeScheduleForOrderedActivities(
        ordered,
        travelResponse.segments,
        selectedDate,
      );

      if (updates.length === 0) {
        setScheduleNotice("Activities reordered. Times already fit the new route.");
        setTravelTimeSegments(travelResponse.segments);
        return;
      }

      const updatedActivities = await Promise.all(
        updates.map((update) =>
          api.updateActivity(tripId, update.activityId, {
            startTime: update.startTime,
            endTime: update.endTime,
          }),
        ),
      );

      const updatedById = new Map(
        updatedActivities.map((activity) => [activity.id, activity]),
      );
      setActivities((prev) =>
        prev
          .map((activity) => updatedById.get(activity.id) ?? activity)
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      );
      setTravelTimeSegments(travelResponse.segments);
      setScheduleNotice(
        `Reordered ${ordered.length} activities and updated times with ${travelModeLabel(travelMode).toLowerCase()} gaps.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reorder activities",
      );
    } finally {
      setReorderingActivities(false);
    }
  }

  function sortedDayActivities(
    dateKey = selectedDate,
    activityList: ApiActivity[] = activities,
  ) {
    return [...getActivitiesForDate(dateKey, activityList)].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );
  }

  function isLocationOnSelectedDay(
    location: Pick<
      ApiLocation,
      "id" | "locationTitle" | "latitude" | "longitude"
    >,
  ) {
    return sortedDayActivities().some((activity) => {
      if (activity.latitude != null && activity.longitude != null) {
        return locationsAreNearby(
          { latitude: activity.latitude, longitude: activity.longitude },
          location,
        );
      }
      return (
        activity.title.trim().toLowerCase() ===
        location.locationTitle.trim().toLowerCase()
      );
    });
  }

  function findSlotAfterActivity(activityId: string) {
    const dayActivities = sortedDayActivities();
    const index = dayActivities.findIndex((activity) => activity.id === activityId);
    if (index === -1) return findNextAvailableSlot();

    const activity = dayActivities[index];
    const activityEnd = clipActivityToDay(activity, selectedDate).endAt;
    const next = dayActivities[index + 1];
    const bufferMinutes = next
      ? getTravelBufferAfterActivity(activity, next.id, travelTimeSegments) || 15
      : 15;

    let start = addMinutes(activityEnd, bufferMinutes);
    let end = addMinutes(start, DEFAULT_ACTIVITY_DURATION_MINUTES);

    if (next) {
      const nextStart = clipActivityToDay(next, selectedDate).startAt;
      const travelToNext =
        getTravelBufferAfterActivity(activity, next.id, travelTimeSegments) || 15;
      const latestEnd = addMinutes(nextStart, -travelToNext);
      if (end > latestEnd) {
        end = latestEnd;
        start = addMinutes(end, -DEFAULT_ACTIVITY_DURATION_MINUTES);
      }
      if (start < activityEnd || end <= start) {
        return findNextAvailableSlot();
      }
    }

    return {
      startTime: toDateTimeLocalValue(start),
      endTime: toDateTimeLocalValue(end),
    };
  }

  function findSlotBeforeActivity(activityId: string) {
    const dayActivities = sortedDayActivities();
    const index = dayActivities.findIndex((activity) => activity.id === activityId);
    if (index === -1) return findNextAvailableSlot();

    const target = dayActivities[index];
    const targetStart = clipActivityToDay(target, selectedDate).startAt;

    if (index === 0) {
      const cursor = buildDateTime(selectedDate, PLANNER_DAY_START_HOUR);
      return {
        startTime: toDateTimeLocalValue(cursor),
        endTime: toDateTimeLocalValue(
          addMinutes(cursor, DEFAULT_ACTIVITY_DURATION_MINUTES),
        ),
      };
    }

    const previous = dayActivities[index - 1];
    const previousEnd = clipActivityToDay(previous, selectedDate).endAt;
    const travelFromPrevious =
      getTravelBufferAfterActivity(previous, target.id, travelTimeSegments) || 15;

    let end = addMinutes(targetStart, -travelFromPrevious);
    let start = addMinutes(end, -DEFAULT_ACTIVITY_DURATION_MINUTES);

    if (start < previousEnd) {
      const bufferAfterPrevious =
        getTravelBufferAfterActivity(previous, target.id, travelTimeSegments) || 15;
      start = addMinutes(previousEnd, bufferAfterPrevious);
      end = addMinutes(start, DEFAULT_ACTIVITY_DURATION_MINUTES);
      if (end > targetStart) {
        return findNextAvailableSlot();
      }
    }

    return {
      startTime: toDateTimeLocalValue(start),
      endTime: toDateTimeLocalValue(end),
    };
  }

  async function handleAddSavedPlaceToTimeline(
    location: Pick<
      ApiLocation,
      "id" | "locationTitle" | "latitude" | "longitude"
    >,
    target: NonNullable<ReturnType<typeof parseTimelineInsertTarget>>,
  ) {
    if (isLocationOnSelectedDay(location)) {
      setError(`"${location.locationTitle}" is already scheduled on this day.`);
      return;
    }

    setAddingSavedPlaceId(location.id);
    setError(null);
    setScheduleNotice(null);

    try {
      let slot: { startTime: string; endTime: string };
      if (target.type === "before") {
        slot = findSlotBeforeActivity(target.activityId);
      } else if (target.type === "after") {
        slot = findSlotAfterActivity(target.activityId);
      } else {
        slot = findNextAvailableSlot();
      }

      const start = new Date(slot.startTime);
      const end = new Date(slot.endTime);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        setError("Could not find a valid time slot. Try another position on the timeline.");
        return;
      }

      await createActivity({
        title: location.locationTitle,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        latitude: location.latitude,
        longitude: location.longitude,
      });
      setScheduleNotice(
        `Added "${location.locationTitle}" to ${selectedDay?.label ?? "this day"}.`,
      );
      setPlannerView("timeline");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add saved place to timeline",
      );
    } finally {
      setAddingSavedPlaceId(null);
    }
  }

  function handlePlannerDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);
    if (isSavedPlaceDragId(activeId)) {
      setDraggingSavedPlaceId(parseSavedPlaceDragId(activeId));
    }
  }

  async function handlePlannerDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeId = String(active.id);
    setDraggingSavedPlaceId(null);

    if (!over) return;

    const overId = String(over.id);

    if (isSavedPlaceDragId(activeId)) {
      const locationId = parseSavedPlaceDragId(activeId);
      if (!locationId) return;

      const location = [...locations]
        .sort((a, b) => a.order - b.order)
        .find((item) => item.id === locationId);
      if (!location) return;

      const insertTarget = parseTimelineInsertTarget(overId);
      if (!insertTarget) return;

      await handleAddSavedPlaceToTimeline(location, insertTarget);
      return;
    }

    if (parseTimelineInsertTarget(overId)) return;

    const dayActivityIds = sortedDayActivities().map((activity) => activity.id);
    if (!dayActivityIds.includes(activeId) || !dayActivityIds.includes(overId)) {
      return;
    }
    if (activeId === overId) return;

    const oldIndex = dayActivityIds.indexOf(activeId);
    const newIndex = dayActivityIds.indexOf(overId);
    await handleReorderActivities(arrayMove(dayActivityIds, oldIndex, newIndex));
  }

  async function handleEditActivitySave(values: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    address: string;
  }) {
    if (!editingActivity) return;

    const start = new Date(values.startTime);
    const end = new Date(values.endTime);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      setError("Choose a valid start and end time.");
      return;
    }

    setEditingActivitySaving(true);
    setError(null);

    try {
      const updated = await api.updateActivity(tripId, editingActivity.id, {
        title: values.title,
        description: values.description || undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        address: values.address || undefined,
      });
      setActivities((prev) =>
        prev
          .map((activity) => (activity.id === updated.id ? updated : activity))
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      );
      setEditingActivity(null);
      setScheduleNotice(`Updated "${updated.title}".`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update activity",
      );
    } finally {
      setEditingActivitySaving(false);
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

  async function handleSyncScheduleWithTravel() {
    const dayActivities = getActivitiesForDate(selectedDate);
    if (dayActivities.length < 2) {
      setError("Add at least two activities on this day to adjust for travel time.");
      return;
    }

    const updates = computeTravelAdjustedSchedule(
      dayActivities,
      travelTimeSegments,
    );

    if (updates.length === 0) {
      setScheduleNotice(
        "Every stop already has enough travel time. Your free-time gaps are kept.",
      );
      return;
    }

    const summary = updates
      .map(
        (update) =>
          `${update.title}: move later by ${update.travelMinutes} min travel`,
      )
      .join("\n");

    const confirmed = window.confirm(
      `Only ${updates.length} activit${updates.length === 1 ? "y" : "ies"} with too little travel time will move. Free-time gaps stay as they are.\n\n${summary}`,
    );
    if (!confirmed) return;

    setSyncingSchedule(true);
    setError(null);
    setScheduleNotice(null);

    try {
      const updatedActivities = await Promise.all(
        updates.map((update) =>
          api.updateActivity(tripId, update.activityId, {
            startTime: update.startTime,
            endTime: update.endTime,
          }),
        ),
      );

      const updatedById = new Map(
        updatedActivities.map((activity) => [activity.id, activity]),
      );
      setActivities((prev) =>
        prev
          .map((activity) => updatedById.get(activity.id) ?? activity)
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      );
      setScheduleNotice(
        `Updated ${updates.length} activit${updates.length === 1 ? "y" : "ies"} that needed more travel time. Free-time gaps were kept.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to adjust schedule",
      );
    } finally {
      setSyncingSchedule(false);
    }
  }

  async function handleMoveActivity(
    activity: ApiActivity,
    targetDateKey: string,
  ) {
    if (activityDateKey(activity) === targetDateKey) return;

    const durationMinutes = activityDurationMinutes(activity);
    const others = activities.filter((item) => item.id !== activity.id);
    const slot = findNextAvailableSlot(
      targetDateKey,
      others,
      durationMinutes,
    );
    const start = new Date(slot.startTime);
    const end = addMinutes(start, durationMinutes);

    setMovingActivityId(activity.id);
    setError(null);
    try {
      const updated = await api.updateActivity(tripId, activity.id, {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      setActivities((prev) =>
        [...prev.filter((item) => item.id !== activity.id), updated].sort(
          (a, b) => a.startTime.localeCompare(b.startTime),
        ),
      );
      handleAssignDay(targetDateKey);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to move activity",
      );
    } finally {
      setMovingActivityId(null);
    }
  }

  function handleAssignDay(dateKey: string) {
    setSelectedDate(dateKey);
    setStartTime("");
    setEndTime("");
    setRecommendationTimes({});
    setScheduleNotice(null);
    resetActivityLocation();
  }

  function handleSuggestDay() {
    const suggested = findSuggestedDay(plannerDays, activities);
    if (suggested) handleAssignDay(suggested);
  }

  function handleSelectDate(dateKey: string) {
    handleAssignDay(dateKey);
  }

  const visibleRecommendations = useMemo(() => {
    if (!recommendations) return null;
    return {
      ...recommendations,
      rows: filterRecommendationRows(
        recommendations.rows,
        activities,
        locations,
        excludedRecommendationIds,
      ),
    };
  }, [recommendations, activities, locations, excludedRecommendationIds]);

  const recommendationCategories = visibleRecommendations
    ? buildRecommendationCategories(
        visibleRecommendations.rows.flatMap((row) =>
          row.recommendations.map((place) => place.category),
        ),
      )
    : ["All"];
  const visibleRecommendationCount =
    visibleRecommendations?.rows.reduce(
      (count, row) => count + row.recommendations.length,
      0,
    ) ?? 0;
  const rawRecommendationCount =
    recommendations?.rows.reduce(
      (count, row) => count + row.recommendations.length,
      0,
    ) ?? 0;
  const selectedDay =
    plannerDays.find((day) => day.dateKey === selectedDate) ?? plannerDays[0];
  const activitiesByDate = plannerDays.reduce<Record<string, ApiActivity[]>>(
    (groups, day) => {
      groups[day.dateKey] = getActivitiesOverlappingDate(activities, day.dateKey);
      return groups;
    },
    {},
  );
  const selectedActivities = activitiesByDate[selectedDate] ?? [];
  const nextAvailableActivityTime = findNextAvailableSlot();
  const suggestedDayKey = findSuggestedDay(plannerDays, activities);
  const suggestedDay =
    plannerDays.find((day) => day.dateKey === suggestedDayKey) ?? null;
  const travelTimeByFromActivity = new Map(
    travelTimeSegments.map((segment) => [segment.fromActivityId, segment]),
  );
  const hasTimelineContent =
    selectedActivities.length > 0 ||
    (showPrayerTimes && prayerTimes != null);
  const pendingTravelAdjustments = computeTravelAdjustedSchedule(
    selectedActivities,
    travelTimeSegments,
  );
  const unplannedActivities = activities.filter(
    (activity) =>
      !plannerDays.some((day) =>
        getActivitiesOverlappingDate([activity], day.dateKey).length > 0,
      ),
  );
  const sortedLocations = [...locations].sort((a, b) => a.order - b.order);

  return (
    <div className='min-w-0 max-w-full space-y-4'>
      <section className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
        <div className='flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5'>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 text-blue-700'>
              <CalendarDays className='h-5 w-5 shrink-0' />
              <h2 className='text-lg font-bold text-gray-900 sm:text-xl'>
                Day-by-day planner
              </h2>
            </div>
            <p className='mt-1 text-sm text-gray-600'>
              Pick a day, then use Timeline, Discover, or Places below.
            </p>
          </div>
          <div className='shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700'>
            {activities.length} planned activit
            {activities.length === 1 ? "y" : "ies"}
          </div>
        </div>

        <div className='touch-scroll-x flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-3 no-scrollbar sm:px-5'>
          {plannerDays.map((day) => {
            const count = activitiesByDate[day.dateKey]?.length ?? 0;
            return (
              <button
                key={day.dateKey}
                type='button'
                onClick={() => handleSelectDate(day.dateKey)}
                className={`min-w-[7.25rem] shrink-0 rounded-lg border px-3 py-2.5 text-left transition sm:min-w-32 ${
                  selectedDate === day.dateKey
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-200 hover:bg-blue-50"
                }`}
              >
                <span className='block text-sm font-semibold'>{day.label}</span>
                <span className='block text-xs opacity-80'>{day.shortDate}</span>
                <span className='mt-1 block text-xs'>
                  {count} activit{count === 1 ? "y" : "ies"}
                </span>
              </button>
            );
          })}
        </div>

        {activities.length === 0 && (
          <div className='flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-4 py-2.5 sm:px-5'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='gap-2 bg-white'
              onClick={handleSuggestDay}
            >
              <Sparkles className='h-4 w-4' />
              Suggest {suggestedDay?.label ?? "day"}
            </Button>
            <p className='text-xs text-gray-500'>
              Jump to the day with the fewest activities.
            </p>
          </div>
        )}

        {activities.length === 0 && (
          <div className='border-b border-blue-100 bg-blue-50/50 px-4 py-4 sm:px-5'>
            <PlannerGettingStarted
              tripId={tripId}
              hasLocations={hasLocations}
              onAddActivity={() => setShowAddActivityDialog(true)}
              onBrowseDiscover={() => setPlannerView("discover")}
            />
          </div>
        )}

      <DndContext
        sensors={plannerSensors}
        collisionDetection={closestCenter}
        onDragStart={handlePlannerDragStart}
        onDragEnd={(event) => void handlePlannerDragEnd(event)}
      >
      <Tabs
        value={plannerView}
        onValueChange={(value) => setPlannerView(value as PlannerView)}
      >
        <div className='touch-scroll-x overflow-x-auto border-b border-gray-100 px-4 py-2 no-scrollbar sm:px-5'>
          <TabsList className='inline-flex h-auto min-w-max gap-1 p-1'>
          <TabsTrigger
            value='timeline'
            className='shrink-0 gap-1.5 px-3 py-2 text-sm font-semibold whitespace-nowrap'
          >
            <LayoutList className='h-4 w-4' />
            Timeline
          </TabsTrigger>
          <TabsTrigger
            value='discover'
            className='shrink-0 gap-1.5 px-3 py-2 text-sm font-semibold whitespace-nowrap'
          >
            <Compass className='h-4 w-4' />
            Discover
            {visibleRecommendationCount > 0 && (
              <span className='rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700'>
                {visibleRecommendationCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value='places'
            className='shrink-0 gap-1.5 px-3 py-2 text-sm font-semibold whitespace-nowrap'
          >
            <MapPin className='h-4 w-4' />
            Places
            {sortedLocations.length > 0 && (
              <span className='rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700'>
                {sortedLocations.length}
              </span>
            )}
          </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value='timeline' className='mt-0 p-4 sm:p-5'>
        <div className='flex min-h-0 min-w-0 flex-col lg:min-h-[min(64vh,680px)]'>
            <div className='mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
              <div className='min-w-0'>
                <h3 className='text-base font-semibold text-gray-900'>
                  {selectedDay?.label ?? "Selected day"} timeline
                </h3>
              <p className='text-sm text-gray-500'>
                {selectedDay?.shortDate ?? selectedDate}
                {prayerTimes ? ` · ${prayerTimes.timezone}` : ""}
              </p>
              <p className='mt-1 text-xs text-gray-500'>
                Drag activities to reorder. Use ⋯ on each card to edit or move.
                Drag saved places from the Places tab onto the timeline.
              </p>
            </div>
            <div className='flex min-w-0 flex-wrap items-center gap-2 sm:gap-3'>
              <Button
                type='button'
                size='sm'
                className='gap-2'
                onClick={() => setShowAddActivityDialog(true)}
              >
                <Plus className='h-4 w-4' />
                Add activity
              </Button>
              <span className='rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600'>
                {selectedActivities.length} activit
                {selectedActivities.length === 1 ? "y" : "ies"}
              </span>
            </div>
          </div>

          {(selectedActivities.length >= 2 || hasLocations) && (
            <div className='mb-4 rounded-lg border border-gray-200 bg-gray-50'>
              <button
                type='button'
                onClick={() => setShowAdvancedSchedule((prev) => !prev)}
                className='flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700'
              >
                Adjust schedule
                <ChevronDown
                  className={`h-4 w-4 transition ${showAdvancedSchedule ? "rotate-180" : ""}`}
                />
              </button>
              {showAdvancedSchedule && (
                <div className='flex flex-wrap items-center gap-3 border-t border-gray-200 px-3 py-3'>
                  {selectedActivities.length >= 2 && (
                    <>
                      <label className='flex items-center gap-2 text-xs font-medium text-gray-600'>
                        <span>Travel by</span>
                        <select
                          value={travelMode}
                          onChange={(e) =>
                            handleTravelModeChange(e.target.value as TravelMode)
                          }
                          className='rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs'
                        >
                          {TRAVEL_MODE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='gap-2'
                        disabled={
                          syncingSchedule ||
                          travelTimesLoading ||
                          pendingTravelAdjustments.length === 0
                        }
                        onClick={handleSyncScheduleWithTravel}
                      >
                        <Route className='h-4 w-4' />
                        {syncingSchedule
                          ? "Adjusting..."
                          : pendingTravelAdjustments.length > 0
                            ? `Add travel gaps (${pendingTravelAdjustments.length})`
                            : "Travel gaps applied"}
                      </Button>
                    </>
                  )}
                  {hasLocations && (
                    <label className='flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800'>
                      <input
                        type='checkbox'
                        checked={showPrayerTimes}
                        onChange={(e) => setShowPrayerTimes(e.target.checked)}
                        className='rounded border-emerald-300'
                      />
                      Show prayer times
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          {scheduleNotice && (
            <p className='mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800'>
              {scheduleNotice}
            </p>
          )}

          {loading || prayerTimesLoading ? (
            <p className='text-sm text-gray-500'>
              {loading ? "Loading activities..." : "Loading prayer times..."}
            </p>
          ) : !hasTimelineContent ? (
            <div className='rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center'>
              {sortedLocations.length > 0 && (
                <div className='mb-4 text-left'>
                  <TimelineInsertDropZone
                    id={TIMELINE_INSERT_EMPTY}
                    visible={draggingSavedPlaceId != null}
                    label='Drop a saved place here to start this day'
                  />
                </div>
              )}
              <p className='font-medium text-gray-700'>
                No activities planned for this day yet.
              </p>
              <p className='mt-1 text-sm text-gray-500'>
                Add an activity, browse Discover for ideas, or drag a saved
                place from the Places tab.
              </p>
              <div className='mt-4 flex flex-wrap justify-center gap-2'>
                <Button
                  type='button'
                  size='sm'
                  className='gap-2'
                  onClick={() => setShowAddActivityDialog(true)}
                >
                  <Plus className='h-4 w-4' />
                  Add activity
                </Button>
                {sortedLocations.length > 0 && (
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='gap-2'
                    onClick={() => setPlannerView("places")}
                  >
                    <MapPin className='h-4 w-4' />
                    Open Places
                  </Button>
                )}
                {hasLocations && visibleRecommendationCount > 0 && (
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='gap-2'
                    onClick={() => setPlannerView("discover")}
                  >
                    <Compass className='h-4 w-4' />
                    Browse ideas
                  </Button>
                )}
              </div>
              {!hasLocations && (
                <p className='mt-2 text-sm text-amber-700'>
                  Add a trip location to show prayer times on this timeline.
                </p>
              )}
            </div>
          ) : (
            <div className='flex min-h-0 flex-1 flex-col'>
            <PlannerStretchTimeline
              tripId={tripId}
              dateKey={selectedDate}
              activities={selectedActivities}
              prayerTimes={prayerTimes}
              showPrayerTimes={showPrayerTimes}
              plannerDays={plannerDays}
              travelTimeByFromActivity={travelTimeByFromActivity}
              travelTimesLoading={travelTimesLoading || reorderingActivities}
              travelTimesError={travelTimesError}
              movingActivityId={movingActivityId}
              reorderingActivities={reorderingActivities}
              onMoveActivity={handleMoveActivity}
              onDeleteActivity={handleDelete}
              onEditActivity={setEditingActivity}
              onReorderActivities={handleReorderActivities}
              showInsertDropZones={draggingSavedPlaceId != null}
              stretchHeight
            />
            </div>
          )}

          {prayerTimesError && showPrayerTimes && (
            <p className='mt-3 text-sm text-amber-700'>{prayerTimesError}</p>
          )}
          {prayerTimes && showPrayerTimes && !prayerTimesLoading && (
            <p className='mt-3 text-xs text-gray-500'>
              Prayer times from Aladhan API (method 2) for your trip location.
            </p>
          )}
        </div>
        </TabsContent>

        <TabsContent value='discover' className='mt-0 p-4 sm:p-5'>
        <div className='min-w-0 space-y-4'>
        <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
          <div className='min-w-0'>
            <h3 className='text-base font-semibold text-gray-900'>
              Discover nearby ideas
            </h3>
            <p className='text-sm text-gray-600'>
              One-click to add suggestions to {selectedDay?.label ?? "the selected day"}{" "}
              ({selectedDay?.shortDate ?? selectedDate}). Times are picked
              automatically — expand a card to adjust.
            </p>
          </div>
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={
              !hasLocations || recommendationsLoading || recommendationsRefreshing
            }
            onClick={handleRefreshRecommendations}
            className='w-full shrink-0 gap-2 sm:w-auto'
          >
            <RefreshCw
              className={`h-4 w-4 ${
                recommendationsRefreshing ? "animate-spin" : ""
              }`}
            />
            {recommendationsRefreshing
              ? "Finding new ideas..."
              : "Suggest new recommendations"}
          </Button>
        </div>

        {!hasLocations ? (
          <p className='text-sm text-gray-500'>
            Add at least one location before requesting activity
            recommendations.
          </p>
        ) : recommendationsLoading ? (
          <p className='text-sm text-gray-500'>Loading recommendations...</p>
        ) : !visibleRecommendations ? (
          <p className='text-sm text-gray-500'>
            No recommendations loaded yet.
          </p>
        ) : visibleRecommendationCount === 0 ? (
          <div className='rounded-lg border border-blue-100 bg-white p-4 text-sm text-gray-600'>
            {rawRecommendationCount > 0 ? (
              <>
                All current suggestions are already in your itinerary or saved
                places. Try suggesting new recommendations for different ideas.
              </>
            ) : (
              <>No new recommendations found near your trip locations right now.</>
            )}
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='mt-3 gap-2'
              disabled={recommendationsRefreshing}
              onClick={handleRefreshRecommendations}
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  recommendationsRefreshing ? "animate-spin" : ""
                }`}
              />
              Suggest new recommendations
            </Button>
          </div>
        ) : (
          <div className='space-y-5'>
            <p className='rounded-lg bg-white p-3 text-sm text-blue-800'>
              {visibleRecommendations.note}
            </p>
            <div className='touch-scroll-x flex gap-2 overflow-x-auto pb-1'>
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
            {visibleRecommendations.rows.map((row) => (
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
                        const time = defaultRecommendationTime(place);
                        const scheduleMeta = getRecommendationScheduleMeta(place);

                        return (
                          <PlannerRecommendationCard
                            key={place.id}
                            place={place}
                            dayLabel={selectedDay?.label ?? "day"}
                            startTime={time.startTime}
                            endTime={time.endTime}
                            scheduleMeta={scheduleMeta}
                            submitting={submitting}
                            onAdd={() =>
                              handleAddRecommendation(
                                place,
                                row.sourceLocation.title,
                              )
                            }
                            onUpdateTime={(field, value) =>
                              updateRecommendationTime(place, field, value)
                            }
                          />
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
        </div>
        </TabsContent>

        <TabsContent value='places' className='mt-0 p-4 sm:p-5'>
          <div
            className={`flex min-h-0 min-w-0 flex-col ${
              sortedLocations.length > 0 ? "lg:min-h-[min(40vh,360px)]" : ""
            }`}
          >
            <div className='mb-3 flex shrink-0 items-center justify-between gap-2'>
              <div className='flex items-center gap-2'>
                <MapPin className='h-5 w-5 shrink-0 text-blue-600' />
                <h3 className='text-base font-semibold text-gray-900'>
                  Saved trip places
                </h3>
              </div>
              {sortedLocations.length > 0 && (
                <span className='shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600'>
                  {sortedLocations.length}
                </span>
              )}
            </div>
            {sortedLocations.length === 0 ? (
              <p className='text-sm text-gray-500'>
                Add destinations on the Locations tab to use them when planning
                your days.
              </p>
            ) : (
              <>
                <p className='mb-2 shrink-0 text-sm text-gray-600'>
                  Drag to a blue slot on the Timeline tab, or tap + to add at
                  the end of {selectedDay?.label ?? "this day"}.
                </p>
                <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5'>
                  <ul className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
                    {sortedLocations.map((location, index) => (
                      <SavedPlaceDraggable
                        key={location.id}
                        locationId={location.id}
                        title={location.locationTitle}
                        latitude={location.latitude}
                        longitude={location.longitude}
                        index={index}
                        adding={addingSavedPlaceId === location.id}
                        onTimeline={isLocationOnSelectedDay(location)}
                        onQuickAdd={() =>
                          void handleAddSavedPlaceToTimeline(location, {
                            type: "end",
                          })
                        }
                      />
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <DragOverlay dropAnimation={null}>
        {draggingSavedPlaceId ? (
          (() => {
            const dragged = sortedLocations.find(
              (location) => location.id === draggingSavedPlaceId,
            );
            if (!dragged) return null;
            return (
              <div className='w-64 rounded-lg border border-blue-300 bg-white p-3 shadow-lg'>
                <p className='text-sm font-medium text-gray-900'>
                  {dragged.locationTitle}
                </p>
                <p className='mt-1 text-xs text-blue-600'>Drop on timeline</p>
              </div>
            );
          })()
        ) : null}
      </DragOverlay>
      </DndContext>
      </section>

      {error && <p className='text-red-600'>{error}</p>}

      <ActivityAddDialog
        open={showAddActivityDialog}
        saving={submitting}
        dateKey={selectedDate}
        dayLabel={selectedDay?.label ?? "Selected day"}
        shortDate={selectedDay?.shortDate ?? selectedDate}
        locations={sortedLocations}
        defaultStartTime={nextAvailableActivityTime.startTime}
        defaultEndTime={nextAvailableActivityTime.endTime}
        onClose={() => setShowAddActivityDialog(false)}
        onSave={handleAddActivitySave}
        onSearchPlaces={(query) => api.searchPlaces(query)}
      />

      <ActivityEditDialog
        activity={editingActivity}
        open={editingActivity != null}
        saving={editingActivitySaving}
        onClose={() => setEditingActivity(null)}
        onSave={handleEditActivitySave}
      />

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
