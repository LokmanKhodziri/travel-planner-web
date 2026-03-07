"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function NewLocationClient({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const address = (form.elements.namedItem("address") as HTMLInputElement)?.value;
    if (!address) return;
    setIsPending(true);
    try {
      await api.addLocation(tripId, address);
      router.push(`/trips/${tripId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center bg-gray-50">
      <div className="bg-white mx-auto rounded-lg shadow-md w-full max-w-md">
        <div className="bg-white p-8 shadow-lg rounded-lg">
          <h1 className="text-2xl font-bold text-center mb-6">Add New Location to Trip</h1>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <input
                type="text"
                name="address"
                required
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter location address"
              />
              <Button type="submit" className="mt-4 w-full" disabled={isPending}>
                {isPending ? "Adding..." : "Add Location"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
