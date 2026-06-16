export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function isTripActiveOnDate(
  trip: { startDate: string; endDate: string },
  date: Date,
) {
  const start = startOfDay(new Date(trip.startDate));
  const end = endOfDay(new Date(trip.endDate));
  const cursor = new Date(date);
  cursor.setHours(12, 0, 0, 0);
  return cursor >= start && cursor <= end;
}

export function isTripUpcoming(
  trip: { startDate: string; endDate: string },
  date: Date,
) {
  return startOfDay(new Date(trip.startDate)) > startOfDay(date);
}

export function isTripPast(
  trip: { startDate: string; endDate: string },
  date: Date,
) {
  return endOfDay(new Date(trip.endDate)) < startOfDay(date);
}

export function getTripDayNumber(startDate: string, today: Date) {
  const start = startOfDay(new Date(startDate));
  const cursor = startOfDay(today);
  return Math.floor((cursor.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function getTotalTripDays(startDate: string, endDate: string) {
  const start = startOfDay(new Date(startDate));
  const end = startOfDay(new Date(endDate));
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}
