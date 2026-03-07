import React from "react";
import { Map as MapIcon } from "lucide-react";
import { getSession } from "@/lib/auth";
import Link from "next/link";

export default async function LandingPage() {
  const session = await getSession();
  const isLoggedIn = !!session;

  return (
    <main className="relative flex flex-col items-center justify-evenly min-h-screen p-8 text-center bg-gradient-to-b from-white to-gray-50 overflow-hidden">
      <div className="max-w-4xl mx-auto z-10">
        <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent pb-4">
          Your Journeys, Visualized
        </h1>
        <p className="mt-4 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
          Track your travels and bring your adventures to life with an interactive 3D globe.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          {isLoggedIn ? (
            <Link
              href="/trips"
              className="w-full sm:w-auto bg-black text-white hover:bg-gray-800 px-6 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              Check it Out
            </Link>
          ) : (
            <Link
              href="/login"
              className="w-full sm:w-auto bg-green-600 text-white hover:bg-green-700 px-6 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              Sign Up Now
            </Link>
          )}
        </div>
      </div>
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Plan with confidence</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg border border-gray-100 shadow-sm bg-white">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <MapIcon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Interactive Maps</h3>
              <p className="text-gray-600">Visualize your trip with interactive maps.</p>
            </div>
            <div className="p-6 rounded-lg border border-gray-100 shadow-sm bg-white">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Day-by-Day Itineraries</h3>
              <p className="text-gray-600">Organize your trip day by day.</p>
            </div>
            <div className="p-6 rounded-lg border border-gray-100 shadow-sm bg-white">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 15a4 4 0 004 4h9a5 5 0 10-4.5-6.5L12 7" />
                  <path d="M15 5v4h4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Drag & Drop Planning</h3>
              <p className="text-gray-600">Easily rearrange your itinerary.</p>
            </div>
          </div>
        </div>
      </section>
      <footer className="absolute bottom-8 text-gray-500 text-sm z-10">
        <p>The Full-Stack Travel Planner.</p>
      </footer>
    </main>
  );
}
