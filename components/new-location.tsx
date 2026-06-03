"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import type { PlaceSuggestion } from "@/types/api";

export default function NewLocationClient({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!address.trim() || address.trim().length < 2) {
      setSuggestions([]);
      setSuggestionError(null);
      return;
    }

    setIsLoadingSuggestions(true);
    setSuggestionError(null);

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      try {
        const results = await api.searchPlaces(address.trim());
        setSuggestions(results);
      } catch (error) {
        console.error(error);
        setSuggestionError("Unable to load suggestions");
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [address]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedAddress = address.trim();
    if (!trimmedAddress) return;
    setIsPending(true);
    try {
      await api.addLocation(tripId, trimmedAddress);
      router.push(`/trips/${tripId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPending(false);
    }
  }

  function handleSelectSuggestion(description: string) {
    setAddress(description);
    setSuggestions([]);
    inputRef.current?.focus();
  }

  function handleBack() {
    if (window.history.length > 2) {
      router.back();
    } else {
      router.push(`/trips/${tripId}`);
    }
  }

  return (
    <div className='min-h-[calc(100vh-8rem)] flex items-center justify-center bg-gray-50 px-4 py-10'>
      <div className='bg-white mx-auto rounded-lg shadow-md w-full max-w-md'>
        <div className='bg-white p-8 shadow-lg rounded-lg'>
          <div className='mb-6 flex items-center justify-between gap-4'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleBack}
            >
              Back
            </Button>
            <h1 className='text-2xl font-bold text-center flex-1'>
              Add New Location to Trip
            </h1>
          </div>
          <form className='space-y-6' onSubmit={handleSubmit}>
            <div className='relative'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Address
              </label>
              <input
                ref={inputRef}
                type='text'
                name='address'
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onFocus={() => {
                  if (address.trim().length >= 2) {
                    setSuggestions(suggestions);
                  }
                }}
                onBlur={() => window.setTimeout(() => setSuggestions([]), 150)}
                required
                className='w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
                placeholder='Start typing a place or address'
              />
              {suggestions.length > 0 && (
                <ul className='absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg'>
                  {suggestions.map((suggestion) => (
                    <li
                      key={suggestion.id}
                      className='cursor-pointer px-4 py-3 text-sm text-gray-800 hover:bg-slate-50'
                      onMouseDown={() =>
                        handleSelectSuggestion(suggestion.description)
                      }
                    >
                      {suggestion.description}
                    </li>
                  ))}
                </ul>
              )}
              {isLoadingSuggestions && (
                <div className='absolute right-4 top-12 text-xs text-gray-500'>
                  Loading...
                </div>
              )}
              {suggestionError && (
                <p className='mt-2 text-sm text-red-600'>{suggestionError}</p>
              )}
            </div>
            <Button type='submit' className='mt-4 w-full' disabled={isPending}>
              {isPending ? "Adding..." : "Add Location"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
