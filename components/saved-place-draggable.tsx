"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
import { savedPlaceDragId } from "@/lib/planner-drag";
import { Button } from "./ui/button";

interface SavedPlaceDraggableProps {
  locationId: string;
  title: string;
  latitude: number;
  longitude: number;
  index: number;
  onQuickAdd: () => void;
  adding?: boolean;
  onTimeline?: boolean;
}

export default function SavedPlaceDraggable({
  locationId,
  title,
  latitude,
  longitude,
  index,
  onQuickAdd,
  adding = false,
  onTimeline = false,
}: SavedPlaceDraggableProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: savedPlaceDragId(locationId),
      data: { type: "saved-place", locationId, title },
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-gray-50 p-3 transition ${
        isDragging ? "z-10 opacity-60 shadow-lg" : "border-gray-100"
      } ${onTimeline ? "border-emerald-200 bg-emerald-50/50" : ""}`}
    >
      <div className='flex items-start gap-2'>
        <button
          type='button'
          className='mt-0.5 shrink-0 rounded p-1 text-gray-400 hover:bg-white hover:text-gray-600'
          aria-label={`Drag ${title} into timeline`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className='h-4 w-4' />
        </button>
        <div className='min-w-0 flex-1'>
          <p className='break-words text-sm font-medium text-gray-900'>
            {index + 1}. {title}
          </p>
          {onTimeline && (
            <p className='mt-0.5 text-[11px] font-medium text-emerald-700'>
              Already on this day
            </p>
          )}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
            target='_blank'
            rel='noreferrer'
            className='mt-1 inline-block text-xs text-blue-600 hover:underline'
            onClick={(e) => e.stopPropagation()}
          >
            View on Maps
          </a>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-8 shrink-0 px-2'
          disabled={adding || onTimeline}
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd();
          }}
          title='Add to end of this day'
        >
          <Plus className='h-4 w-4' />
          <span className='sr-only'>Add to day</span>
        </Button>
      </div>
    </li>
  );
}
