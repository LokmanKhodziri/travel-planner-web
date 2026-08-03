"use client";

import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "./ui/button";

interface DeleteTripButtonProps {
  tripId: string;
  tripTitle: string;
  variant?: "default" | "icon";
  className?: string;
}

export default function DeleteTripButton({
  tripId,
  tripTitle,
  variant = "default",
  className,
}: DeleteTripButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const confirmed = window.confirm(
      `Delete "${tripTitle}"? This will permanently remove the trip, locations, activities, and expenses.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      await api.deleteTrip(tripId);
      router.push("/trips");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete trip");
      setDeleting(false);
    }
  }

  if (variant === "icon") {
    return (
      <div className={className}>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={handleDelete}
          disabled={deleting}
          aria-label={`Delete ${tripTitle}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="destructive"
        onClick={handleDelete}
        disabled={deleting}
      >
        <Trash2 className="h-5 w-5" />
        {deleting ? "Deleting…" : "Delete Trip"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
