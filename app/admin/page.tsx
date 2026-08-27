import { fetchApiServer, getSession } from "@/lib/auth";
import Link from "next/link";

interface AdminSummary {
  users: number;
  trips: number;
  locations: number;
  activities: number;
  activeSessions: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  _count: {
    trip: number;
    sessions: number;
  };
}

interface AdminTrip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  createAt: string;
  user: {
    email: string;
    name: string | null;
  };
  _count: {
    locations: number;
    activities: number;
  };
}

interface AdminLocation {
  id: string;
  locationTitle: string;
  latitude: number;
  longitude: number;
  order: number;
  createAt: string;
  trip: {
    id: string;
    title: string;
    user: {
      email: string;
      name: string | null;
    };
  };
}

interface AdminPlace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  openNow?: boolean;
}

interface AdminPlaceRow {
  source: {
    id: string;
    title: string;
    latitude: number;
    longitude: number;
    tripTitle: string;
    userEmail: string;
    userName: string | null;
  };
  places: AdminPlace[];
  error: string | null;
}

interface AdminPlacesResponse {
  source: string;
  note: string;
  rows: AdminPlaceRow[];
}

interface AdminSettings {
  sessionTimeoutMinutes: number;
  accessTokenMinutes: number;
  refreshTokenDays: number;
  adminEmails: string[];
  apiUrl: string;
  frontendUrl: string;
  oauth: {
    googleConfigured: boolean;
    githubConfigured: boolean;
  };
  integrations: {
    googleMapsConfigured: boolean;
    googlePlacesConfigured: boolean;
    aladhanBase: string;
  };
}

const adminNav = [
  { href: "#overview", label: "📊 Overview" },
  { href: "#users", label: "👥 Users" },
  { href: "#trips", label: "🧳 Trips" },
  { href: "#locations", label: "📍 Locations" },
  { href: "#prayer-facilities", label: "🕌 Prayer Facilities" },
  { href: "#halal-restaurants", label: "🍽 Halal Restaurants" },
  { href: "#settings", label: "⚙ System Settings" },
];

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        enabled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {enabled ? "Configured" : "Needs setup"}
    </span>
  );
}

function PlacesSection({ data }: { data: AdminPlacesResponse }) {
  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{data.note}</p>
      {data.rows.length === 0 ? (
        <p className="text-sm text-gray-500">No saved trip locations yet.</p>
      ) : (
        data.rows.map((row) => (
          <div key={row.source.id} className="rounded-lg border border-gray-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900">{row.source.title}</p>
                <p className="text-sm text-gray-500">
                  {row.source.tripTitle} · {row.source.userName ?? row.source.userEmail}
                </p>
              </div>
              <Link
                href={`https://www.google.com/maps/search/?api=1&query=${row.source.latitude},${row.source.longitude}`}
                target="_blank"
                className="text-sm text-blue-600 hover:underline"
              >
                Open source location
              </Link>
            </div>

            {row.error ? (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{row.error}</p>
            ) : row.places.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No nearby results found.</p>
            ) : (
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {row.places.map((place) => (
                  <li key={place.id} className="rounded-lg bg-gray-50 p-3">
                    <p className="font-medium text-gray-900">{place.name}</p>
                    <p className="text-sm text-gray-500">{place.address || "No address available"}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                      {place.rating != null && <span>Rating {place.rating.toFixed(1)}</span>}
                      {place.openNow != null && <span>{place.openNow ? "Open now" : "Closed now"}</span>}
                      <Link
                        href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`}
                        target="_blank"
                        className="text-blue-600 hover:underline"
                      >
                        Maps
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Sign in required</h1>
        <p className="mt-2 text-gray-600">Please sign in before opening the admin dashboard.</p>
        <Link href="/login" className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white">
          Go to login
        </Link>
      </div>
    );
  }

  if (session.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin access required</h1>
        <p className="mt-2 text-gray-600">Your account does not have permission to view this page.</p>
        <Link href="/dashboard" className="mt-6 inline-block rounded-lg bg-gray-900 px-4 py-2 text-white">
          Back to trips
        </Link>
      </div>
    );
  }

  const [summary, users, trips, locations, prayerFacilities, halalRestaurants, settings] = await Promise.all([
    fetchApiServer<AdminSummary>("/api/admin/summary"),
    fetchApiServer<AdminUser[]>("/api/admin/users"),
    fetchApiServer<AdminTrip[]>("/api/admin/trips"),
    fetchApiServer<AdminLocation[]>("/api/admin/locations"),
    fetchApiServer<AdminPlacesResponse>("/api/admin/prayer-facilities"),
    fetchApiServer<AdminPlacesResponse>("/api/admin/halal-restaurants"),
    fetchApiServer<AdminSettings>("/api/admin/settings"),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-600">Admin Panel</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">Musafir-Go Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Monitor users, trips, locations, sessions, and itinerary activity across the platform.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-gray-900">Admin Dashboard</p>
            <nav className="space-y-1">
              {adminNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-8">
          <Section id="overview" title="📊 Overview" description="High-level platform statistics.">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Users" value={summary.users} />
              <StatCard label="Trips" value={summary.trips} />
              <StatCard label="Locations" value={summary.locations} />
              <StatCard label="Activities" value={summary.activities} />
              <StatCard label="Active Sessions" value={summary.activeSessions} />
            </div>
          </Section>

          <Section id="users" title="👥 Users" description="Recent registered users and their platform activity.">
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="rounded-lg border border-gray-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{user.name ?? "Unnamed user"}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {user.role}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {user._count.trip} trips · {user._count.sessions} sessions · Joined{" "}
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="trips" title="🧳 Trips" description="Recent trips created by users.">
            <div className="space-y-4">
              {trips.map((trip) => (
                <div key={trip.id} className="rounded-lg border border-gray-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{trip.title}</p>
                      <p className="text-sm text-gray-500">
                        {trip.user.name ?? trip.user.email} · {new Date(trip.startDate).toLocaleDateString()} -{" "}
                        {new Date(trip.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Link href={`/trips/${trip.id}`} className="text-sm text-blue-600 hover:underline">
                      View
                    </Link>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {trip._count.locations} locations · {trip._count.activities} activities
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="locations" title="📍 Locations" description="Latest saved destination locations across all trips.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-gray-100 text-gray-500">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Location</th>
                    <th className="py-3 pr-4 font-medium">Trip</th>
                    <th className="py-3 pr-4 font-medium">User</th>
                    <th className="py-3 pr-4 font-medium">Coordinates</th>
                    <th className="py-3 pr-4 font-medium">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {locations.map((location) => (
                    <tr key={location.id}>
                      <td className="py-3 pr-4 font-medium text-gray-900">{location.locationTitle}</td>
                      <td className="py-3 pr-4 text-gray-600">{location.trip.title}</td>
                      <td className="py-3 pr-4 text-gray-600">
                        {location.trip.user.name ?? location.trip.user.email}
                      </td>
                      <td className="py-3 pr-4 text-gray-500">
                        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                      </td>
                      <td className="py-3 pr-4 text-gray-500">
                        {new Date(location.createAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {locations.length === 0 && <p className="py-4 text-sm text-gray-500">No locations saved yet.</p>}
            </div>
          </Section>

          <Section
            id="prayer-facilities"
            title="🕌 Prayer Facilities"
            description="Live Google Places mosque discovery around recent trip locations."
          >
            <PlacesSection data={prayerFacilities} />
          </Section>

          <Section
            id="halal-restaurants"
            title="🍽 Halal Restaurants"
            description="Live Google Places Halal restaurant discovery around recent trip locations."
          >
            <PlacesSection data={halalRestaurants} />
          </Section>

          <Section id="settings" title="⚙ System Settings" description="Read-only runtime and integration settings.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">API URL</p>
                <p className="mt-1 break-all font-medium text-gray-900">{settings.apiUrl}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Frontend URL</p>
                <p className="mt-1 break-all font-medium text-gray-900">{settings.frontendUrl}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Access token</p>
                <p className="mt-1 font-medium text-gray-900">
                  {settings.accessTokenMinutes ?? settings.sessionTimeoutMinutes} minutes
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Refresh token</p>
                <p className="mt-1 font-medium text-gray-900">
                  {settings.refreshTokenDays ?? 7} days
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Admin emails</p>
                <p className="mt-1 break-all font-medium text-gray-900">{settings.adminEmails.join(", ")}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-500">Google OAuth</p>
                  <StatusBadge enabled={settings.oauth.googleConfigured} />
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-500">GitHub OAuth</p>
                  <StatusBadge enabled={settings.oauth.githubConfigured} />
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-500">Google Maps / Places</p>
                  <StatusBadge
                    enabled={
                      settings.integrations.googleMapsConfigured &&
                      settings.integrations.googlePlacesConfigured
                    }
                  />
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Aladhan API</p>
                <p className="mt-1 break-all font-medium text-gray-900">{settings.integrations.aladhanBase}</p>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}
