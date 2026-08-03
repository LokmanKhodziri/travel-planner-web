import type { TravelMode } from "@/types/api";

export const TRAVEL_MODE_STORAGE_KEY = "musafir-go-travel-mode";

export const TRAVEL_MODE_OPTIONS: {
  value: TravelMode;
  label: string;
  description: string;
}[] = [
  {
    value: "driving",
    label: "Car",
    description: "Driving times between stops",
  },
  {
    value: "transit",
    label: "Public transport",
    description: "Transit times between stops",
  },
  {
    value: "walking",
    label: "Walking",
    description: "Walking times between stops",
  },
];

export function getStoredTravelMode(): TravelMode {
  if (typeof window === "undefined") return "driving";
  const stored = window.localStorage.getItem(TRAVEL_MODE_STORAGE_KEY);
  if (stored === "walking" || stored === "transit" || stored === "driving") {
    return stored;
  }
  return "driving";
}

export function storeTravelMode(mode: TravelMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRAVEL_MODE_STORAGE_KEY, mode);
}

export function travelModeLabel(mode: TravelMode) {
  return TRAVEL_MODE_OPTIONS.find((option) => option.value === mode)?.label ?? mode;
}

export function formatTravelEstimateLabel(estimate: {
  mode?: TravelMode;
  modeLabel?: string;
  autoWalk?: boolean;
  durationText: string;
  distanceText?: string;
}) {
  const modeLabel =
    estimate.modeLabel ??
    (estimate.mode ? travelModeLabel(estimate.mode) : null);
  const prefix =
    estimate.autoWalk && modeLabel ? `${modeLabel} (nearby)` : modeLabel;
  const parts = [prefix, estimate.durationText, estimate.distanceText].filter(
    (part): part is string => Boolean(part),
  );
  return parts.length > 0 ? parts.join(" · ") : estimate.durationText;
}
