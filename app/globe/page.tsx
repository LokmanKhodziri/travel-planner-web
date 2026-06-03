"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { GlobeMethods } from "react-globe.gl";
import VisitedCountriesList from "@/components/visited-countries-list";
import type { TransformedLocation } from "@/types/api";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

export default function GlobePage() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const globeContainerRef = useRef<HTMLDivElement>(null);
  const [globeSize, setGlobeSize] = useState({ width: 0, height: 0 });
  const [locations, setLocations] = useState<TransformedLocation[]>([]);
  const [visitedCountries, setVisitedCountries] = useState<Set<string>>(
    new Set(),
  );
  const [isLoading, setLoading] = useState(true);

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
      if (currentRef) {
        resizeObserver.unobserve(currentRef);
      }
    };
  }, [updateGlobeSize]);

  useEffect(() => {
    api
      .getLocations()
      .then((data) => {
        setLocations(data);
        setVisitedCountries(
          new Set(data.map((l) => l.county).filter((c): c is string => !!c)),
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isLoading && globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
    }
  }, [isLoading]);

  return (
    <main className='min-h-screen bg-gradient-to-b from-white to-gray-50'>
      <div className='container mx-auto px-6 py-12'>
        <header className='text-center mb-16'>
          <h1 className='text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent'>
            Interactive World Globe
          </h1>
          <p className='text-xl text-gray-600 max-w-2xl mx-auto'>
            Explore and discover destinations across the globe
          </p>
        </header>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 items-start'>
          <div
            ref={globeContainerRef}
            className='lg:col-span-2 bg-white rounded-2xl shadow-xl border overflow-hidden w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px]'
          >
            {isLoading ? (
              <div className='flex justify-center items-center h-full'>
                <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900' />
              </div>
            ) : (
              <Globe
                ref={globeRef}
                globeImageUrl='//unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
                bumpImageUrl='//unpkg.com/three-globe/example/img/earth-topology.png'
                backgroundColor='rgba(255,255,255,0)'
                showAtmosphere
                atmosphereColor='#4299e1'
                atmosphereAltitude={0.15}
                width={globeSize.width}
                height={globeSize.height}
                pointLabel='name'
                pointLat='latitude'
                pointLng='longitude'
                pointsData={locations}
                pointRadius={0.7}
                pointsMerge
                pointAltitude={0.1}
                pointColor={() => "#4299e1"}
              />
            )}
          </div>

          <div className='lg:col-span-1 space-y-6'>
            <div className='bg-white rounded-xl p-6 shadow-lg border border-gray-100'>
              <h2 className='text-2xl font-semibold mb-4 text-gray-800'>
                Statistics
              </h2>
              <div className='space-y-4'>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-600'>Total Destinations</span>
                  <span className='text-blue-600 font-semibold'>
                    {locations.length}
                  </span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-gray-600'>Countries Visited</span>
                  <span className='text-blue-600 font-semibold'>
                    {visitedCountries.size}
                  </span>
                </div>
              </div>
            </div>
            <div className='bg-white rounded-xl p-6 shadow-lg border border-gray-100'>
              <h2 className='text-2xl font-semibold mb-4 text-gray-800'>
                Last 5 Visited Countries
              </h2>
              <VisitedCountriesList countries={visitedCountries} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
