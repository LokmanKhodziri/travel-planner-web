"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ApiLocation, PlaceSuggestion } from "@/types/api";
import { Button } from "./ui/button";

const MIN_DURATION_MINUTES = 30;
const DEFAULT_DURATION_MINUTES = 120;

const DURATION_OPTIONS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "3 hours", minutes: 180 },
  { label: "4 hours", minutes: 240 },
] as const;

interface ActivityAddDialogProps {
  open: boolean;
  saving: boolean;
  dateKey: string;
  dayLabel: string;
  shortDate: string;
  locations: Pick<ApiLocation, "id" | "locationTitle" | "latitude" | "longitude">[];
  defaultStartTime: string;
  defaultEndTime: string;
  onClose: () => void;
  onSave: (values: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  onSearchPlaces: (query: string) => Promise<PlaceSuggestion[]>;
}

function toTimeInputValue(dateTimeLocal: string) {
  const date = new Date(dateTimeLocal);
  if (Number.isNaN(date.getTime())) return "09:00";
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function buildDateTime(dateKey: string, timeValue: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
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

function durationFromSlot(startTime: string, endTime: string) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return DEFAULT_DURATION_MINUTES;
  }
  return Math.max(
    MIN_DURATION_MINUTES,
    Math.round((end.getTime() - start.getTime()) / 60000),
  );
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export default function ActivityAddDialog({
  open,
  saving,
  dateKey,
  dayLabel,
  shortDate,
  locations,
  defaultStartTime,
  defaultEndTime,
  onClose,
  onSave,
  onSearchPlaces,
}: ActivityAddDialogProps) {
  const [startTimeValue, setStartTimeValue] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION_MINUTES);
  const [showCustomEnd, setShowCustomEnd] = useState(false);
  const [customEndTime, setCustomEndTime] = useState("");
  const [activityLocationId, setActivityLocationId] = useState("");
  const [activityAddress, setActivityAddress] = useState("");
  const [activityLatitude, setActivityLatitude] = useState<number | null>(null);
  const [activityLongitude, setActivityLongitude] = useState<number | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<PlaceSuggestion[]>([]);
  const [addressSuggestionsLoading, setAddressSuggestionsLoading] = useState(false);
  const addressDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    setStartTimeValue(toTimeInputValue(defaultStartTime));
    setDurationMinutes(durationFromSlot(defaultStartTime, defaultEndTime));
    setShowCustomEnd(false);
    setCustomEndTime(toTimeInputValue(defaultEndTime));
    setActivityLocationId("");
    setActivityAddress("");
    setActivityLatitude(null);
    setActivityLongitude(null);
    setAddressSuggestions([]);
  }, [open, defaultStartTime, defaultEndTime]);

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
        const results = await onSearchPlaces(trimmedAddress);
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
  }, [activityAddress, activityLocationId, onSearchPlaces]);

  const endPreview = useMemo(() => {
    const start = buildDateTime(dateKey, startTimeValue);
    if (showCustomEnd) {
      const end = buildDateTime(dateKey, customEndTime);
      return end > start ? end : addMinutes(start, MIN_DURATION_MINUTES);
    }
    return addMinutes(start, durationMinutes);
  }, [
    dateKey,
    startTimeValue,
    durationMinutes,
    showCustomEnd,
    customEndTime,
  ]);

  const timeValidation = useMemo(() => {
    const start = buildDateTime(dateKey, startTimeValue);
    if (Number.isNaN(start.getTime())) {
      return { valid: false, message: "Choose a valid start time." };
    }
    if (endPreview <= start) {
      return { valid: false, message: "End time must be after start time." };
    }
    return { valid: true, message: null as string | null };
  }, [dateKey, startTimeValue, endPreview]);

  if (!open) return null;

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!timeValidation.valid) return;

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;

    const start = buildDateTime(dateKey, startTimeValue);
    onSave({
      title,
      description: String(form.get("description") ?? "").trim() || undefined,
      startTime: start.toISOString(),
      endTime: endPreview.toISOString(),
      address: activityAddress.trim() || undefined,
      latitude: activityLatitude ?? undefined,
      longitude: activityLongitude ?? undefined,
    });
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
      <div
        className='max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-xl'
        role='dialog'
        aria-modal='true'
        aria-labelledby='activity-add-title'
      >
        <div className='mb-4 flex items-start justify-between gap-3'>
          <div>
            <h3 id='activity-add-title' className='text-lg font-semibold text-gray-900'>
              Add activity
            </h3>
            <p className='mt-1 text-sm text-gray-500'>
              {dayLabel} · {shortDate}
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100'
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <input
            name='title'
            required
            autoFocus
            placeholder='Activity title (e.g. Museum visit)'
            className='w-full rounded-lg border border-gray-300 p-3 text-sm'
          />
          <textarea
            name='description'
            rows={2}
            placeholder='Notes (optional)'
            className='w-full rounded-lg border border-gray-300 p-3 text-sm'
          />

          {locations.length > 0 && (
            <select
              value={activityLocationId}
              onChange={(e) => handleSelectSavedLocation(e.target.value)}
              className='w-full rounded-lg border border-gray-300 p-3 text-sm'
            >
              <option value=''>Use a saved trip place (optional)</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.locationTitle}
                </option>
              ))}
            </select>
          )}

          <div className='relative'>
            <input
              type='text'
              placeholder='Address or location (optional)'
              value={activityAddress}
              onChange={(e) => {
                setActivityLocationId("");
                setActivityAddress(e.target.value);
                setActivityLatitude(null);
                setActivityLongitude(null);
              }}
              onBlur={() => window.setTimeout(() => setAddressSuggestions([]), 150)}
              className='w-full rounded-lg border border-gray-300 p-3 text-sm'
            />
            {addressSuggestions.length > 0 && (
              <ul className='absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg'>
                {addressSuggestions.map((suggestion) => (
                  <li
                    key={suggestion.id}
                    className='cursor-pointer px-4 py-3 text-sm text-gray-800 hover:bg-slate-50'
                    onMouseDown={() => {
                      setActivityLocationId("");
                      setActivityAddress(suggestion.description);
                      setActivityLatitude(null);
                      setActivityLongitude(null);
                      setAddressSuggestions([]);
                    }}
                  >
                    {suggestion.description}
                  </li>
                ))}
              </ul>
            )}
            {addressSuggestionsLoading && (
              <p className='mt-1 text-xs text-gray-500'>Searching places...</p>
            )}
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <label className='space-y-1 text-sm'>
              <span className='font-medium text-gray-700'>Start time</span>
              <input
                type='time'
                value={startTimeValue}
                onChange={(e) => setStartTimeValue(e.target.value)}
                required
                className='w-full rounded-lg border border-gray-300 p-2.5'
              />
            </label>
            {!showCustomEnd ? (
              <label className='space-y-1 text-sm'>
                <span className='font-medium text-gray-700'>Duration</span>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className='w-full rounded-lg border border-gray-300 p-2.5'
                >
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option.minutes} value={option.minutes}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className='space-y-1 text-sm'>
                <span className='font-medium text-gray-700'>End time</span>
                <input
                  type='time'
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                  required
                  className='w-full rounded-lg border border-gray-300 p-2.5'
                />
              </label>
            )}
          </div>

          <button
            type='button'
            onClick={() => setShowCustomEnd((prev) => !prev)}
            className='text-xs text-blue-600 hover:underline'
          >
            {showCustomEnd ? "Use duration instead" : "Set exact end time"}
          </button>

          {timeValidation.valid ? (
            <p className='text-xs text-gray-500'>
              {toDateTimeLocalValue(buildDateTime(dateKey, startTimeValue)).slice(11)} –{" "}
              {toDateTimeLocalValue(endPreview).slice(11)} (
              {formatDuration(
                Math.round(
                  (endPreview.getTime() -
                    buildDateTime(dateKey, startTimeValue).getTime()) /
                    60000,
                ),
              )}
              )
            </p>
          ) : (
            timeValidation.message && (
              <p className='rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800'>
                {timeValidation.message}
              </p>
            )
          )}

          <div className='flex justify-end gap-2 pt-2'>
            <Button type='button' variant='outline' onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type='submit' disabled={saving || !timeValidation.valid}>
              {saving ? "Adding..." : "Add activity"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
