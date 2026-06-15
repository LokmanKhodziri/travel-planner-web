"use client";

import { useEffect } from "react";
import type { ApiLocation } from "@/types/api";
import {
  GoogleMap,
  Marker,
  useGoogleMap,
  useLoadScript,
} from "@react-google-maps/api";

interface MapProps {
  itineraries: (Pick<ApiLocation, "id" | "latitude" | "longitude" | "locationTitle"> & { order?: number })[];
}

const libraries: ("marker")[] = ["marker"];
const googleMapsMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

function AdvancedMapMarker({
  location,
}: {
  location: Pick<ApiLocation, "latitude" | "longitude" | "locationTitle">;
}) {
  const map = useGoogleMap();

  useEffect(() => {
    if (!map || !google.maps.marker?.AdvancedMarkerElement) return;

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: location.latitude, lng: location.longitude },
      title: location.locationTitle,
    });

    return () => {
      marker.map = null;
    };
  }, [location.latitude, location.locationTitle, location.longitude, map]);

  return null;
}

export default function Map({ itineraries }: MapProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries,
  });

  if (loadError) return <div>Error loading map</div>;
  if (!isLoaded) return <div>Loading map...</div>;

  const center = {
    lat: itineraries.length > 0 ? itineraries[0].latitude : 0,
    lng: itineraries.length > 0 ? itineraries[0].longitude : 0,
  };
  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      zoom={8}
      center={center}
      options={googleMapsMapId ? { mapId: googleMapsMapId } : undefined}
    >
      {itineraries.map((location) => (
        googleMapsMapId ? (
          <AdvancedMapMarker key={location.id} location={location} />
        ) : (
          <Marker
            key={location.id}
            position={{ lat: location.latitude, lng: location.longitude }}
            title={location.locationTitle}
          />
        )
      ))}
    </GoogleMap>
  );
}
