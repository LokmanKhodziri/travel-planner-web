"use client";

import { useDroppable } from "@dnd-kit/core";

interface TimelineInsertDropZoneProps {
  id: string;
  visible: boolean;
  label?: string;
}

export default function TimelineInsertDropZone({
  id,
  visible,
  label = "Drop here to schedule",
}: TimelineInsertDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  if (!visible) return null;

  return (
    <div
      ref={setNodeRef}
      className={`mx-3 my-1 rounded-lg border-2 border-dashed transition ${
        isOver
          ? "border-blue-500 bg-blue-50 py-3"
          : "border-blue-200 bg-blue-50/40 py-2"
      }`}
    >
      <p
        className={`text-center text-[11px] font-medium ${
          isOver ? "text-blue-700" : "text-blue-500"
        }`}
      >
        {label}
      </p>
    </div>
  );
}
