"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { NearbyPlace } from "@/types/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface NearbyPlacesPanelProps {
  tripId: string;
  hasLocations: boolean;
}

function PlaceList({
  places,
  emptyMessage,
}: {
  places: NearbyPlace[];
  emptyMessage: string;
}) {
  if (places.length === 0) {
    return <p className='text-gray-500'>{emptyMessage}</p>;
  }

  return (
    <ul className='space-y-3'>
      {places.map((place) => (
        <li
          key={place.id}
          className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm'
        >
          <p className='font-semibold text-gray-900'>{place.name}</p>
          <p className='text-sm text-gray-600'>{place.address}</p>
          <div className='mt-2 flex flex-wrap gap-3 text-xs text-gray-500'>
            {place.rating != null && (
              <span>Rating: {place.rating.toFixed(1)}</span>
            )}
            {place.openNow != null && (
              <span>{place.openNow ? "Open now" : "Closed now"}</span>
            )}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`}
              target='_blank'
              rel='noreferrer'
              className='text-blue-600 hover:underline'
            >
              Open in Google Maps
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function NearbyPlacesPanel({
  tripId,
  hasLocations,
}: NearbyPlacesPanelProps) {
  const [mosques, setMosques] = useState<NearbyPlace[]>([]);
  const [halal, setHalal] = useState<NearbyPlace[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasLocations) return;

    setLoading(true);
    setError(null);
    Promise.all([api.getNearbyMosques(tripId), api.getNearbyHalal(tripId)])
      .then(([mosqueResults, halalResults]) => {
        setMosques(mosqueResults);
        setHalal(halalResults);
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load nearby places",
        ),
      )
      .finally(() => setLoading(false));
  }, [tripId, hasLocations]);

  if (!hasLocations) {
    return (
      <p className='text-gray-500'>
        Add at least one trip location to search for nearby mosques and Halal
        restaurants.
      </p>
    );
  }

  return (
    <div className='space-y-4'>
      {loading && (
        <p className='text-gray-500'>
          Searching within 5 km of your trip area...
        </p>
      )}
      {error && (
        <p className='text-red-600'>
          {error}. Ensure Google Places API is enabled and a valid Google API
          key is configured on the backend.
        </p>
      )}

      {!loading && !error && (
        <Tabs defaultValue='mosques'>
          <TabsList>
            <TabsTrigger value='mosques'>
              Mosques ({mosques.length})
            </TabsTrigger>
            <TabsTrigger value='halal'>Halal ({halal.length})</TabsTrigger>
          </TabsList>
          <TabsContent value='mosques' className='mt-4'>
            <PlaceList
              places={mosques}
              emptyMessage='No mosques found nearby.'
            />
          </TabsContent>
          <TabsContent value='halal' className='mt-4'>
            <PlaceList
              places={halal}
              emptyMessage='No Halal restaurants found nearby.'
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
