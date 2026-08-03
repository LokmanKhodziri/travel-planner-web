import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Clock,
  Globe2,
  MapPin,
  Moon,
  Route,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

const features = [
  {
    icon: CalendarDays,
    title: "Day-by-day planner",
    description:
      "Build your trip timeline with day tabs, timed activities, and a clear view of what happens each day.",
    accent: "bg-blue-100 text-blue-700",
  },
  {
    icon: Sparkles,
    title: "Smart recommendations",
    description:
      "Get activity suggestions near your saved locations, filter by category, and add them straight into your itinerary.",
    accent: "bg-violet-100 text-violet-700",
  },
  {
    icon: Route,
    title: "Travel time estimates",
    description:
      "See estimated driving time and distance between planned stops so you can plan realistic schedules.",
    accent: "bg-amber-100 text-amber-700",
  },
  {
    icon: MapPin,
    title: "Interactive maps",
    description:
      "Visualize every stop on a map and keep your locations organized with drag-and-drop ordering.",
    accent: "bg-sky-100 text-sky-700",
  },
  {
    icon: Moon,
    title: "Prayer times",
    description:
      "Check daily prayer timings for your destination and plan activities around your worship schedule.",
    accent: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: UtensilsCrossed,
    title: "Halal & mosques nearby",
    description:
      "Find nearby mosques and Halal food options around your trip locations in a few clicks.",
    accent: "bg-teal-100 text-teal-700",
  },
];

const steps = [
  {
    step: "01",
    title: "Create your trip",
    description:
      "Set dates, add your first location, and let the app generate a default trip image from your destination.",
  },
  {
    step: "02",
    title: "Plan each day",
    description:
      "Add activities manually or from recommendations, with automatic time-slot suggestions to avoid overlaps.",
  },
  {
    step: "03",
    title: "Travel with confidence",
    description:
      "Use prayer times, nearby places, maps, and travel estimates to stay organized on the go.",
  },
];

export default async function LandingPage() {
  const session = await getSession();
  const isLoggedIn = !!session;
  const primaryHref = isLoggedIn ? "/dashboard" : "/login";
  const primaryLabel = isLoggedIn ? "Go to Dashboard" : "Start Planning Free";
  const secondaryHref = isLoggedIn ? "/globe" : "/login";
  const secondaryLabel = isLoggedIn ? "Explore Globe" : "Sign In";

  return (
    <main className='bg-white'>
      <section className='relative overflow-hidden border-b border-gray-100'>
        <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.12),_transparent_40%)]' />
        <div className='container relative mx-auto grid gap-12 px-4 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-24 lg:px-8'>
          <div className='space-y-8'>
            <p className='text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700'>
              Muslim-friendly travel planning
            </p>
            <div className='space-y-4'>
              <h1 className='text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl'>
                Musafir-Go
              </h1>
              <p className='max-w-xl text-xl font-medium text-gray-800 sm:text-2xl'>
                Plan trips day by day, without the stress.
              </p>
              <p className='max-w-xl text-lg text-gray-600'>
                Organize locations, activities, recommendations, prayer times,
                and nearby Halal options in one place — built for Muslim
                travelers.
              </p>
            </div>
            <div className='flex flex-col gap-3 sm:flex-row'>
              <Button
                asChild
                size='lg'
                className='h-12 rounded-xl bg-blue-600 px-6 text-base hover:bg-blue-700'
              >
                <Link href={primaryHref}>{primaryLabel}</Link>
              </Button>
              <Button
                asChild
                variant='outline'
                size='lg'
                className='h-12 rounded-xl px-6 text-base'
              >
                <Link href={secondaryHref}>{secondaryLabel}</Link>
              </Button>
            </div>
            <div className='flex flex-wrap gap-3 text-sm text-gray-600'>
              <span className='rounded-full bg-gray-100 px-3 py-1'>
                Day tabs & timeline
              </span>
              <span className='rounded-full bg-gray-100 px-3 py-1'>
                Activity recommendations
              </span>
              <span className='rounded-full bg-gray-100 px-3 py-1'>
                Prayer & Halal nearby
              </span>
            </div>
          </div>

          <div className='rounded-3xl border border-gray-200 bg-white p-6 shadow-xl shadow-blue-100/60'>
            <div className='mb-4 flex items-center justify-between'>
              <p className='text-sm font-semibold text-gray-900'>
                Trip preview
              </p>
              <span className='rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700'>
                Day 1
              </span>
            </div>
            <div className='space-y-3'>
              <div className='rounded-2xl border border-gray-100 bg-gray-50 p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <p className='font-semibold text-gray-900'>KLCC Park</p>
                    <p className='mt-1 text-sm text-gray-500'>
                      Attraction · Recommended near Kuala Lumpur
                    </p>
                  </div>
                  <span className='rounded-full bg-white px-2 py-1 text-xs text-gray-600'>
                    09:00 - 11:00
                  </span>
                </div>
              </div>
              <div className='rounded-xl border border-dashed border-blue-200 bg-blue-50/70 px-4 py-3 text-sm text-blue-800'>
                <Clock className='mr-2 inline h-4 w-4' />
                Travel to museum: <strong>12 mins</strong> by car (3.4 km)
              </div>
              <div className='rounded-2xl border border-gray-100 bg-gray-50 p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <p className='font-semibold text-gray-900'>Islamic Arts Museum</p>
                    <p className='mt-1 text-sm text-gray-500'>
                      Museum · Added from recommendations
                    </p>
                  </div>
                  <span className='rounded-full bg-white px-2 py-1 text-xs text-gray-600'>
                    11:15 - 13:15
                  </span>
                </div>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div className='rounded-2xl border border-emerald-100 bg-emerald-50 p-4'>
                  <Moon className='mb-2 h-5 w-5 text-emerald-700' />
                  <p className='text-sm font-medium text-emerald-900'>
                    Dhuhr 13:12
                  </p>
                  <p className='text-xs text-emerald-700'>Prayer times ready</p>
                </div>
                <div className='rounded-2xl border border-teal-100 bg-teal-50 p-4'>
                  <UtensilsCrossed className='mb-2 h-5 w-5 text-teal-700' />
                  <p className='text-sm font-medium text-teal-900'>
                    Halal nearby
                  </p>
                  <p className='text-xs text-teal-700'>Restaurants & mosques</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='border-b border-gray-100 bg-gray-50 py-16 md:py-20'>
        <div className='container mx-auto px-4 lg:px-8'>
          <div className='mx-auto mb-12 max-w-2xl text-center'>
            <h2 className='text-3xl font-bold text-gray-900 sm:text-4xl'>
              Everything you need to plan smarter
            </h2>
            <p className='mt-3 text-gray-600'>
              From first location to final day, your trip stays organized with
              tools that go beyond a simple checklist.
            </p>
          </div>
          <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
            {features.map((feature) => (
              <article
                key={feature.title}
                className='rounded-2xl border border-white bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'
              >
                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${feature.accent}`}
                >
                  <feature.icon className='h-6 w-6' />
                </div>
                <h3 className='text-xl font-semibold text-gray-900'>
                  {feature.title}
                </h3>
                <p className='mt-2 text-sm leading-6 text-gray-600'>
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className='py-16 md:py-20'>
        <div className='container mx-auto px-4 lg:px-8'>
          <div className='mx-auto mb-12 max-w-2xl text-center'>
            <h2 className='text-3xl font-bold text-gray-900 sm:text-4xl'>
              How it works
            </h2>
            <p className='mt-3 text-gray-600'>
              A simple flow from trip creation to a complete day-by-day plan.
            </p>
          </div>
          <div className='grid gap-6 md:grid-cols-3'>
            {steps.map((item) => (
              <div
                key={item.step}
                className='rounded-2xl border border-gray-200 bg-white p-6'
              >
                <span className='text-sm font-bold text-blue-600'>
                  {item.step}
                </span>
                <h3 className='mt-3 text-xl font-semibold text-gray-900'>
                  {item.title}
                </h3>
                <p className='mt-2 text-sm leading-6 text-gray-600'>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className='border-y border-emerald-100 bg-emerald-50/60 py-16 md:py-20'>
        <div className='container mx-auto grid gap-8 px-4 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-8'>
          <div>
            <h2 className='text-3xl font-bold text-gray-900 sm:text-4xl'>
              Built for Muslim-friendly travel
            </h2>
            <p className='mt-4 text-gray-600'>
              Prayer times, nearby mosques, and Halal restaurant search are built
              into your trip workflow — so planning stays practical, not
              stressful.
            </p>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='rounded-2xl border border-emerald-100 bg-white p-5'>
              <Moon className='h-6 w-6 text-emerald-700' />
              <p className='mt-3 font-semibold text-gray-900'>Prayer Times</p>
              <p className='mt-1 text-sm text-gray-600'>
                Daily timings based on your trip location.
              </p>
            </div>
            <div className='rounded-2xl border border-emerald-100 bg-white p-5'>
              <MapPin className='h-6 w-6 text-emerald-700' />
              <p className='mt-3 font-semibold text-gray-900'>Nearby Places</p>
              <p className='mt-1 text-sm text-gray-600'>
                Mosques and Halal food around saved stops.
              </p>
            </div>
            <div className='rounded-2xl border border-emerald-100 bg-white p-5 sm:col-span-2'>
              <Globe2 className='h-6 w-6 text-emerald-700' />
              <p className='mt-3 font-semibold text-gray-900'>
                3D Globe visualization
              </p>
              <p className='mt-1 text-sm text-gray-600'>
                See your journeys come to life on an interactive globe after you
                start planning.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className='py-16 md:py-24'>
        <div className='container mx-auto px-4 lg:px-8'>
          <div className='rounded-3xl bg-gradient-to-r from-blue-600 to-emerald-600 px-6 py-12 text-center text-white md:px-12'>
            <h2 className='text-3xl font-bold sm:text-4xl'>
              Ready to plan your next trip?
            </h2>
            <p className='mx-auto mt-4 max-w-2xl text-blue-50'>
              Create your itinerary, discover recommendations, and keep your
              travel days organized in one app.
            </p>
            <div className='mt-8 flex flex-col justify-center gap-3 sm:flex-row'>
              <Button
                asChild
                size='lg'
                className='h-12 rounded-xl bg-white px-6 text-base text-blue-700 hover:bg-blue-50'
              >
                <Link href={primaryHref}>{primaryLabel}</Link>
              </Button>
              {!isLoggedIn && (
                <Button
                  asChild
                  variant='outline'
                  size='lg'
                  className='h-12 rounded-xl border-white/40 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white'
                >
                  <Link href='/login'>Create Account</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className='border-t border-gray-100 py-8 text-center text-sm text-gray-500'>
        <p>Musafir-Go — plan smarter, travel better.</p>
      </footer>
    </main>
  );
}
