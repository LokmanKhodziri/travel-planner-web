"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { ApiUser } from "@/types/api";
import {
  detectBrowserTimezone,
  PROFILE_TIMEZONES,
} from "@/lib/timezones";
import { Button } from "./ui/button";

interface ProfileFormProps {
  user: ApiUser;
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [homeCity, setHomeCity] = useState(user.homeCity ?? "");
  const [timezone, setTimezone] = useState(
    user.timezone ?? detectBrowserTimezone(),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await api.updateProfile({
        name: trimmedName,
        homeCity: homeCity.trim() || null,
        timezone: timezone || null,
      });
      setMessage("Profile updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className='form-well space-y-4'>
      <label className='block space-y-1 text-sm'>
        <span className='font-medium text-gray-700'>Display name</span>
        <input
          type='text'
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className='w-full rounded-lg border border-gray-300 p-3'
          placeholder='Your name'
        />
      </label>
      <label className='block space-y-1 text-sm'>
        <span className='font-medium text-gray-700'>Email</span>
        <input
          type='email'
          value={user.email}
          readOnly
          className='w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-gray-600'
        />
      </label>
      <div className='grid gap-4 sm:grid-cols-2'>
      <label className='block space-y-1 text-sm'>
        <span className='font-medium text-gray-700'>Home city</span>
        <input
          type='text'
          value={homeCity}
          onChange={(e) => setHomeCity(e.target.value)}
          className='w-full rounded-lg border border-gray-300 p-3'
          placeholder='e.g. Kuala Lumpur'
        />
      </label>
      <label className='block space-y-1 text-sm'>
        <span className='font-medium text-gray-700'>Home timezone</span>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className='w-full rounded-lg border border-gray-300 p-3'
        >
          {!PROFILE_TIMEZONES.some((item) => item.value === timezone) &&
            timezone && (
              <option value={timezone}>{timezone}</option>
            )}
          {PROFILE_TIMEZONES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      </div>
      <p className='text-xs text-gray-500'>
        Home city and timezone help personalize prayer times and recommendations
        when you are planning from home.
      </p>
      {error && <p className='text-sm text-red-600'>{error}</p>}
      {message && <p className='text-sm text-emerald-700'>{message}</p>}
      <Button type='submit' disabled={saving}>
        {saving ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}
