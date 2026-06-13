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
import { useState } from "react";
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
}: {
  location: LocationItem;
  tripId: string;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: location.id,
    });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${location.locationTitle}" from this trip? This action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await api.deleteLocation(location.id, tripId);
      onDelete(location.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className='p-4 bg-white rounded-lg shadow flex justify-between items-center'
    >
      <h3 className='text-xl font-semibold'>{location.locationTitle}</h3>
      <Button
        variant='destructive'
        size='sm'
        onClick={handleDelete}
        className='ml-4'
      >
        Delete
      </Button>
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
  const sensors = useSensors(useSensor(PointerSensor));

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
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
