import { FixedBlock, Habit, PlannedBlock, DayState } from '../../shared/types.js';

export const SAMPLE_FIXED_BLOCKS: FixedBlock[] = [
  {
    id: 'sample-fb-1',
    day: 'Today (Sample)',
    start: '08:30',
    end: '10:00',
    title: 'CS 101 Lecture (Algorithms & Data Structures)',
  },
  {
    id: 'sample-fb-2',
    day: 'Today (Sample)',
    start: '13:00',
    end: '14:30',
    title: 'Math 53 Discussion (Calculus II)',
  },
  {
    id: 'sample-fb-3',
    day: 'Today (Sample)',
    start: '15:00',
    end: '17:00',
    title: 'CS 101 Lab Session (Machine Problem)',
  },
];

export const SAMPLE_HABITS: Habit[] = [
  {
    id: 'sample-h-1',
    title: '3 Chess puzzles',
    type: 'count',
    target: 3,
    unit: 'puzzles',
    preferredTime: 'morning',
    estimatedMinutes: 15,
    progress: 1,
    completed: false,
    streak: 5,
  },
  {
    id: 'sample-h-2',
    title: 'Coding practice (25m Pomodoro)',
    type: 'timer',
    target: 50,
    unit: 'mins',
    preferredTime: 'afternoon',
    estimatedMinutes: 50,
    progress: 25,
    completed: false,
    streak: 8,
  },
  {
    id: 'sample-h-3',
    title: 'Duolingo daily lesson',
    type: 'check',
    target: 1,
    unit: 'lesson',
    preferredTime: 'evening',
    estimatedMinutes: 15,
    progress: 0,
    completed: false,
    streak: 14,
  },
];

export const SAMPLE_PLANNED_BLOCKS: PlannedBlock[] = [
  {
    habitId: 'sample-h-1',
    title: '3 Chess puzzles',
    type: 'count',
    start: '07:30',
    end: '07:45',
    reason: 'Isiningit habang nag-aalmusal sa dorm bago ang CS 101 lecture.',
    target: 3,
    unit: 'puzzles',
    progress: 1,
    completed: false,
  },
  {
    habitId: 'sample-h-2',
    title: 'Coding practice (25m Pomodoro)',
    type: 'timer',
    start: '10:30',
    end: '11:20',
    reason: 'Perpektong 50-min block sa vacant window sa engineering library bago mag-lunch.',
    target: 50,
    unit: 'mins',
    progress: 25,
    completed: false,
  },
  {
    habitId: 'sample-h-3',
    title: 'Duolingo daily lesson',
    type: 'check',
    start: '21:00',
    end: '21:15',
    reason: 'Pang-wind down sa gabi bago matulog para maprotektahan ang 14-day streak!',
    target: 1,
    unit: 'lesson',
    progress: 0,
    completed: false,
  },
];

export function getSampleDayState(): DayState {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  return {
    date: dateStr,
    wakeTime: '07:00',
    sleepTime: '23:00',
    energyPeak: 'morning',
    commitmentLevel: 4,
    fixedBlocks: SAMPLE_FIXED_BLOCKS,
    habits: SAMPLE_HABITS,
    plan: SAMPLE_PLANNED_BLOCKS,
    plannedBy: 'gemini',
    overallStreak: 14,
  };
}
