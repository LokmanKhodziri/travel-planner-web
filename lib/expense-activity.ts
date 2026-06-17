import { activityPrimaryDateKey } from "@/lib/planner-dates";

export interface ExpenseLinkableActivity {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
}

export interface PlannerDayOption {
  dateKey: string;
  label: string;
  shortDate: string;
}

function timeOnly(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildPlannerDayOptions(
  startDate: string,
  endDate: string,
): PlannerDayOption[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const finalDay = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  );
  const days: PlannerDayOption[] = [];
  let dayNumber = 1;

  while (cursor <= finalDay && days.length < 31) {
    const dateKey = cursor.toISOString().slice(0, 10);
    const local = new Date(cursor);
    days.push({
      dateKey,
      label: `Day ${dayNumber}`,
      shortDate: local.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    dayNumber += 1;
  }

  return days;
}

export function getActivityExpenseDate(activity: ExpenseLinkableActivity) {
  return activityPrimaryDateKey(activity);
}

export function formatActivityExpenseOption(
  activity: ExpenseLinkableActivity,
  plannerDays: PlannerDayOption[],
) {
  const dateKey = activityPrimaryDateKey(activity);
  const day = plannerDays.find((item) => item.dateKey === dateKey);
  const dayLabel = day ? `${day.label} · ${day.shortDate}` : dateKey;
  const endTime = activity.endTime ?? activity.startTime;
  return `${activity.title} · ${dayLabel} · ${timeOnly(activity.startTime)}–${timeOnly(endTime)}`;
}

export function groupActivitiesByDay(
  activities: ExpenseLinkableActivity[],
  plannerDays: PlannerDayOption[],
) {
  const groups = new Map<string, ExpenseLinkableActivity[]>();

  for (const activity of activities) {
    const dateKey = activityPrimaryDateKey(activity);
    const current = groups.get(dateKey) ?? [];
    current.push(activity);
    groups.set(dateKey, current);
  }

  return plannerDays
    .map((day) => ({
      day,
      activities: (groups.get(day.dateKey) ?? []).sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      ),
    }))
    .filter((group) => group.activities.length > 0);
}
