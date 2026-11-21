import { FixedBlock, Habit, PlanResult, ReplanResult, DetectedEvent, ReplanConflict } from '../shared/types.js';

export function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(mins: number): string {
  const normalized = Math.max(0, Math.min(24 * 60 - 1, mins));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function roundTo5(mins: number): number {
  return Math.round(mins / 5) * 5;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePlan(
  blocks: Array<{ habitId: string; start: string; end: string }>,
  fixedBlocks: FixedBlock[],
  wakeTime: string,
  sleepTime: string,
  habits: Habit[]
): ValidationResult {
  const errors: string[] = [];
  const wakeMins = timeToMinutes(wakeTime);
  const sleepMins = timeToMinutes(sleepTime);

  // Check wake/sleep bounds & 5-minute grid & durations
  for (const b of blocks) {
    const sMins = timeToMinutes(b.start);
    const eMins = timeToMinutes(b.end);

    if (sMins % 5 !== 0 || eMins % 5 !== 0) {
      errors.push(`Block for habit ${b.habitId} (${b.start}-${b.end}) is not on 5-minute grid.`);
    }

    if (sMins < wakeMins || eMins > sleepMins) {
      errors.push(
        `Block for habit ${b.habitId} (${b.start}-${b.end}) falls outside wake/sleep window (${wakeTime}-${sleepTime}).`
      );
    }

    if (eMins <= sMins) {
      errors.push(`Block for habit ${b.habitId} has invalid duration (${b.start} to ${b.end}).`);
    }
  }

  // Check overlap with fixed blocks
  for (const b of blocks) {
    const bs = timeToMinutes(b.start);
    const be = timeToMinutes(b.end);

    for (const fb of fixedBlocks) {
      const fs = timeToMinutes(fb.start);
      const fe = timeToMinutes(fb.end);

      if (Math.max(bs, fs) < Math.min(be, fe)) {
        errors.push(
          `Habit ${b.habitId} (${b.start}-${b.end}) overlaps fixed block "${fb.title}" (${fb.start}-${fb.end}).`
        );
      }
    }
  }

  // Check overlap between habit blocks
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const b1 = blocks[i];
      const b2 = blocks[j];
      const s1 = timeToMinutes(b1.start);
      const e1 = timeToMinutes(b1.end);
      const s2 = timeToMinutes(b2.start);
      const e2 = timeToMinutes(b2.end);

      if (Math.max(s1, s2) < Math.min(e1, e2)) {
        errors.push(`Habit ${b1.habitId} overlaps habit ${b2.habitId} (${b1.start}-${b1.end} vs ${b2.start}-${b2.end}).`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Deterministic Fallback Planner:
 * Placed in the earliest free slot that is long enough, respecting preferred time windows.
 */
export function deterministicFallbackPlan(
  wakeTime: string,
  sleepTime: string,
  fixedBlocks: FixedBlock[],
  habits: Habit[]
): PlanResult {
  const wakeMins = roundTo5(timeToMinutes(wakeTime) || 7 * 60);
  const sleepMins = roundTo5(timeToMinutes(sleepTime) || 23 * 60);

  // Preferred window ranges in minutes
  const windowRanges: Record<string, [number, number]> = {
    morning: [wakeMins, Math.min(12 * 60, sleepMins)],
    afternoon: [Math.max(wakeMins, 12 * 60), Math.min(17 * 60, sleepMins)],
    evening: [Math.max(wakeMins, 17 * 60), Math.min(21 * 60, sleepMins)],
    night: [Math.max(wakeMins, 21 * 60), sleepMins],
  };

  // Build list of occupied intervals
  const occupied: Array<{ start: number; end: number; title: string }> = fixedBlocks
    .map((fb) => ({
      start: roundTo5(timeToMinutes(fb.start)),
      end: roundTo5(timeToMinutes(fb.end)),
      title: fb.title,
    }))
    .sort((a, b) => a.start - b.start);

  const placedBlocks: Array<{ habitId: string; start: string; end: string; reason: string }> = [];
  const unplaced: Array<{ habitId: string; why: string }> = [];

  // Helper to find earliest free slot of length `dur` minutes in preferred window, or anywhere
  function findFreeSlot(duration: number, preferredTime: string): { start: number; end: number } | null {
    const prefRange = windowRanges[preferredTime] || [wakeMins, sleepMins];
    
    // First try preferred window
    const inPref = tryRange(prefRange[0], prefRange[1], duration);
    if (inPref) return inPref;

    // Fallback: search whole wake-sleep day
    return tryRange(wakeMins, sleepMins, duration);
  }

  function tryRange(rangeStart: number, rangeEnd: number, duration: number): { start: number; end: number } | null {
    let cursor = rangeStart;
    while (cursor + duration <= rangeEnd) {
      const candidateEnd = cursor + duration;
      // Check collision
      const collision = occupied.find((occ) => Math.max(cursor, occ.start) < Math.min(candidateEnd, occ.end));
      if (!collision) {
        return { start: cursor, end: candidateEnd };
      }
      cursor = roundTo5(collision.end);
    }
    return null;
  }

  // Sort habits by commitment level / preferred time
  const sortedHabits = [...habits];

  for (const habit of sortedHabits) {
    const duration = habit.estimatedMinutes || (habit.type === 'timer' ? 25 : habit.type === 'count' ? 15 : 10);
    const slot = findFreeSlot(duration, habit.preferredTime);

    if (slot) {
      occupied.push({ start: slot.start, end: slot.end, title: habit.title });
      occupied.sort((a, b) => a.start - b.start);
      placedBlocks.push({
        habitId: habit.id,
        start: minutesToTime(slot.start),
        end: minutesToTime(slot.end),
        reason: `Isiningit sa bakanteng oras (${habit.preferredTime} slot) nang hindi sumasabit sa klase.`,
      });
    } else {
      unplaced.push({
        habitId: habit.id,
        why: 'Walang sapat na bakanteng puwang sa pagitan ng mga fixed schedule at tulog.',
      });
    }
  }

  return {
    blocks: placedBlocks,
    unplaced,
    summary: 'Na-plano gamit ang maaasahang fallback schedule (walang overlap).',
    plannedBy: 'fallback',
  };
}
