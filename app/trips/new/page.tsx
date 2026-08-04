"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { UploadButton } from "@/lib/uploadthing";
import { isGoogleStaticMapUrl } from "@/lib/trip-image";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTripsPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [initialLocation, setInitialLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationAmount, setDurationAmount] = useState("");
  const [durationUnit, setDurationUnit] = useState<"days" | "months">("days");
  const [error, setError] = useState<string | null>(null);

  const autoLocationImageUrl = buildLocationImageUrl(initialLocation);
  const previewImageUrl = imageUrl ?? autoLocationImageUrl;
  const tripLengthLabel =
    startDate && endDate ? getTripLengthLabel(startDate, endDate) : null;

  function updateEndDateFromDuration(
    nextStartDate: string,
    nextAmount = durationAmount,
    nextUnit = durationUnit,
  ) {
    if (!nextStartDate || !nextAmount) return;

    const calculatedEndDate = calculateEndDate(
      nextStartDate,
      Number(nextAmount),
      nextUnit,
    );
    if (calculatedEndDate) setEndDate(calculatedEndDate);
  }

  function handleStartDateChange(value: string) {
    setStartDate(value);

    if (durationAmount) {
      updateEndDateFromDuration(value);
      return;
    }

    if (!endDate || endDate < value) {
      setEndDate(value);
    }
  }

  function handleDurationAmountChange(value: string) {
    setDurationAmount(value);
    updateEndDateFromDuration(startDate, value);
  }

  function handleDurationUnitChange(value: "days" | "months") {
    setDurationUnit(value);
    updateEndDateFromDuration(startDate, durationAmount, value);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = formData.get("title")?.toString();
    const description = formData.get("description")?.toString();
    const location = formData.get("initialLocation")?.toString().trim();
    const tripImageUrl = imageUrl ?? buildLocationImageUrl(location ?? "");
    if (!title || !description || !startDate || !endDate) return;
    if (endDate < startDate) {
      setError("End date cannot be before the start date.");
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      const trip = await api.createTrip({
        title,
        description,
        startDate,
        endDate,
        ...(tripImageUrl ? { imageUrl: tripImageUrl } : {}),
      });
      if (location) {
        await api.addLocation(trip.id, location);
      }
      router.push(`/trips/${trip.id}`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create trip. Please try again.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-10">
      <Card>
        <CardHeader>New Trip</CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                name="title"
                required
                placeholder="Trip Name..."
                className={cn(
                  "w-full border border-gray-300 px-3 py-2",
                  "rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                required
                placeholder="Trip Detail"
                className={cn(
                  "w-full border border-gray-300 px-3 py-2",
                  "rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initial Location
              </label>
              <input
                type="text"
                name="initialLocation"
                value={initialLocation}
                onChange={(e) => setInitialLocation(e.target.value)}
                placeholder="e.g. Tokyo Tower, Japan"
                className={cn(
                  "w-full border border-gray-300 px-3 py-2",
                  "rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                )}
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional. This will be added as the first location in your
                itinerary and used to generate a default trip image.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  required
                  className={cn(
                    "w-full border border-gray-300 px-3 py-2",
                    "rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className={cn(
                    "w-full border border-gray-300 px-3 py-2",
                    "rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  )}
                />
              </div>
            </div>
            <div className="rounded-md border border-blue-100 bg-blue-50/40 p-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trip Duration
              </label>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <input
                  type="number"
                  min="1"
                  value={durationAmount}
                  onChange={(e) => handleDurationAmountChange(e.target.value)}
                  placeholder="e.g. 3"
                  className={cn(
                    "w-full border border-gray-300 px-3 py-2",
                    "rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  )}
                />
                <select
                  value={durationUnit}
                  onChange={(e) =>
                    handleDurationUnitChange(e.target.value as "days" | "months")
                  }
                  className={cn(
                    "border border-gray-300 px-3 py-2",
                    "rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  )}
                >
                  <option value="days">days</option>
                  <option value="months">months</option>
                </select>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Optional. Choose a start date, then type a duration to auto-fill
                the end date.
              </p>
              {tripLengthLabel && (
                <p className="mt-2 text-xs font-medium text-blue-700">
                  {tripLengthLabel}
                </p>
              )}
            </div>
            <div>
              <label>Trip Image</label>
              {previewImageUrl && (
                <Image
                  src={previewImageUrl}
                  alt="Trip Preview"
                  className="w-full mb-4 rounded-md max-h-48 object-cover"
                  width={300}
                  height={100}
                  unoptimized={isGoogleStaticMapUrl(previewImageUrl)}
                />
              )}
              {!imageUrl && autoLocationImageUrl && (
                <p className="mb-3 text-xs text-gray-500">
                  Auto image generated from your initial location. Upload a
                  custom image to replace it.
                </p>
              )}
              <UploadButton
                endpoint="imageUploader"
                onClientUploadComplete={(res) => {
                  if (res?.[0]?.ufsUrl) setImageUrl(res[0].ufsUrl);
                }}
                onUploadError={(error) => console.error("Upload Error:", error)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "Creating..." : "Create Trip"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function buildLocationImageUrl(location: string) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const trimmedLocation = location.trim();

  if (!key || !trimmedLocation) return null;

  const params = new URLSearchParams({
    center: trimmedLocation,
    zoom: "12",
    size: "900x420",
    scale: "2",
    maptype: "roadmap",
    markers: `color:red|${trimmedLocation}`,
    key,
  });

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateEndDate(
  startDate: string,
  amount: number,
  unit: "days" | "months",
) {
  if (!Number.isFinite(amount) || amount < 1) return null;

  const date = parseDateInput(startDate);
  if (!date) return null;

  if (unit === "days") {
    date.setDate(date.getDate() + Math.floor(amount) - 1);
  } else {
    date.setMonth(date.getMonth() + Math.floor(amount));
  }

  return toDateInputValue(date);
}

function getTripLengthLabel(startDate: string, endDate: string) {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  if (!start || !end || end < start) return null;

  const days =
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return `${days} day${days === 1 ? "" : "s"} selected`;
}
