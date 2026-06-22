"use client";

import { useState } from "react";
import type { NearbyPlace } from "@/types/api";
import { Button } from "./ui/button";
import { ChevronDown, Plus } from "lucide-react";

export interface RecommendationScheduleMeta {
  scheduleNote?: string;
  hoursLabel?: string | null;
  openingHoursWarning?: string | null;
}

interface PlannerRecommendationCardProps {
  place: NearbyPlace;
  dayLabel: string;
  startTime: string;
  endTime: string;
  scheduleMeta: RecommendationScheduleMeta;
  submitting: boolean;
  onAdd: () => void;
  onUpdateTime: (field: "startTime" | "endTime", value: string) => void;
}

function formatTimeRange(startTime: string, endTime: string) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Time to be scheduled";
  }
  const timeFmt: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${start.toLocaleTimeString("en-GB", timeFmt)} – ${end.toLocaleTimeString("en-GB", timeFmt)}`;
}

export default function PlannerRecommendationCard({
  place,
  dayLabel,
  startTime,
  endTime,
  scheduleMeta,
  submitting,
  onAdd,
  onUpdateTime,
}: PlannerRecommendationCardProps) {
  const [showTimeAdjust, setShowTimeAdjust] = useState(false);

  return (
    <div className='rounded-lg border border-gray-200 bg-gray-50/80 p-3 sm:p-4'>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div className='min-w-0 flex-1'>
          <p className='font-semibold text-gray-900'>{place.name}</p>
          {place.address && (
            <p className='text-sm text-gray-500'>{place.address}</p>
          )}
          {place.about && (
            <p className='mt-2 line-clamp-2 text-sm text-gray-600'>
              {place.about}
            </p>
          )}
        </div>
        {place.category && (
          <span className='shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600'>
            {place.category}
          </span>
        )}
      </div>

      <div className='mt-2 flex flex-wrap gap-3 text-xs text-gray-500'>
        {place.rating != null && (
          <span>Rating {place.rating.toFixed(1)}</span>
        )}
        {scheduleMeta.hoursLabel && <span>{scheduleMeta.hoursLabel}</span>}
        {place.openNow != null && (
          <span
            className={
              place.openNow ? "text-emerald-700" : "text-amber-700"
            }
          >
            {place.openNow ? "Open now" : "Closed now"}
          </span>
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

      <div className='mt-3 flex flex-wrap items-center gap-2'>
        <span className='rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800'>
          {formatTimeRange(startTime, endTime)}
        </span>
        <button
          type='button'
          onClick={() => setShowTimeAdjust((prev) => !prev)}
          className='inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700'
        >
          Adjust time
          <ChevronDown
            className={`h-3.5 w-3.5 transition ${showTimeAdjust ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {showTimeAdjust && (
        <div className='mt-2 grid gap-2 sm:grid-cols-2'>
          <input
            type='datetime-local'
            value={startTime}
            onChange={(e) => onUpdateTime("startTime", e.target.value)}
            className='rounded-lg border border-gray-300 p-2 text-sm'
            aria-label='Start time'
          />
          <input
            type='datetime-local'
            value={endTime}
            onChange={(e) => onUpdateTime("endTime", e.target.value)}
            className='rounded-lg border border-gray-300 p-2 text-sm'
            aria-label='End time'
          />
        </div>
      )}

      {scheduleMeta.scheduleNote && (
        <p className='mt-2 rounded-lg bg-blue-50 p-2 text-xs text-blue-800'>
          {scheduleMeta.scheduleNote}
        </p>
      )}
      {scheduleMeta.openingHoursWarning && (
        <p className='mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700'>
          {scheduleMeta.openingHoursWarning}
        </p>
      )}

      <Button
        type='button'
        size='sm'
        className='mt-3 gap-2'
        disabled={submitting}
        onClick={onAdd}
      >
        <Plus className='h-4 w-4' />
        Add to {dayLabel}
      </Button>
    </div>
  );
}
