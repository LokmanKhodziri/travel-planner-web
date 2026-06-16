"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { NearbyPlace } from "@/types/api";
import { ExternalLink, MapPin, Moon } from "lucide-react";

interface ActivityNearbyMosquesProps {
  tripId: string;
  activityTitle: string;
  latitude: number;
  longitude: number;
}

export default function ActivityNearbyMosques({
  tripId,
  activityTitle,
  latitude,
  longitude,
}: ActivityNearbyMosquesProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mosques, setMosques] = useState<NearbyPlace[]>([]);

  async function loadNearbyMosques() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    if (mosques.length > 0) return;

    setLoading(true);
    setError(null);
    try {
      const results = await api.getNearbyMosques(
        tripId,
        2000,
        { latitude, longitude },
      );
      setMosques(results.slice(0, 3));
      if (results.length === 0) {
        setError("No surau or masjid found within 2 km.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to find nearby mosques",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='mt-2 space-y-2'>
      <button
        type='button'
        onClick={loadNearbyMosques}
        className='flex w-full items-center justify-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-[10px] font-medium text-emerald-800 transition hover:bg-emerald-50'
        title={`Find surau or masjid near ${activityTitle}`}
      >
        <Moon className='h-3 w-3 shrink-0' />
        {open ? "Hide nearby" : "Surau / masjid"}
      </button>

      {open && (
        <div className='space-y-1.5 rounded-md border border-emerald-100 bg-white p-2 shadow-sm'>
          {loading && (
            <p className='text-[10px] text-gray-500'>Searching nearby...</p>
          )}
          {error && !loading && (
            <p className='text-[10px] text-red-600'>{error}</p>
          )}
          {!loading &&
            mosques.map((mosque) => (
              <div
                key={mosque.id}
                className='rounded border border-gray-100 bg-gray-50 p-2'
              >
                <p className='line-clamp-2 text-[10px] font-semibold text-gray-900'>
                  {mosque.name}
                </p>
                {mosque.address && (
                  <p className='mt-0.5 line-clamp-2 text-[10px] text-gray-500'>
                    {mosque.address}
                  </p>
                )}
                <div className='mt-1 flex flex-wrap items-center gap-2 text-[10px]'>
                  {mosque.rating != null && (
                    <span className='text-gray-500'>
                      ★ {mosque.rating.toFixed(1)}
                    </span>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${mosque.latitude},${mosque.longitude}`}
                    target='_blank'
                    rel='noreferrer'
                    className='inline-flex items-center gap-0.5 font-medium text-blue-600 hover:underline'
                  >
                    <MapPin className='h-3 w-3' />
                    Maps
                    <ExternalLink className='h-2.5 w-2.5' />
                  </a>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
