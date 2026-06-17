export const SAVED_PLACE_DRAG_PREFIX = "saved-place:";
export const TIMELINE_INSERT_AFTER_PREFIX = "timeline-insert:after:";
export const TIMELINE_INSERT_BEFORE_PREFIX = "timeline-insert:before:";
export const TIMELINE_INSERT_END = "timeline-insert:end";
export const TIMELINE_INSERT_EMPTY = "timeline-insert:empty";

export function savedPlaceDragId(locationId: string) {
  return `${SAVED_PLACE_DRAG_PREFIX}${locationId}`;
}

export function parseSavedPlaceDragId(id: string) {
  if (!id.startsWith(SAVED_PLACE_DRAG_PREFIX)) return null;
  return id.slice(SAVED_PLACE_DRAG_PREFIX.length);
}

export function timelineInsertAfterId(activityId: string) {
  return `${TIMELINE_INSERT_AFTER_PREFIX}${activityId}`;
}

export function timelineInsertBeforeId(activityId: string) {
  return `${TIMELINE_INSERT_BEFORE_PREFIX}${activityId}`;
}

export function parseTimelineInsertTarget(id: string) {
  if (id === TIMELINE_INSERT_END || id === TIMELINE_INSERT_EMPTY) {
    return { type: "end" as const };
  }
  if (id.startsWith(TIMELINE_INSERT_BEFORE_PREFIX)) {
    return {
      type: "before" as const,
      activityId: id.slice(TIMELINE_INSERT_BEFORE_PREFIX.length),
    };
  }
  if (id.startsWith(TIMELINE_INSERT_AFTER_PREFIX)) {
    return {
      type: "after" as const,
      activityId: id.slice(TIMELINE_INSERT_AFTER_PREFIX.length),
    };
  }
  return null;
}

export function isSavedPlaceDragId(id: string) {
  return id.startsWith(SAVED_PLACE_DRAG_PREFIX);
}
