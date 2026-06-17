"use client";

import type { ApiLocation } from "@/types/api";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "./ui/button";

type LocationItem = Omit<ApiLocation, "createAt" | "updateAt"> & {
  createAt: Date;
  updateAt: Date | null;
};

function SortableItem({
  location,
  tripId,
  onDelete,
  confirmDeleteId,
  onRequestDelete,
  onCancelDelete,
}: {
  location: LocationItem;
  tripId: string;
  onDelete: (id: string) => void;
  confirmDeleteId: string | null;
  onRequestDelete: (id: string) => void;
  onCancelDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: location.id,
    });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [deleting, setDeleting] = useState(false);
  const isConfirming = confirmDeleteId === location.id;

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await api.deleteLocation(location.id, tripId);
      onDelete(location.id);
      onCancelDelete();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:items-center sm:p-4 ${
        isDragging ? "opacity-70" : ""
      } ${isConfirming ? "ring-2 ring-red-200" : ""}`}
    >
      <button
        type='button'
        className='mt-1 shrink-0 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 sm:mt-0'
        aria-label={`Drag ${location.locationTitle}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className='h-5 w-5' />
      </button>

      <h3 className='min-w-0 flex-1 break-words text-base font-semibold leading-snug lg:text-lg'>
        {location.locationTitle}
      </h3>

      {isConfirming ? (
        <div className='flex shrink-0 flex-col gap-2 sm:flex-row'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={deleting}
            onClick={onCancelDelete}
            className='min-w-[4.5rem]'
          >
            Cancel
          </Button>
          <Button
            type='button'
            variant='destructive'
            size='sm'
            disabled={deleting}
            onClick={() => void handleConfirmDelete()}
            className='min-w-[4.5rem]'
          >
            {deleting ? "..." : "Remove"}
          </Button>
        </div>
      ) : (
        <Button
          type='button'
          variant='destructive'
          size='sm'
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete(location.id);
          }}
          className='shrink-0'
          aria-label={`Delete ${location.locationTitle}`}
        >
          <Trash2 className='h-4 w-4 sm:mr-1' />
          <span className='hidden sm:inline'>Delete</span>
        </Button>
      )}
    </div>
  );
}

export default function SortableItinerary({
  tripId,
  locations,
}: {
  tripId: string;
  locations: LocationItem[];
}) {
  const [items, setItems] = useState(locations);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  useEffect(() => {
    setItems(locations);
    setConfirmDeleteId((current) =>
      current && locations.some((loc) => loc.id === current) ? current : null,
    );
  }, [locations]);

  const handleDelete = (deletedId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== deletedId));
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(current, oldIndex, newIndex);
      const locationIds = newItems.map((item) => item.id);
      api
        .reorderLocations(tripId, locationIds)
        .catch((err) => console.error(err));
      return newItems;
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className='space-y-4'>
          {items.map((location) => (
            <SortableItem
              key={location.id}
              location={location}
              tripId={tripId}
              onDelete={handleDelete}
              confirmDeleteId={confirmDeleteId}
              onRequestDelete={setConfirmDeleteId}
              onCancelDelete={() => setConfirmDeleteId(null)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
