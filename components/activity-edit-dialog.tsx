"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiActivity } from "@/types/api";
import { Button } from "./ui/button";

const MIN_DURATION_MINUTES = 30;
const DEFAULT_DURATION_MINUTES = 120;

interface ActivityEditDialogProps {
  activity: ApiActivity | null;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (values: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    address: string;
  }) => void;
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

function activityDurationMinutes(activity: ApiActivity) {
  const durationMs =
    new Date(activity.endTime).getTime() - new Date(activity.startTime).getTime();
  return Math.max(
    MIN_DURATION_MINUTES,
    Math.round(durationMs / 60000) || DEFAULT_DURATION_MINUTES,
  );
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export default function ActivityEditDialog({
  activity,
  open,
  saving,
  onClose,
  onSave,
}: ActivityEditDialogProps) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION_MINUTES);

  useEffect(() => {
    if (!open || !activity) return;

    const start = new Date(activity.startTime);
    const end = new Date(activity.endTime);
    const duration = activityDurationMinutes(activity);

    setStartTime(toDateTimeLocalValue(start));
    setEndTime(toDateTimeLocalValue(end));
    setDurationMinutes(duration);
  }, [activity, open]);

  const timeValidation = useMemo(() => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { valid: false, message: "Choose valid start and end times." };
    }
    if (end <= start) {
      return {
        valid: false,
        message: "End time must be after start time.",
      };
    }
    return { valid: true, message: null as string | null };
  }, [startTime, endTime]);

  if (!open || !activity) return null;

  function handleStartChange(value: string) {
    setStartTime(value);
    const start = new Date(value);
    if (Number.isNaN(start.getTime())) return;

    setEndTime(toDateTimeLocalValue(addMinutes(start, durationMinutes)));
  }

  function handleEndChange(value: string) {
    setEndTime(value);
    const start = new Date(startTime);
    const end = new Date(value);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return;
    }

    setDurationMinutes(
      Math.max(
        MIN_DURATION_MINUTES,
        Math.round((end.getTime() - start.getTime()) / 60000),
      ),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!timeValidation.valid) return;

    const form = new FormData(event.currentTarget);
    onSave({
      title: String(form.get("title") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      startTime,
      endTime,
      address: String(form.get("address") ?? "").trim(),
    });
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
      <div
        className='w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl'
        role='dialog'
        aria-modal='true'
        aria-labelledby='activity-edit-title'
      >
        <div className='mb-4 flex items-start justify-between gap-3'>
          <div>
            <h3 id='activity-edit-title' className='text-lg font-semibold text-gray-900'>
              Edit activity
            </h3>
            <p className='mt-1 text-sm text-gray-500'>
              Update details and times. Changing start will keep the same visit
              length ({formatDuration(durationMinutes)}).
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
            defaultValue={activity.title}
            required
            placeholder='Activity title'
            className='w-full rounded-lg border border-gray-300 p-3 text-sm'
          />
          <textarea
            name='description'
            defaultValue={activity.description ?? ""}
            rows={3}
            placeholder='Notes or description'
            className='w-full rounded-lg border border-gray-300 p-3 text-sm'
          />
          <input
            name='address'
            defaultValue={activity.address ?? ""}
            placeholder='Address'
            className='w-full rounded-lg border border-gray-300 p-3 text-sm'
          />
          <div className='grid gap-3 sm:grid-cols-2'>
            <label className='space-y-1 text-sm'>
              <span className='font-medium text-gray-700'>Start</span>
              <input
                type='datetime-local'
                name='startTime'
                value={startTime}
                onChange={(e) => handleStartChange(e.target.value)}
                required
                className='w-full rounded-lg border border-gray-300 p-2.5'
              />
            </label>
            <label className='space-y-1 text-sm'>
              <span className='font-medium text-gray-700'>End</span>
              <input
                type='datetime-local'
                name='endTime'
                value={endTime}
                onChange={(e) => handleEndChange(e.target.value)}
                required
                className='w-full rounded-lg border border-gray-300 p-2.5'
              />
            </label>
          </div>
          {!timeValidation.valid && timeValidation.message && (
            <p className='rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800'>
              {timeValidation.message}
            </p>
          )}
          {timeValidation.valid && (
            <p className='text-xs text-gray-500'>
              Visit length: {formatDuration(durationMinutes)}. End updates
              automatically when you change start.
            </p>
          )}
          <div className='flex justify-end gap-2 pt-2'>
            <Button type='button' variant='outline' onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type='submit' disabled={saving || !timeValidation.valid}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
