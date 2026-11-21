export type HabitType = 'count' | 'timer' | 'check';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface FixedBlock {
  id: string;
  day?: string;
  start: string; // HH:mm (24hr)
  end: string;   // HH:mm (24hr)
  title: string;
}

export interface Habit {
  id: string;
  title: string;
  type: HabitType;
  target: number; // e.g. 3 for puzzles, 60 for minutes, 1 for check
  unit?: string;  // e.g. "puzzles", "mins", "lesson"
  preferredTime: TimeOfDay;
  estimatedMinutes: number; // default duration to block out
  progress: number;
  completed: boolean;
  streak: number;
}

export interface PlannedBlock {
  habitId: string;
  title: string;
  type: HabitType;
  start: string; // HH:mm
  end: string;   // HH:mm
  reason: string;
  target: number;
  unit?: string;
  progress: number;
  completed: boolean;
  isSqueezed?: boolean;
  originalDuration?: number;
}

export interface UnplacedHabit {
  habitId: string;
  why: string;
}

export interface QuizAnswers {
  wakeTime: string;  // HH:mm
  sleepTime: string; // HH:mm
  energyPeak: TimeOfDay;
  commitmentLevel: number; // 1 - 5
  habits: Habit[];
}

export interface PlanResult {
  blocks: Array<{
    habitId: string;
    start: string;
    end: string;
    reason: string;
  }>;
  unplaced: Array<{
    habitId: string;
    why: string;
  }>;
  summary: string;
  plannedBy: 'gemini' | 'fallback';
}

export interface DetectedEvent {
  title: string;
  start: string;
  end: string;
  type: 'social' | 'study' | 'errand' | 'other';
  notes?: string;
}

export interface ReplanConflict {
  habitId: string;
  habitTitle: string;
  reason: string;
  canSqueeze: boolean;
  minMinutes: number;
}

export interface ReplanResult {
  detectedEvent: DetectedEvent;
  blocks: Array<{
    habitId: string;
    start: string;
    end: string;
    reason: string;
  }>;
  conflicts: ReplanConflict[];
  summary: string;
  plannedBy: 'gemini' | 'fallback';
}

export interface DayState {
  date: string; // YYYY-MM-DD
  fixedBlocks: FixedBlock[];
  habits: Habit[];
  plan: PlannedBlock[];
  wakeTime: string;
  sleepTime: string;
  energyPeak: TimeOfDay;
  commitmentLevel: number;
  plannedBy?: 'gemini' | 'fallback';
  overallStreak: number;
}
