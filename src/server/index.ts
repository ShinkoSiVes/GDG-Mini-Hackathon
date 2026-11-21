import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGeminiClient, GEMINI_MODEL, generateWithRetry } from './gemini.js';
import {
  SCHEDULE_EXTRACTION_SCHEMA,
  PLAN_SCHEMA,
  REPLAN_SCHEMA,
} from './prompts.js';
import {
  validatePlan,
  deterministicFallbackPlan,
  timeToMinutes,
  minutesToTime,
  roundTo5,
} from './planner.js';
import { apiRateLimiter } from './rateLimiter.js';
import { FixedBlock, Habit, PlannedBlock, QuizAnswers } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '8080', 10);
const host = '0.0.0.0';

// Trust Cloud Run / reverse proxy for accurate per-IP rate limiting
app.set('trust proxy', 1);

// Middlewares
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Multer for schedule image uploads (5MB max)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Health check route for Cloud Run
app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Apply rate limiting to all API routes
app.use('/api', apiRateLimiter);

/**
 * Route: Extract schedule from image upload or plain text
 */
app.post('/api/schedule/extract', upload.single('scheduleImage'), async (req: Request, res: Response) => {
  try {
    const textSchedule = req.body.text;
    const file = req.file;

    if (!file && (!textSchedule || typeof textSchedule !== 'string' || !textSchedule.trim())) {
      return res.status(400).json({
        error: 'Upload a schedule image or type your schedule.',
      });
    }

    const ai = getGeminiClient();
    const promptText = `
You are an expert academic assistant for Filipino college students.
Extract ALL fixed class blocks, laboratory sessions, or regular commitments from the provided schedule.
Return a JSON object matching the requested schema with a 'fixedBlocks' array.

CRITICAL RULES:
1. EXPAND day abbreviations into ONE block per day — do NOT combine:
   - "M" or "Mon" → "Monday"
   - "T" or "Tue" → "Tuesday"
   - "W" or "Wed" → "Wednesday"
   - "Th" or "Thu" → "Thursday"
   - "F" or "Fri" → "Friday"
   - "S" or "Sat" → "Saturday"
   - "Su" or "Sun" → "Sunday"
   - "MWF" → emit THREE separate blocks: Monday, Wednesday, Friday
   - "TTh" or "TTH" or "TuTh" → emit TWO separate blocks: Tuesday, Thursday
   - "MTWTHF" or "MTWF" → emit the corresponding separate blocks per day
   For example: "MWF 9:00-12:00 CS 101 Lecture" → 3 blocks (Monday CS 101 Lecture 09:00-12:00, Wednesday CS 101 Lecture 09:00-12:00, Friday CS 101 Lecture 09:00-12:00).
   "TTh 13:00-14:30 Math 53" → 2 blocks (Tuesday Math 53 13:00-14:30, Thursday Math 53 13:00-14:30).
2. Each item must have:
   - "day": FULL day name e.g. "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", or "Today" if day isn't specified.
   - "start": 24-hour time HH:mm (e.g. "08:30", "13:00") strictly rounded to the 5-minute grid.
   - "end": 24-hour time HH:mm (e.g. "10:00", "14:30") strictly rounded to the 5-minute grid.
   - "title": course name or subject code (e.g. "CS 101 Lecture", "Math 53 Discussion", "Chem 16 Lab").
3. Standard Philippine university schedules: AM is morning, PM is afternoon. If a time is 1:00-2:30 without AM/PM, it's typically 13:00-14:30.
4. Ignore blank periods or lunch breaks unless explicitly listed as a subject.
5. Return EVERY class on EVERY listed day — missing a block is an error.
    `.trim();

    // One Gemini call that returns the raw fixedBlocks array
    const runExtraction = async (parts: any[]): Promise<any[]> => {
      const response = await generateWithRetry(ai, {
        model: GEMINI_MODEL,
        contents: parts,
        config: {
          responseMimeType: 'application/json',
          responseSchema: SCHEDULE_EXTRACTION_SCHEMA,
          maxOutputTokens: 2048,
          temperature: 0.1,
        },
      });
      const result = JSON.parse(response.text?.trim() || '{}');
      return Array.isArray(result.fixedBlocks) ? result.fixedBlocks : [];
    };

    // Merge lists of blocks, dropping exact duplicates
    const mergeBlocks = (lists: any[][]): any[] => {
      const seen = new Set<string>();
      const merged: any[] = [];
      for (const b of lists.flat()) {
        const key = `${String(b.day || '').toLowerCase()}|${b.start}|${b.end}|${String(b.title || '').toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(b);
      }
      return merged;
    };

    let found: any[] = [];
    let extractNote = '';

    if (file) {
      const imagePart = {
        inlineData: {
          data: file.buffer.toString('base64'),
          mimeType: file.mimetype,
        },
      };
      const imageText = `${promptText}\n\nSchedule image attached above.`;
      const firstPass = await runExtraction([imagePart, { text: imageText }]);
      found = firstPass;

      // Second pass: ask only for classes the first pass missed (keep the first pass if this fails)
      try {
        const known = firstPass.map((b) => `${b.day} ${b.start}-${b.end} ${b.title}`).join('\n') || '(none yet)';
        const missing = await runExtraction([
          imagePart,
          {
            text: `${imageText}\n\nThese blocks were already found:\n${known}\n\nReturn ONLY classes visible in the image that are NOT in that list. If none are missing, return an empty fixedBlocks array.`,
          },
        ]);
        found = mergeBlocks([firstPass, missing]);
      } catch (err: any) {
        console.warn('Extraction completeness pass failed, keeping first pass:', err?.message || err);
      }
    } else {
      // Split "A; B; C" or one-per-line text so each class gets its own call
      const entries = String(textSchedule)
        .split(/[;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12);

      const results = await Promise.allSettled(
        entries.map((entry) =>
          runExtraction([{ text: `${promptText}\n\nUser provided text schedule:\n${entry}` }]),
        ),
      );

      const lists: any[][] = [];
      const failedEntries: string[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          lists.push(r.value);
        } else {
          console.warn(`Extraction failed for "${entries[i]}":`, r.reason?.message || r.reason);
          failedEntries.push(entries[i]);
        }
      });

      if (lists.length === 0) {
        throw new Error('All schedule extraction calls failed');
      }
      found = mergeBlocks(lists);
      if (failedEntries.length > 0) {
        extractNote = `Couldn't read: ${failedEntries.join(' | ')}. Please add manually.`;
      }
    }

    const parsed = { fixedBlocks: found, notes: extractNote };

    // Server-side day expansion: expand abbreviations in case Gemini didn't
    const DAY_ABBREV_MAP: Record<string, string[]> = {
      M: ['Monday'], Mon: ['Monday'], Monday: ['Monday'],
      T: ['Tuesday'], Tue: ['Tuesday'], Tuesday: ['Tuesday'],
      W: ['Wednesday'], Wed: ['Wednesday'], Wednesday: ['Wednesday'],
      Th: ['Thursday'], Thu: ['Thursday'], Thursday: ['Thursday'],
      F: ['Friday'], Fri: ['Friday'], Friday: ['Friday'],
      S: ['Saturday'], Sat: ['Saturday'], Saturday: ['Saturday'],
      Su: ['Sunday'], Sun: ['Sunday'], Sunday: ['Sunday'],
      MWF: ['Monday', 'Wednesday', 'Friday'],
      TTh: ['Tuesday', 'Thursday'], TTH: ['Tuesday', 'Thursday'],
      TuTh: ['Tuesday', 'Thursday'], TuTH: ['Tuesday', 'Thursday'],
      MTWF: ['Monday', 'Tuesday', 'Wednesday', 'Friday'],
      MTWTHF: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      MF: ['Monday', 'Friday'], MW: ['Monday', 'Wednesday'],
    };

    function expandDay(dayStr: string): string[] {
      // Exact match first
      if (DAY_ABBREV_MAP[dayStr]) return DAY_ABBREV_MAP[dayStr];
      // Case-insensitive match
      const upper = dayStr.toUpperCase();
      for (const [key, val] of Object.entries(DAY_ABBREV_MAP)) {
        if (key.toUpperCase() === upper) return val;
      }
      return [dayStr]; // Unknown: keep as-is
    }

    // Get today's day name in Asia/Manila
    const manilaDay = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      weekday: 'long',
    }).format(new Date());

    const rawBlocks: FixedBlock[] = [];
    let blockIdx = 0;
    for (const b of (parsed.fixedBlocks || [])) {
      const days = expandDay(b.day || 'Today');
      for (const day of days) {
        rawBlocks.push({
          id: `fixed-${Date.now()}-${blockIdx++}`,
          day,
          start: b.start || '09:00',
          end: b.end || '10:00',
          title: b.title || 'Class Block',
        });
      }
    }

    // Sort: today's blocks first, then by start time
    rawBlocks.sort((a, b) => {
      const aToday = a.day === manilaDay || a.day === 'Today' ? 0 : 1;
      const bToday = b.day === manilaDay || b.day === 'Today' ? 0 : 1;
      if (aToday !== bToday) return aToday - bToday;
      return a.start.localeCompare(b.start);
    });

    const fixedBlocks: FixedBlock[] = rawBlocks;

    return res.json({
      fixedBlocks,
      notes: parsed.notes || 'Successfully extracted schedule.',
    });
  } catch (error: any) {
    console.error('Schedule extraction error:', error?.message || error);
    return res.status(500).json({
      error: 'Could not read the schedule. Add your classes manually.',
    });
  }
});

/**
 * Route: Plan today's habits into available slots
 */
app.post('/api/plan', async (req: Request, res: Response) => {
  const {
    wakeTime = '07:00',
    sleepTime = '23:00',
    energyPeak = 'morning',
    commitmentLevel = 3,
    fixedBlocks = [],
    habits = [],
  }: QuizAnswers & { fixedBlocks: FixedBlock[] } = req.body;

  if (!habits || habits.length === 0) {
    return res.status(400).json({ error: 'Add at least one habit.' });
  }

  // Attempt 1 with Gemini
  try {
    const ai = getGeminiClient();

    const planPrompt = `
You are "Singit", an intelligent habit planner for Filipino students.
Your mission is to squeeze the student's daily habits into their free slots today without overlapping fixed classes or sleep.

STUDENT PROFILE:
- Wake time: ${wakeTime}
- Sleep time: ${sleepTime}
- Energy peak: ${energyPeak}
- Commitment level: ${commitmentLevel}/5 (${commitmentLevel >= 4 ? 'Strict protection' : 'Flexible'})

FIXED CLASSES / COMMITMENTS (DO NOT OVERLAP):
${JSON.stringify(fixedBlocks, null, 2)}

HABITS TO SQUEEZE IN:
${JSON.stringify(habits, null, 2)}

STRICT RULES:
1. Every habit block must fall strictly between ${wakeTime} and ${sleepTime}.
2. NO block may overlap any fixed class or another habit block.
3. Every start and end time must be in 24hr HH:mm format on a 5-minute grid (minutes end in 0 or 5).
4. Respect preferred time of day (morning, afternoon, evening, night) and energy peak where possible.
5. Provide a warm, punchy 1-line reason in plain, direct English for each habit placement, 12 words or fewer (e.g., "Before lunch, while you're still sharp", "Easy wind-down after class").
6. If any habit truly cannot fit, place it in "unplaced" with a clear reason.
    `.trim();

    let response = await generateWithRetry(ai, {
      model: GEMINI_MODEL,
      contents: [{ text: planPrompt }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: PLAN_SCHEMA,
        maxOutputTokens: 2048,
        temperature: 0.2,
      },
    });

    let parsed = JSON.parse(response.text?.trim() || '{}');
    let validation = validatePlan(parsed.blocks || [], fixedBlocks, wakeTime, sleepTime, habits);

    // If invalid, retry once with specific validation feedback
    if (!validation.valid) {
      console.warn('Initial plan failed validation, retrying with error feedback:', validation.errors);
      const retryPrompt = `
Your previous plan had validation errors:
${validation.errors.join('\n')}

Please fix all collisions and constraints.
Rules reminder:
- Must be between ${wakeTime} and ${sleepTime}
- NO OVERLAP with fixed blocks or other habits
- Strict 5-minute grid
      `.trim();

      response = await generateWithRetry(ai, {
        model: GEMINI_MODEL,
        contents: [{ text: planPrompt }, { text: retryPrompt }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: PLAN_SCHEMA,
          maxOutputTokens: 2048,
          temperature: 0.1,
        },
      });

      parsed = JSON.parse(response.text?.trim() || '{}');
      validation = validatePlan(parsed.blocks || [], fixedBlocks, wakeTime, sleepTime, habits);
    }

    if (validation.valid && parsed.blocks && parsed.blocks.length > 0) {
      return res.json({
        blocks: parsed.blocks,
        unplaced: parsed.unplaced || [],
        summary: parsed.summary || 'Your habits are planned for today.',
        plannedBy: 'gemini',
      });
    }

    console.warn('Gemini retry still failed validation. Falling back to deterministic planner.');
  } catch (err: any) {
    console.error('Gemini planning error (using deterministic fallback):', err?.message || err);
  }

  // Deterministic fallback planner (always guaranteed valid and overlap-free)
  const fallback = deterministicFallbackPlan(wakeTime, sleepTime, fixedBlocks, habits);
  return res.json(fallback);
});

/**
 * Route: Re-plan when "Something came up"
 */
app.post('/api/replan', async (req: Request, res: Response) => {
  const {
    eventText,
    currentTime = '14:00',
    wakeTime = '07:00',
    sleepTime = '23:00',
    fixedBlocks = [],
    habits = [],
    currentPlan = [],
  }: {
    eventText: string;
    currentTime: string;
    wakeTime: string;
    sleepTime: string;
    fixedBlocks: FixedBlock[];
    habits: Habit[];
    currentPlan: PlannedBlock[];
  } = req.body;

  if (!eventText || !eventText.trim()) {
    return res.status(400).json({ error: 'Describe what came up.' });
  }

  const isSocialNight = /inuman|hangout|barkada|inom|party|gala|drinks|drinking/i.test(eventText);

  const replanPrompt = `
You are "Singit", the habit squeezer for Filipino college students.
Something suddenly came up in the user's day!

SURPRISE EVENT INPUT:
"${eventText}"

CURRENT TIME: ${currentTime}
WAKE TIME: ${wakeTime}
SLEEP TIME: ${sleepTime}

EXISTING FIXED BLOCKS:
${JSON.stringify(fixedBlocks, null, 2)}

HABITS & TARGETS:
${JSON.stringify(habits, null, 2)}

CURRENT PLAN TODAY:
${JSON.stringify(currentPlan, null, 2)}

MISSION:
1. Parse the surprise event: title, start time, end time, and event type (social, study, errand, other).
2. The event type MUST matter:
   - "social / drinks / hangout / friends" at night (describe it in plain English as a social event or drinks; never use the words inuman or barkada): timer (focus/study) habits MUST be placed BEFORE the event start time — NEVER after the event ends, because the student cannot focus after a social/drinking night. Move them earlier or mark as conflict.
   - "study / surprise quiz review": prioritize study, make habit sessions lighter.
3. Replan ONLY the rest of today from ${currentTime} onwards.
4. Strict 5-minute grid. No overlaps with fixed blocks, the new event, or sleep (before ${wakeTime} or after ${sleepTime}).
5. If a habit cannot fit in full: add it to "conflicts" with canSqueeze: true (for timer/count habits) or false, and suggest minimum duration (e.g. 15 or 25 mins).
6. CRITICAL CONSTRAINT FOR SOCIAL/NIGHT EVENTS: Do NOT place ANY timer/focus habit after the event end time.
  `.trim();

  try {
    const ai = getGeminiClient();

    let response = await generateWithRetry(ai, {
      model: GEMINI_MODEL,
      contents: [{ text: replanPrompt }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: REPLAN_SCHEMA,
        maxOutputTokens: 2048,
        temperature: 0.2,
      },
    });

    let parsed = JSON.parse(response.text?.trim() || '{}');

    if (parsed.detectedEvent) {
      // Build combined fixed blocks including the detected event for validation
      const eventAsFixed: FixedBlock = {
        id: `event-${Date.now()}`,
        day: 'Today',
        start: parsed.detectedEvent.start,
        end: parsed.detectedEvent.end,
        title: parsed.detectedEvent.title,
      };
      const allFixed = [...fixedBlocks, eventAsFixed];

      let validation = validatePlan(parsed.blocks || [], allFixed, wakeTime, sleepTime, habits);

      // Retry once with specific error feedback if invalid
      if (!validation.valid) {
        console.warn('Replan failed validation, retrying with error feedback:', validation.errors);
        const retryPrompt = `
Your previous replan had validation errors:
${validation.errors.join('\n')}

Please fix all collisions and constraints. Reminder:
- Must be strictly between ${wakeTime} and ${sleepTime}.
- NO OVERLAP with fixed blocks, the surprise event (${parsed.detectedEvent.start}-${parsed.detectedEvent.end}), or other habits.
- Strict 5-minute grid.
${isSocialNight ? '- This is a social/drinking night event: DO NOT place focus/timer habits AFTER the event ends. Move them before the event or mark as conflict.' : ''}
        `.trim();

        response = await generateWithRetry(ai, {
          model: GEMINI_MODEL,
          contents: [{ text: replanPrompt }, { text: retryPrompt }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: REPLAN_SCHEMA,
            maxOutputTokens: 2048,
            temperature: 0.1,
          },
        });

        parsed = JSON.parse(response.text?.trim() || '{}');
        if (parsed.detectedEvent) {
          validation = validatePlan(parsed.blocks || [], allFixed, wakeTime, sleepTime, habits);
        }
      }

      if (parsed.detectedEvent && validation.valid) {
        return res.json({
          ...parsed,
          plannedBy: 'gemini',
        });
      }

      console.warn('Replan retry still failed validation. Falling back to deterministic replanner.');
      // Fall through to deterministic fallback using detected event times
      const fallback = deterministicFallbackPlan(wakeTime, sleepTime, allFixed, habits);
      return res.json({
        detectedEvent: parsed.detectedEvent,
        blocks: fallback.blocks,
        conflicts: fallback.unplaced.map((u) => {
          const h = habits.find((hb) => hb.id === u.habitId);
          return {
            habitId: u.habitId,
            habitTitle: h?.title || 'Habit',
            reason: 'No room after the new event.',
            canSqueeze: h?.type === 'timer' || h?.type === 'count',
            minMinutes: 15,
          };
        }),
        summary: 'Replanned with the fallback planner.',
        plannedBy: 'fallback',
      });
    }
  } catch (err: any) {
    console.error('Gemini replan error, falling back to heuristic replan:', err?.message || err);
  }

  // Safe heuristic fallback for replan
  const isNightSocial = isSocialNight;
  const detectedStart = '19:00';
  const detectedEnd = '22:00';

  const newFixed = [
    ...fixedBlocks,
    {
      id: `surprise-${Date.now()}`,
      day: 'Today',
      start: detectedStart,
      end: detectedEnd,
      title: eventText.slice(0, 40),
    },
  ];

  const fallback = deterministicFallbackPlan(wakeTime, sleepTime, newFixed, habits);

  return res.json({
    detectedEvent: {
      title: eventText.slice(0, 40),
      start: detectedStart,
      end: detectedEnd,
      type: isNightSocial ? 'social' : 'other',
      notes: isNightSocial ? 'Social event: focus habits moved earlier.' : undefined,
    },
    blocks: fallback.blocks,
    conflicts: fallback.unplaced.map((u) => {
      const h = habits.find((hb) => hb.id === u.habitId);
      return {
        habitId: u.habitId,
        habitTitle: h?.title || 'Habit',
        reason: 'No room after the new event.',
        canSqueeze: h?.type === 'timer' || h?.type === 'count',
        minMinutes: 15,
      };
    }),
    summary: 'Replanned with the fallback planner.',
    plannedBy: 'fallback',
  });
});

// Serve frontend in production
const clientDistPath = path.resolve(__dirname, '../client');
app.use(express.static(clientDistPath));

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(port, host, () => {
  console.log(`🥭 Singit server is running on http://${host}:${port}`);
});
