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
        <Link href="/trips" className="mt-6 inline-block rounded-lg bg-gray-900 px-4 py-2 text-white">
          Back to trips
        </Link>
      </div>
    );
  }

  const [summary, users, trips] = await Promise.all([
    fetchApiServer<AdminSummary>("/api/admin/summary"),
    fetchApiServer<AdminUser[]>("/api/admin/users"),
    fetchApiServer<AdminTrip[]>("/api/admin/trips"),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-600">Admin Panel</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">Travel Planner Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Monitor users, trips, locations, sessions, and itinerary activity across the platform.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Users" value={summary.users} />
        <StatCard label="Trips" value={summary.trips} />
        <StatCard label="Locations" value={summary.locations} />
        <StatCard label="Activities" value={summary.activities} />
        <StatCard label="Active Sessions" value={summary.activeSessions} />
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Recent Users</h2>
          <div className="mt-5 space-y-4">
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
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Recent Trips</h2>
          <div className="mt-5 space-y-4">
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
        </div>
      </section>
    </main>
  );
}
