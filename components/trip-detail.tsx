"use client";

import type { ApiTrip, ApiLocation, ApiActivity } from "@/types/api";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, MapPin, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Map from "./map";
import SortableItinerary from "./sortable-itinerary";
import PrayerTimesPanel from "./prayer-times-panel";
import NearbyPlacesPanel from "./nearby-places-panel";
import ItineraryActivities from "./itinerary-activities";
import TripExpensesPanel from "./trip-expenses-panel";
import { formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  activityPrimaryDateKey,
  getActivitiesOverlappingDate,
  plannerDateKey,
} from "@/lib/planner-dates";

type TripActivity = Omit<ApiActivity, "createAt" | "updateAt"> & {
  createAt: Date;
  updateAt: Date | null;
};

export type TripWithLocations = Omit<
  ApiTrip,
  "startDate" | "endDate" | "locations" | "activities"
> & {
  startDate: Date;
  endDate: Date;
  locations: (Omit<ApiLocation, "createAt" | "updateAt"> & {
    createAt: Date;
    updateAt: Date | null;
  })[];
  activities?: TripActivity[];
};

interface TripDetailClientProps {
  trip: TripWithLocations;
}

interface OverviewDay {
  dateKey: string;
  label: string;
  shortDate: string;
}

function toDateKey(date: Date) {
  return plannerDateKey(date);
}

function buildOverviewDays(startDate: Date, endDate: Date): OverviewDay[] {
  const cursor = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
    ),
  );
  const finalDay = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()),
  );
  const days: OverviewDay[] = [];

  while (cursor <= finalDay && days.length < 31) {
    days.push({
      dateKey: toDateKey(cursor),
      label: `Day ${days.length + 1}`,
      shortDate: cursor.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

function activityDateKey(activity: Pick<TripActivity, "startTime">) {
  return activityPrimaryDateKey(activity);
}

function timeOnly(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function locationsAreNearby(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusM = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const distanceM = earthRadiusM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return distanceM < 150;
}

export default function TripDetailClient({ trip }: TripDetailClientProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [tripLocations, setTripLocations] = useState(trip.locations);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const validTabs = [
      "overview",
      "itinerary",
      "activities",
      "expenses",
      "prayer",
      "nearby",
      "map",
    ];
    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleLocationAdded = (location: ApiLocation) => {
    setTripLocations((prev) => {
      if (prev.some((item) => item.id === location.id)) return prev;
      if (
        prev.some((item) =>
          locationsAreNearby(item, {
            latitude: location.latitude,
            longitude: location.longitude,
          }),
        )
      ) {
        return prev;
      }
      return [
        ...prev,
        {
          ...location,
          createAt: new Date(location.createAt),
          updateAt: location.updateAt ? new Date(location.updateAt) : null,
        },
      ].sort((a, b) => a.order - b.order);
    });
  };

  useEffect(() => {
    let cancelled = false;

    api
      .syncLocationsFromActivities(trip.id)
      .then((locations) => {
        if (cancelled) return;
        setTripLocations(
          locations.map((location) => ({
            ...location,
            createAt: new Date(location.createAt),
            updateAt: location.updateAt ? new Date(location.updateAt) : null,
          })),
        );
      })
      .catch((err) => {
        console.error("Failed to sync planner places to locations:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [trip.id]);

  const hasLocations = tripLocations.length > 0;
  const defaultDate = trip.startDate.toISOString().slice(0, 10);
  const overviewDays = buildOverviewDays(trip.startDate, trip.endDate);
  const tripActivities = trip.activities ?? [];
  const activitiesByDate = overviewDays.reduce<Record<string, TripActivity[]>>(
    (groups, day) => {
      groups[day.dateKey] = getActivitiesOverlappingDate(tripActivities, day.dateKey);
      return groups;
    },
    {},
  );
  const plannedDayCount = overviewDays.filter(
    (day) => (activitiesByDate[day.dateKey]?.length ?? 0) > 0,
  ).length;

  return (
    <div className='page-shell-wide min-w-0 space-y-6 py-6 sm:space-y-8 sm:py-8'>
      {trip.imageUrl && (
        <div className='w-full h-72 md:h-96 overflow-hidden rounded-xl shadow-lg relative'>
          <Image
            src={trip.imageUrl}
            alt={trip.title}
            className='object-cover'
            fill
            priority
          />
        </div>
      )}
      <div className='bg-white p-6 shadow rounded-lg flex flex-col gap-4 md:flex-row md:justify-between md:items-center'>
        <div className='text-center md:text-left'>
          <h1 className='text-3xl font-extrabold text-gray-800 mb-2'>
            {trip.title}
          </h1>
          <div className='flex flex-col items-center gap-2 text-gray-600 md:flex-row md:items-center'>
            <Calendar className='w-6 h-6 text-gray-500' />
            <span className='text-lg'>
              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            </span>
          </div>
        </div>
        <div className='flex justify-center md:justify-end'>
          <Link
            href={`/trips/${trip.id}/itinerary/new`}
            className='text-blue-600 hover:underline'
          >
            <Button>
              <Plus className='w-6 h-6 mr-2' />
              Add Location
            </Button>
          </Link>
        </div>
      </div>

      <div className='min-w-0 overflow-x-hidden rounded-lg bg-white p-3 shadow sm:p-4 md:p-6'>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className='-mx-1 mb-4 touch-scroll-x overflow-x-auto px-1 pb-1 no-scrollbar sm:mb-6 xl:overflow-visible xl:touch-auto'>
            <TabsList className='inline-flex h-auto min-w-max gap-1 p-1 xl:flex xl:min-w-0 xl:flex-wrap'>
            <TabsTrigger
              value='overview'
              className='shrink-0 px-3 py-2 text-sm font-semibold whitespace-nowrap'
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value='itinerary'
              className='shrink-0 px-3 py-2 text-sm font-semibold whitespace-nowrap'
            >
              Locations
            </TabsTrigger>
            <TabsTrigger
              value='activities'
              className='shrink-0 px-3 py-2 text-sm font-semibold whitespace-nowrap'
            >
              Planner
            </TabsTrigger>
            <TabsTrigger
              value='expenses'
              className='shrink-0 px-3 py-2 text-sm font-semibold whitespace-nowrap'
            >
              Expenses
            </TabsTrigger>
            <TabsTrigger
              value='prayer'
              className='shrink-0 px-3 py-2 text-sm font-semibold whitespace-nowrap'
            >
              <span className='sm:hidden'>Prayer</span>
              <span className='hidden sm:inline'>Prayer Times</span>
            </TabsTrigger>
            <TabsTrigger
              value='nearby'
              className='shrink-0 px-3 py-2 text-sm font-semibold whitespace-nowrap'
            >
              Nearby
            </TabsTrigger>
            <TabsTrigger
              value='map'
              className='shrink-0 px-3 py-2 text-sm font-semibold whitespace-nowrap'
            >
              Map
            </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='overview'>
            <div>
              <h2 className='text-xl font-semibold mb-4'>Overview</h2>
              <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] xl:items-start'>
              <div>
                <div className='grid gap-4 sm:grid-cols-2'>
                <div className='flex items-start'>
                  <Calendar className='h-6 w-6 mr-3 text-gray-500 shrink-0' />
                  <div className='text-gray-700'>
                    <p className='font-medium'>Dates</p>
                    <p className='text-sm text-gray-500'>
                      {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                      <br />
                      {`${Math.round((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24))} days`}
                    </p>
                  </div>
                </div>
                <div className='flex items-start'>
                  <MapPin className='h-6 w-6 mr-3 text-gray-500 shrink-0' />
                  <div className='text-gray-700'>
                    <p className='font-medium'>Destinations</p>
                    <p className='text-sm text-gray-500'>
                      {tripLocations.length} location
                      {tripLocations.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                </div>
                <p className='text-sm text-emerald-700 mt-4'>
                  Muslim-friendly features: prayer times, nearby mosques, and
                  Halal food.
                </p>
              <p className='text-gray-500 mt-4 leading-relaxed max-w-3xl'>
                {trip.description}
              </p>
              </div>
              <div className='rounded-xl border border-blue-100 bg-blue-50/40 p-4 xl:p-5'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <div>
                    <h3 className='text-lg font-semibold text-gray-900'>
                      Daily plan summary
                    </h3>
                    <p className='text-sm text-gray-600'>
                      {plannedDayCount} of {overviewDays.length} day
                      {overviewDays.length === 1 ? "" : "s"} have planned
                      activities.
                    </p>
                  </div>
                  <Button
                    type='button'
                    size='sm'
                    onClick={() => setActiveTab("activities")}
                  >
                    Open Planner
                  </Button>
                </div>

                <div className='mt-4 grid gap-3 sm:grid-cols-2'>
                  {overviewDays.map((day) => {
                    const dayActivities = activitiesByDate[day.dateKey] ?? [];
                    const firstActivity = dayActivities[0];
                    const lastActivity = dayActivities[dayActivities.length - 1];

                    return (
                      <div
                        key={day.dateKey}
                        className='rounded-lg border border-blue-100 bg-white p-4'
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div>
                            <p className='font-semibold text-gray-900'>
                              {day.label}
                            </p>
                            <p className='text-sm text-gray-500'>
                              {day.shortDate}
                            </p>
                          </div>
                          <span className='rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700'>
                            {dayActivities.length} activit
                            {dayActivities.length === 1 ? "y" : "ies"}
                          </span>
                        </div>

                        {dayActivities.length === 0 ? (
                          <p className='mt-3 text-sm text-gray-500'>
                            No activities planned yet.
                          </p>
                        ) : (
                          <div className='mt-3 space-y-3'>
                            <p className='flex items-center gap-2 text-sm text-gray-600'>
                              <Clock className='h-4 w-4 text-blue-600' />
                              {timeOnly(firstActivity.startTime)} -{" "}
                              {timeOnly(lastActivity.endTime)}
                            </p>
                            <ul className='space-y-1 text-sm text-gray-700'>
                              {dayActivities.slice(0, 3).map((activity) => (
                                <li key={activity.id} className='truncate'>
                                  {activity.title}
                                </li>
                              ))}
                            </ul>
                            {dayActivities.length > 3 && (
                              <p className='text-xs text-gray-500'>
                                +{dayActivities.length - 3} more in Planner
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value='itinerary'>
            <div className='space-y-6'>
              {tripLocations.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg'>
                  <h2 className='text-xl text-gray-500 mb-4'>
                    No locations added yet.
                  </h2>
                  <Link
                    href={`/trips/${trip.id}/itinerary/new`}
                    className='text-blue-600 hover:underline'
                  >
                    <Button>
                      <Plus className='w-5 h-5 mr-2' />
                      Add Your First Location
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className='flex justify-between items-center'>
                    <h2 className='text-xl font-semibold'>Full Itinerary</h2>
                    <Link
                      href={`/trips/${trip.id}/itinerary/new`}
                      className='text-blue-600 hover:underline'
                    >
                      <Button size='sm'>
                        <Plus className='w-4 h-4 mr-2' />
                        Add Location
                      </Button>
                    </Link>
                  </div>
                  <div className='content-well mt-4'>
                    <SortableItinerary
                      tripId={trip.id}
                      locations={tripLocations.map((loc) => ({
                        id: loc.id,
                        locationTitle: loc.locationTitle,
                        tripId: loc.tripId,
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        order: loc.order,
                        createAt: loc.createAt,
                        updateAt: loc.updateAt,
                      }))}
                    />
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          <TabsContent value='activities'>
            <ItineraryActivities
              tripId={trip.id}
              startDate={trip.startDate.toISOString()}
              endDate={trip.endDate.toISOString()}
              locations={tripLocations.map((loc) => ({
                id: loc.id,
                locationTitle: loc.locationTitle,
                latitude: loc.latitude,
                longitude: loc.longitude,
                order: loc.order,
              }))}
              hasLocations={hasLocations}
              onLocationAdded={handleLocationAdded}
            />
          </TabsContent>
          <TabsContent value='expenses'>
            <TripExpensesPanel
              tripId={trip.id}
              startDate={trip.startDate.toISOString()}
              endDate={trip.endDate.toISOString()}
              activities={tripActivities.map((activity) => ({
                id: activity.id,
                title: activity.title,
                startTime: activity.startTime,
              }))}
            />
          </TabsContent>
          <TabsContent value='prayer'>
            <PrayerTimesPanel
              tripId={trip.id}
              defaultDate={defaultDate}
              hasLocations={hasLocations}
            />
          </TabsContent>
          <TabsContent value='nearby'>
            <NearbyPlacesPanel tripId={trip.id} hasLocations={hasLocations} />
          </TabsContent>
          <TabsContent value='map'>
            <div className='h-72 overflow-hidden rounded-lg md:h-96 lg:h-[28rem] 2xl:h-[32rem]'>
              <h2 className='text-xl font-semibold mb-4'>Map</h2>
              <Map
                itineraries={tripLocations.map((loc, idx) => ({
                  ...loc,
                  order: idx,
                }))}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className='text-center text-gray-500 text-sm mt-8'>
        <Link href='/trips' className='text-blue-600 hover:underline'>
          <Button>Back to Trip Overview</Button>
        </Link>
      </div>
    </div>
  );
}
