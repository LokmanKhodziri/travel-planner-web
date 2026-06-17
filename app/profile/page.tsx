import ChangePasswordForm from "@/components/change-password-form";
import ProfileAvatar from "@/components/profile-avatar";
import ProfileForm from "@/components/profile-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchApiServer, getSession } from "@/lib/auth";
import { formatTimezoneLabel } from "@/lib/timezones";
import { formatDate } from "@/lib/utils";
import type { ApiUser } from "@/types/api";
import { Calendar, Globe2, MapPin, Shield, User } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  let user: ApiUser = session;

  try {
    user = await fetchApiServer<ApiUser>("/api/auth/me");
  } catch {
    user = session;
  }

  const stats = user.stats ?? {
    trips: 0,
    activities: 0,
    locations: 0,
    upcomingTrips: 0,
  };

  return (
    <div className='page-shell min-w-0 space-y-6 py-8 sm:space-y-8 sm:py-10'>
      <header>
        <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>Profile</h1>
        <p className='mt-2 text-gray-600'>
          Manage your account, photo, home location, and travel stats.
        </p>
      </header>

      <div className='grid gap-6 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] xl:grid-cols-[minmax(300px,360px)_minmax(0,720px)] xl:justify-center 2xl:max-w-6xl 2xl:mx-auto'>
        <Card className='border-gray-200'>
          <CardContent className='flex flex-col items-center px-6 py-8 text-center'>
            <ProfileAvatar
              name={user.name}
              email={user.email}
              image={user.image}
            />
            <h2 className='mt-4 text-xl font-semibold text-gray-900'>
              {user.name ?? "Travel Planner"}
            </h2>
            <p className='mt-1 text-sm text-gray-500'>{user.email}</p>
            <span
              className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                user.role === "ADMIN"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {user.role === "ADMIN" ? (
                <Shield className='h-3.5 w-3.5' />
              ) : (
                <User className='h-3.5 w-3.5' />
              )}
              {user.role === "ADMIN" ? "Admin" : "Traveler"}
            </span>
            {user.homeCity && (
              <p className='mt-3 text-sm text-gray-600'>
                Home: {user.homeCity}
              </p>
            )}
            {user.timezone && (
              <p className='mt-1 text-xs text-gray-500'>
                {formatTimezoneLabel(user.timezone)}
              </p>
            )}
            {user.createAt && (
              <p className='mt-4 text-xs text-gray-500'>
                Member since {formatDate(new Date(user.createAt))}
              </p>
            )}
          </CardContent>
        </Card>

        <div className='space-y-6'>
          <section className='grid grid-cols-3 gap-2 sm:gap-4 xl:max-w-2xl'>
            <Card className='border-gray-200'>
              <CardHeader className='p-3 pb-1 sm:p-6 sm:pb-2'>
                <CardTitle className='text-xs font-medium text-gray-500 sm:text-sm'>
                  Trips
                </CardTitle>
              </CardHeader>
              <CardContent className='p-3 pt-0 sm:p-6 sm:pt-0'>
                <p className='text-2xl font-bold text-gray-900 sm:text-3xl'>{stats.trips}</p>
                <p className='mt-1 text-[11px] text-gray-500 sm:text-xs'>
                  {stats.upcomingTrips} upcoming
                </p>
              </CardContent>
            </Card>
            <Card className='border-gray-200'>
              <CardHeader className='p-3 pb-1 sm:p-6 sm:pb-2'>
                <CardTitle className='text-xs font-medium text-gray-500 sm:text-sm'>
                  Activities
                </CardTitle>
              </CardHeader>
              <CardContent className='p-3 pt-0 sm:p-6 sm:pt-0'>
                <p className='text-2xl font-bold text-gray-900 sm:text-3xl'>
                  {stats.activities}
                </p>
                <p className='mt-1 text-[11px] text-gray-500 sm:text-xs'>Planned stops</p>
              </CardContent>
            </Card>
            <Card className='border-gray-200'>
              <CardHeader className='p-3 pb-1 sm:p-6 sm:pb-2'>
                <CardTitle className='text-xs font-medium text-gray-500 sm:text-sm'>
                  Locations
                </CardTitle>
              </CardHeader>
              <CardContent className='p-3 pt-0 sm:p-6 sm:pt-0'>
                <p className='text-2xl font-bold text-gray-900 sm:text-3xl'>
                  {stats.locations}
                </p>
                <p className='mt-1 text-[11px] text-gray-500 sm:text-xs'>Saved places</p>
              </CardContent>
            </Card>
          </section>

          <Card className='border-gray-200'>
            <CardHeader>
              <CardTitle>Account settings</CardTitle>
            </CardHeader>
            <CardContent className='form-well'>
              <ProfileForm user={user} />
            </CardContent>
          </Card>

          {user.hasPassword ? (
            <Card className='border-gray-200'>
              <CardHeader>
                <CardTitle>Change password</CardTitle>
              </CardHeader>
              <CardContent className='form-well'>
                <ChangePasswordForm />
              </CardContent>
            </Card>
          ) : (
            <Card className='border-gray-200 bg-gray-50'>
              <CardHeader>
                <CardTitle>Password</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-gray-600'>
                  This account uses Google or GitHub sign-in, so there is no
                  password to change here.
                </p>
              </CardContent>
            </Card>
          )}

          <Card className='border-gray-200'>
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
            </CardHeader>
            <CardContent className='flex flex-wrap gap-3'>
              <Button asChild variant='outline'>
                <Link href='/trips'>
                  <Calendar className='h-4 w-4' />
                  My Trips
                </Link>
              </Button>
              <Button asChild variant='outline'>
                <Link href='/globe'>
                  <Globe2 className='h-4 w-4' />
                  Globe
                </Link>
              </Button>
              <Button asChild variant='outline'>
                <Link href='/dashboard'>
                  <MapPin className='h-4 w-4' />
                  Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
