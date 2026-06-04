"use client";

import type { ApiTrip, ApiLocation, ApiActivity } from "@/types/api";
import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { useState } from "react";
import Map from "./map";
import SortableItinerary from "./sortable-itinerary";
import PrayerTimesPanel from "./prayer-times-panel";
import NearbyPlacesPanel from "./nearby-places-panel";
import ItineraryActivities from "./itinerary-activities";
import { formatDate } from "@/lib/utils";

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
  activities?: (Omit<ApiActivity, "createAt" | "updateAt"> & {
    createAt: Date;
    updateAt: Date | null;
  })[];
};

interface TripDetailClientProps {
  trip: TripWithLocations;
}

export default function TripDetailClient({ trip }: TripDetailClientProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const hasLocations = trip.locations.length > 0;
  const defaultDate = trip.startDate.toISOString().slice(0, 10);

  return (
    <div className='container mx-auto px-4 py-8 space-y-8'>
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

      <div className='bg-white p-6 shadow rounded-lg'>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className='mb-6 flex w-full flex-row flex-nowrap gap-2 overflow-x-auto overflow-y-hidden pb-1 pr-2 no-scrollbar'>
            <TabsTrigger
              value='overview'
              className='text-sm font-semibold whitespace-nowrap'
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value='itinerary'
              className='text-sm font-semibold whitespace-nowrap'
            >
              Locations
            </TabsTrigger>
            <TabsTrigger
              value='activities'
              className='text-sm font-semibold whitespace-nowrap'
            >
              Activities
            </TabsTrigger>
            <TabsTrigger
              value='prayer'
              className='text-sm font-semibold whitespace-nowrap'
            >
              Prayer Times
            </TabsTrigger>
            <TabsTrigger
              value='nearby'
              className='text-sm font-semibold whitespace-nowrap'
            >
              Nearby
            </TabsTrigger>
            <TabsTrigger
              value='map'
              className='text-sm font-semibold whitespace-nowrap'
            >
              Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value='overview'>
            <div>
              <h2 className='text-xl font-semibold mb-4'>Overview</h2>
              <div>
                <div className='flex items-start'>
                  <Calendar className='h-6 w-6 mr-3 text-gray-500' />
                  <div className='text-gray-700'>
                    <p className='font-medium'>Dates</p>
                    <p className='text-sm text-gray-500'>
                      {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                      <br />
                      {`${Math.round((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24))} days`}
                    </p>
                  </div>
                </div>
                <div className='flex items-start mt-4'>
                  <MapPin className='h-6 w-6 mr-3 text-gray-500' />
                  <p>
                    Destinations: {trip.locations.length} location
                    {trip.locations.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <p className='text-sm text-emerald-700 mt-4'>
                  Muslim-friendly features: prayer times, nearby mosques, and
                  Halal food.
                </p>
              </div>
              <p className='text-gray-500 mt-4 leading-relaxed'>
                {trip.description}
              </p>
            </div>
          </TabsContent>
          <TabsContent value='itinerary'>
            <div className='space-y-6'>
              {trip.locations.length === 0 ? (
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
                  <div className='mt-4'>
                    <SortableItinerary
                      tripId={trip.id}
                      locations={trip.locations.map((loc) => ({
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
            <ItineraryActivities tripId={trip.id} />
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
            <div className='h-72 md:h-96 lg:h-130 rounded-lg overflow-hidden'>
              <h2 className='text-xl font-semibold mb-4'>Map</h2>
              <Map
                itineraries={trip.locations.map((loc, idx) => ({
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
