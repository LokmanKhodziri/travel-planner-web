import type { ApiActivity, NearbyPlace, PlaceOpeningHours } from "@/types/api";
import { dayStart } from "@/lib/planner-dates";

export interface RecommendationTimeSlot {
  startTime: string;
  endTime: string;
  scheduleNote?: string;
  withinOpeningHours: boolean;
}

function parseGoogleTime(value: string) {
  const padded = value.padStart(4, "0");
  const hours = Number(padded.slice(0, 2));
  const minutes = Number(padded.slice(2, 4));
  return { hours, minutes };
}

function applyTime(base: Date, time: string) {
  const { hours, minutes } = parseGoogleTime(time);
  const next = new Date(base);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function timeRangesOverlap(
  start: Date,
  end: Date,
  existingStart: Date,
  existingEnd: Date,
) {
  return start < existingEnd && end > existingStart;
}

function getOpenWindowsForDate(
  dateKey: string,
  openingHours?: PlaceOpeningHours,
): Array<{ start: Date; end: Date }> {
  if (!openingHours?.periods?.length) return [];

  const base = dayStart(dateKey);
  const targetDay = base.getDay();
  const windows: Array<{ start: Date; end: Date }> = [];

  for (const period of openingHours.periods) {
    if (period.openDay === targetDay) {
      const start = applyTime(base, period.openTime);
      const closeDayOffset =
        period.closeDay >= period.openDay
          ? period.closeDay - period.openDay
          : period.closeDay + 7 - period.openDay;
      const end = period.closeTime
        ? applyTime(addDays(base, closeDayOffset), period.closeTime)
        : addDays(start, 1);
      if (end > start) windows.push({ start, end });
      continue;
    }

    if (period.closeDay === targetDay && period.closeTime) {
      const end = applyTime(base, period.closeTime);
      const openDayOffset = period.openDay - period.closeDay;
      const start = applyTime(addDays(base, openDayOffset), period.openTime);
      if (end > start) windows.push({ start, end });
    }
  }

  return windows.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function inferLocalSpecialWindow(place: NearbyPlace, dateKey: string) {
  const label = `${place.name} ${place.address}`.toLowerCase();
  const base = dayStart(dateKey);

  if (label.includes("night market") || label.includes("pasar malam")) {
    return {
      start: applyTime(base, "1800"),
      end: applyTime(base, "2200"),
      note: "Suggested evening visit for a night market.",
    };
  }

  if (label.includes("street food")) {
    return {
      start: applyTime(base, "1130"),
      end: applyTime(base, "1330"),
      note: "Suggested lunch-hour visit for street food.",
    };
  }

  if (label.includes("market")) {
    return {
      start: applyTime(base, "0800"),
      end: applyTime(base, "1100"),
      note: "Suggested morning visit for a local market.",
    };
  }

  return {
    start: applyTime(base, "1000"),
    end: applyTime(base, "1300"),
    note: "Suggested daytime visit for this local spot.",
  };
}

function getPreferredWindows(place: NearbyPlace, dateKey: string) {
  if (isClosedOnDate(place.openingHours, dateKey)) {
    return {
      windows: [] as Array<{ start: Date; end: Date }>,
      note: undefined as string | undefined,
    };
  }

  const fromHours = getOpenWindowsForDate(dateKey, place.openingHours);
  if (fromHours.length > 0) {
    return {
      windows: fromHours,
      note: undefined as string | undefined,
    };
  }

  if (place.category === "Local special") {
    const inferred = inferLocalSpecialWindow(place, dateKey);
    return {
      windows: [{ start: inferred.start, end: inferred.end }],
      note: inferred.note,
    };
  }

  const base = dayStart(dateKey);
  return {
    windows: [
      {
        start: applyTime(base, "0900"),
        end: applyTime(base, "2100"),
      },
    ],
    note: undefined,
  };
}

function fitsWithinWindow(start: Date, end: Date, window: { start: Date; end: Date }) {
  return start >= window.start && end <= window.end;
}

function findSlotInWindow(
  window: { start: Date; end: Date },
  durationMinutes: number,
  activities: ApiActivity[],
  dateKey: string,
) {
  const dayActivities = activities
    .filter((activity) => {
      const activityStart = new Date(activity.startTime);
      const activityEnd = new Date(activity.endTime);
      const dayStartAt = dayStart(dateKey);
      const dayEndAt = addDays(dayStartAt, 1);
      return activityStart < dayEndAt && activityEnd > dayStartAt;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const candidates: Date[] = [window.start];
  for (const activity of dayActivities) {
    candidates.push(addMinutes(new Date(activity.endTime), 15));
  }

  for (const candidate of candidates) {
    if (candidate < window.start) continue;
    const end = addMinutes(candidate, durationMinutes);
    if (end > window.end) continue;

    const overlaps = dayActivities.some((activity) =>
      timeRangesOverlap(
        candidate,
        end,
        new Date(activity.startTime),
        new Date(activity.endTime),
      ),
    );
    if (!overlaps) {
      return { start: candidate, end };
    }
  }

  return null;
}

export function getOpeningHoursLabel(
  openingHours: PlaceOpeningHours | undefined,
  dateKey: string,
) {
  if (!openingHours?.weekdayText?.length) return null;
  const dayIndex = dayStart(dateKey).getDay();
  return openingHours.weekdayText[dayIndex] ?? null;
}

function isClosedOnDate(
  openingHours: PlaceOpeningHours | undefined,
  dateKey: string,
) {
  const label = getOpeningHoursLabel(openingHours, dateKey);
  return label ? /closed/i.test(label) : false;
}

export function isVisitWithinOpeningHours(
  place: NearbyPlace,
  start: Date,
  end: Date,
  dateKey: string,
) {
  const { windows } = getPreferredWindows(place, dateKey);
  const within = windows.some((window) => fitsWithinWindow(start, end, window));
  if (within) return { ok: true as const };

  const hoursLabel = getOpeningHoursLabel(place.openingHours, dateKey);
  if (hoursLabel) {
    return {
      ok: false as const,
      reason: `Outside opening hours (${hoursLabel}).`,
    };
  }

  if (place.openNow === false) {
    return {
      ok: false as const,
      reason: "This place appears to be closed at the moment.",
    };
  }

  return { ok: true as const };
}

export function suggestRecommendationTimeSlot(options: {
  place: NearbyPlace;
  dateKey: string;
  activities: ApiActivity[];
  durationMinutes: number;
}): RecommendationTimeSlot {
  const { place, dateKey, activities, durationMinutes } = options;
  const { windows, note } = getPreferredWindows(place, dateKey);
  const hoursLabel = getOpeningHoursLabel(place.openingHours, dateKey);

  if (windows.length === 0) {
    const fallbackStart = applyTime(dayStart(dateKey), "0900");
    const fallbackEnd = addMinutes(fallbackStart, durationMinutes);
    return {
      startTime: toDateTimeLocalValue(fallbackStart),
      endTime: toDateTimeLocalValue(fallbackEnd),
      scheduleNote: hoursLabel
        ? `Closed on this day (${hoursLabel}). Pick another day or time.`
        : "Opening hours unavailable for this day.",
      withinOpeningHours: false,
    };
  }

  for (const window of windows) {
    const slot = findSlotInWindow(window, durationMinutes, activities, dateKey);
    if (!slot) continue;

    const withinOpeningHours = fitsWithinWindow(slot.start, slot.end, window);
    const scheduleNote = [
      note,
      hoursLabel ? `Hours: ${hoursLabel}` : null,
      place.openNow === false && withinOpeningHours
        ? "Currently closed, but this time matches published hours."
        : null,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      startTime: toDateTimeLocalValue(slot.start),
      endTime: toDateTimeLocalValue(slot.end),
      scheduleNote: scheduleNote || undefined,
      withinOpeningHours,
    };
  }

  const firstWindow = windows[0];
  const start = firstWindow.start;
  const end = addMinutes(start, Math.min(durationMinutes, 90));
  return {
    startTime: toDateTimeLocalValue(start),
    endTime: toDateTimeLocalValue(
      end > firstWindow.end ? firstWindow.end : end,
    ),
    scheduleNote: [
      note,
      hoursLabel ? `Hours: ${hoursLabel}` : null,
      "Could not fit the full visit without overlap. Adjust the time if needed.",
    ]
      .filter(Boolean)
      .join(" "),
    withinOpeningHours: fitsWithinWindow(start, end, firstWindow),
  };
}
