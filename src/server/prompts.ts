import { Type, Schema } from '@google/genai';

/**
 * Schema for extracting schedule from image or text
 */
export const SCHEDULE_EXTRACTION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    fixedBlocks: {
      type: Type.ARRAY,
      description: "List of fixed schedule blocks such as classes, labs, meetings",
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING, description: "Day of week (e.g., Monday, Tuesday) or 'Today'" },
          start: { type: Type.STRING, description: "Start time in 24hr HH:mm format on 5-min grid (e.g. 08:30)" },
          end: { type: Type.STRING, description: "End time in 24hr HH:mm format on 5-min grid (e.g. 10:00)" },
          title: { type: Type.STRING, description: "Class name, subject code, or event title" },
        },
        required: ["start", "end", "title"],
      },
    },
    notes: {
      type: Type.STRING,
      description: "Brief note or summary of extracted schedule",
    },
  },
  required: ["fixedBlocks"],
};

/**
 * Schema for daily habit plan
 */
export const PLAN_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    blocks: {
      type: Type.ARRAY,
      description: "Planned habit time blocks for today",
      items: {
        type: Type.OBJECT,
        properties: {
          habitId: { type: Type.STRING, description: "Exact ID of the habit being placed" },
          start: { type: Type.STRING, description: "Start time in 24hr HH:mm format on 5-min grid" },
          end: { type: Type.STRING, description: "End time in 24hr HH:mm format on 5-min grid" },
          reason: { type: Type.STRING, description: "Direct reason in plain English, 12 words or fewer" },
        },
        required: ["habitId", "start", "end", "reason"],
      },
    },
    unplaced: {
      type: Type.ARRAY,
      description: "Any habits that truly could not fit without overlapping",
      items: {
        type: Type.OBJECT,
        properties: {
          habitId: { type: Type.STRING },
          why: { type: Type.STRING, description: "Brief explanation why habit could not fit" },
        },
        required: ["habitId", "why"],
      },
    },
    summary: {
      type: Type.STRING,
      description: "One short, direct sentence summarizing today's plan, plain English",
    },
  },
  required: ["blocks", "unplaced", "summary"],
};

/**
 * Schema for replanning when 'Something came up'
 */
export const REPLAN_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    detectedEvent: {
      type: Type.OBJECT,
      description: "The surprise event extracted from user's input",
      properties: {
        title: { type: Type.STRING, description: "Name of the new event (e.g. Barkada Hangout)" },
        start: { type: Type.STRING, description: "Start time HH:mm 24hr format on 5-min grid" },
        end: { type: Type.STRING, description: "End time HH:mm 24hr format on 5-min grid" },
        type: {
          type: Type.STRING,
          enum: ["social", "study", "errand", "other"],
          description: "Nature of the surprise event",
        },
        notes: { type: Type.STRING, description: "Contextual note" },
      },
      required: ["title", "start", "end", "type"],
    },
    blocks: {
      type: Type.ARRAY,
      description: "Adjusted habit blocks that fit",
      items: {
        type: Type.OBJECT,
        properties: {
          habitId: { type: Type.STRING },
          start: { type: Type.STRING },
          end: { type: Type.STRING },
          reason: { type: Type.STRING, description: "Reason for the shift or adjustment" },
        },
        required: ["habitId", "start", "end", "reason"],
      },
    },
    conflicts: {
      type: Type.ARRAY,
      description: "Habits that no longer fit comfortably in the remaining time",
      items: {
        type: Type.OBJECT,
        properties: {
          habitId: { type: Type.STRING },
          habitTitle: { type: Type.STRING },
          reason: { type: Type.STRING, description: "Why it conflicts with the surprise event or bedtime" },
          canSqueeze: { type: Type.BOOLEAN, description: "Whether habit can be squeezed into a shorter sprint" },
          minMinutes: { type: Type.NUMBER, description: "Minimum squeeze duration in minutes" },
        },
        required: ["habitId", "habitTitle", "reason", "canSqueeze", "minMinutes"],
      },
    },
    summary: {
      type: Type.STRING,
      description: "One short, direct sentence on how the day was reorganized, plain English",
    },
  },
  required: ["detectedEvent", "blocks", "conflicts", "summary"],
};
