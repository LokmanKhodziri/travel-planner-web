"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import dynamic from "next/dynamic";
import Link from "next/link";
import { api } from "@/lib/api";
import type { TransformedLocation } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  Globe2,
  MapPin,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Route,
} from "lucide-react";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

const TRIP_COLORS = [
  "#3b82f6",
  "#14b8a6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
];

interface TripArc {
  tripId: string;
  tripTitle: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
}

function buildTripArcs(locations: TransformedLocation[]): TripArc[] {
  const tripColorMap = new Map<string, string>();
  const arcs: TripArc[] = [];

  locations.forEach((location) => {
    if (!tripColorMap.has(location.tripId)) {
      tripColorMap.set(
        location.tripId,
        TRIP_COLORS[tripColorMap.size % TRIP_COLORS.length],
      );
    }
  });

  const byTrip = new Map<string, TransformedLocation[]>();
  locations.forEach((location) => {
    const group = byTrip.get(location.tripId) ?? [];
    group.push(location);
    byTrip.set(location.tripId, group);
  });

  byTrip.forEach((tripLocations, tripId) => {
    const sorted = [...tripLocations].sort((a, b) => a.order - b.order);
    const color = tripColorMap.get(tripId) ?? TRIP_COLORS[0];

    for (let index = 0; index < sorted.length - 1; index += 1) {
      const from = sorted[index];
      const to = sorted[index + 1];
      arcs.push({
        tripId,
        tripTitle: from.tripTitle,
        startLat: from.latitude,
        startLng: from.longitude,
        endLat: to.latitude,
        endLng: to.longitude,
        color,
      });
    }
  });

  return arcs;
}

function pointColor(
  location: TransformedLocation,
  tripColorMap: Map<string, string>,
  selectedId: string | null,
) {
  const key = `${location.tripId}-${location.order}`;
  if (selectedId === key) return "#f97316";
  return tripColorMap.get(location.tripId) ?? "#3b82f6";
}

export default function GlobeExplorer() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const globeContainerRef = useRef<HTMLDivElement>(null);
  const [globeSize, setGlobeSize] = useState({ width: 0, height: 0 });
  const [locations, setLocations] = useState<TransformedLocation[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<string>("all");
  const [selectedLocationKey, setSelectedLocationKey] = useState<string | null>(
    null,
  );
  const [autoRotate, setAutoRotate] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);

  const updateGlobeSize = useCallback(() => {
    if (globeContainerRef.current) {
      const { width, height } =
        globeContainerRef.current.getBoundingClientRect();
      setGlobeSize({ width, height });
    }
  }, []);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => updateGlobeSize());
    const currentRef = globeContainerRef.current;
    if (currentRef) {
      resizeObserver.observe(currentRef);
      updateGlobeSize();
    }
    return () => {
      if (currentRef) resizeObserver.unobserve(currentRef);
    };
  }, [updateGlobeSize]);

  useEffect(() => {
    api
      .getLocations()
      .then(setLocations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tripOptions = useMemo(() => {
    const map = new Map<string, string>();
    locations.forEach((location) => {
      map.set(location.tripId, location.tripTitle);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [locations]);

  const tripColorMap = useMemo(() => {
    const map = new Map<string, string>();
    tripOptions.forEach((trip, index) => {
      map.set(trip.id, TRIP_COLORS[index % TRIP_COLORS.length]);
    });
    return map;
  }, [tripOptions]);

  const filteredLocations = useMemo(
    () =>
      selectedTripId === "all"
        ? locations
        : locations.filter((location) => location.tripId === selectedTripId),
    [locations, selectedTripId],
  );

  const arcs = useMemo(() => buildTripArcs(filteredLocations), [filteredLocations]);

  const visitedCountries = useMemo(
    () =>
      new Set(
        locations.map((location) => location.county).filter(Boolean) as string[],
      ),
    [locations],
  );

  const selectedLocation = useMemo(
    () =>
      locations.find(
        (location) =>
          `${location.tripId}-${location.order}` === selectedLocationKey,
      ) ?? null,
    [locations, selectedLocationKey],
  );

  const flyToLocation = useCallback((location: TransformedLocation) => {
    setSelectedLocationKey(`${location.tripId}-${location.order}`);
    globeRef.current?.pointOfView(
      { lat: location.latitude, lng: location.longitude, altitude: 1.6 },
      1000,
    );
  }, []);

  const resetView = useCallback(() => {
    setSelectedLocationKey(null);
    globeRef.current?.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 1000);
  }, []);

  useEffect(() => {
    if (!isLoading && globeRef.current) {
      globeRef.current.controls().autoRotate = autoRotate;
      globeRef.current.controls().autoRotateSpeed = 0.45;
    }
  }, [isLoading, autoRotate]);

  const groupedLocations = useMemo(() => {
    const groups = new Map<string, TransformedLocation[]>();
    filteredLocations.forEach((location) => {
      const group = groups.get(location.tripId) ?? [];
      group.push(location);
      groups.set(location.tripId, group);
    });
    return Array.from(groups.entries()).map(([tripId, tripLocations]) => ({
      tripId,
      tripTitle: tripLocations[0]?.tripTitle ?? "Trip",
      color: tripColorMap.get(tripId) ?? TRIP_COLORS[0],
      locations: [...tripLocations].sort((a, b) => a.order - b.order),
    }));
  }, [filteredLocations, tripColorMap]);

  return (
    <main className='min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white'>
      <div className='container mx-auto px-4 py-8 lg:px-8'>
        <header className='mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <div className='mb-2 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200'>
              <Globe2 className='h-3.5 w-3.5' />
              Your journeys on a 3D globe
            </div>
            <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
              Travel Globe
            </h1>
            <p className='mt-2 max-w-2xl text-slate-300'>
              Explore every saved stop, follow trip routes, and fly to any
              destination you have planned.
            </p>
          </div>
          <div className='flex flex-wrap gap-3'>
            <Link href='/trips/new'>
              <Button className='gap-2 bg-blue-600 hover:bg-blue-500'>
                <Plus className='h-4 w-4' />
                New Trip
              </Button>
            </Link>
            <Link href='/trips'>
              <Button
                variant='outline'
                className='gap-2 border-slate-600 bg-slate-900 text-white hover:bg-slate-800'
              >
                My Trips
              </Button>
            </Link>
          </div>
        </header>

        <div className='grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]'>
          <div className='space-y-4'>
            <div className='flex flex-wrap gap-2'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='border-slate-600 bg-slate-900 text-white hover:bg-slate-800'
                onClick={() => setAutoRotate((value) => !value)}
              >
                {autoRotate ? (
                  <Pause className='mr-2 h-4 w-4' />
                ) : (
                  <Play className='mr-2 h-4 w-4' />
                )}
                {autoRotate ? "Pause spin" : "Auto spin"}
              </Button>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='border-slate-600 bg-slate-900 text-white hover:bg-slate-800'
                onClick={() => setShowRoutes((value) => !value)}
              >
                <Route className='mr-2 h-4 w-4' />
                {showRoutes ? "Hide routes" : "Show routes"}
              </Button>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='border-slate-600 bg-slate-900 text-white hover:bg-slate-800'
                onClick={resetView}
              >
                <RotateCcw className='mr-2 h-4 w-4' />
                Reset view
              </Button>
            </div>

            <div
              ref={globeContainerRef}
              className='relative h-[340px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl sm:h-[420px] lg:h-[620px]'
            >
              {isLoading ? (
                <div className='flex h-full items-center justify-center'>
                  <div className='h-12 w-12 animate-spin rounded-full border-b-2 border-blue-400' />
                </div>
              ) : locations.length === 0 ? (
                <div className='flex h-full flex-col items-center justify-center gap-4 px-6 text-center'>
                  <Globe2 className='h-12 w-12 text-slate-500' />
                  <div>
                    <p className='font-medium text-slate-200'>
                      No destinations on your globe yet
                    </p>
                    <p className='mt-1 text-sm text-slate-400'>
                      Add locations to your trips and they will appear here as
                      interactive pins and routes.
                    </p>
                  </div>
                  <Link href='/trips/new'>
                    <Button>Create your first trip</Button>
                  </Link>
                </div>
              ) : (
                <Globe
                  ref={globeRef}
                  globeImageUrl='//unpkg.com/three-globe/example/img/earth-night.jpg'
                  bumpImageUrl='//unpkg.com/three-globe/example/img/earth-topology.png'
                  backgroundImageUrl='//unpkg.com/three-globe/example/img/night-sky.png'
                  backgroundColor='rgba(0,0,0,0)'
                  showAtmosphere
                  atmosphereColor='#60a5fa'
                  atmosphereAltitude={0.18}
                  width={globeSize.width}
                  height={globeSize.height}
                  pointsData={filteredLocations}
                  pointLat='latitude'
                  pointLng='longitude'
                  pointAltitude={0.12}
                  pointRadius={0.55}
                  pointColor={(point: object) =>
                    pointColor(
                      point as TransformedLocation,
                      tripColorMap,
                      selectedLocationKey,
                    )
                  }
                  pointLabel={(point: object) => {
                    const location = point as TransformedLocation;
                    return `
                    <div style="padding:8px 10px;background:rgba(15,23,42,0.92);color:white;border-radius:10px;font-size:12px;max-width:220px;">
                      <strong>${location.tripTitle}</strong><br/>
                      ${location.locationTitle}
                    </div>
                  `;
                  }}
                  onPointClick={(point: object) =>
                    flyToLocation(point as TransformedLocation)
                  }
                  arcsData={showRoutes ? arcs : []}
                  arcStartLat='startLat'
                  arcStartLng='startLng'
                  arcEndLat='endLat'
                  arcEndLng='endLng'
                  arcColor='color'
                  arcAltitude={0.18}
                  arcStroke={0.6}
                  arcDashLength={0.4}
                  arcDashGap={0.2}
                  arcDashAnimateTime={2500}
                />
              )}
            </div>

            {selectedLocation && (
              <div className='rounded-xl border border-orange-400/30 bg-orange-500/10 p-4'>
                <p className='text-xs font-semibold uppercase tracking-wide text-orange-200'>
                  Selected destination
                </p>
                <p className='mt-1 text-lg font-semibold text-white'>
                  {selectedLocation.locationTitle}
                </p>
                <p className='text-sm text-slate-300'>
                  {selectedLocation.tripTitle}
                  {selectedLocation.county ? ` · ${selectedLocation.county}` : ""}
                </p>
                <Link
                  href={`/trips/${selectedLocation.tripId}`}
                  className='mt-3 inline-block text-sm font-medium text-orange-200 hover:text-orange-100'
                >
                  Open trip →
                </Link>
              </div>
            )}
          </div>

          <aside className='space-y-4'>
            <div className='rounded-xl border border-slate-700 bg-slate-900/80 p-5'>
              <h2 className='text-lg font-semibold text-white'>Your travel map</h2>
              <div className='mt-4 grid grid-cols-3 gap-3'>
                <div className='rounded-lg bg-slate-800 p-3 text-center'>
                  <p className='text-2xl font-bold text-blue-300'>
                    {tripOptions.length}
                  </p>
                  <p className='text-[11px] text-slate-400'>Trips</p>
                </div>
                <div className='rounded-lg bg-slate-800 p-3 text-center'>
                  <p className='text-2xl font-bold text-teal-300'>
                    {locations.length}
                  </p>
                  <p className='text-[11px] text-slate-400'>Stops</p>
                </div>
                <div className='rounded-lg bg-slate-800 p-3 text-center'>
                  <p className='text-2xl font-bold text-amber-300'>
                    {visitedCountries.size}
                  </p>
                  <p className='text-[11px] text-slate-400'>Countries</p>
                </div>
              </div>
            </div>

            <div className='rounded-xl border border-slate-700 bg-slate-900/80 p-5'>
              <label
                htmlFor='trip-filter'
                className='mb-2 block text-sm font-medium text-slate-300'
              >
                Filter by trip
              </label>
              <select
                id='trip-filter'
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                className='w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white'
              >
                <option value='all'>All trips</option>
                {tripOptions.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.title}
                  </option>
                ))}
              </select>
            </div>

            <div className='rounded-xl border border-slate-700 bg-slate-900/80 p-5'>
              <h2 className='mb-4 text-lg font-semibold text-white'>
                Destinations
              </h2>
              {groupedLocations.length === 0 ? (
                <p className='text-sm text-slate-400'>
                  No destinations for this filter.
                </p>
              ) : (
                <div className='max-h-[420px] space-y-4 overflow-y-auto pr-1'>
                  {groupedLocations.map((group) => (
                    <div key={group.tripId}>
                      <div className='mb-2 flex items-center gap-2'>
                        <span
                          className='h-2.5 w-2.5 rounded-full'
                          style={{ backgroundColor: group.color }}
                        />
                        <p className='text-sm font-semibold text-slate-200'>
                          {group.tripTitle}
                        </p>
                      </div>
                      <ul className='space-y-2'>
                        {group.locations.map((location) => {
                          const key = `${location.tripId}-${location.order}`;
                          const isSelected = selectedLocationKey === key;

                          return (
                            <li key={key}>
                              <button
                                type='button'
                                onClick={() => flyToLocation(location)}
                                className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                                  isSelected
                                    ? "border-orange-400 bg-orange-500/10"
                                    : "border-slate-700 bg-slate-950 hover:border-slate-500 hover:bg-slate-800"
                                }`}
                              >
                                <p className='flex items-center gap-2 text-sm font-medium text-white'>
                                  <MapPin className='h-3.5 w-3.5 shrink-0 text-slate-400' />
                                  <span className='truncate'>
                                    {location.order + 1}. {location.locationTitle}
                                  </span>
                                </p>
                                {location.county && (
                                  <p className='mt-1 pl-5 text-xs text-slate-400'>
                                    {location.county}
                                  </p>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {visitedCountries.size > 0 && (
              <div className='rounded-xl border border-slate-700 bg-slate-900/80 p-5'>
                <h2 className='mb-3 text-lg font-semibold text-white'>
                  Countries visited
                </h2>
                <div className='flex flex-wrap gap-2'>
                  {Array.from(visitedCountries)
                    .sort()
                    .map((country) => (
                      <span
                        key={country}
                        className='rounded-full border border-slate-600 bg-slate-950 px-3 py-1 text-xs text-slate-300'
                      >
                        {country}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
