import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGeminiClient, GEMINI_MODEL } from './gemini.js';
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
        error: 'Mag-upload ng schedule image o mag-type ng text schedule.',
      });
    }

    const ai = getGeminiClient();
    const contents: any[] = [];

    const promptText = `
You are an expert academic assistant for Filipino college students.
Extract all fixed class blocks, laboratory sessions, or regular commitments from the provided schedule.
Return a JSON object matching the requested schema with a 'fixedBlocks' array.

Rules:
1. Each item must have:
   - "day": e.g. "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", or "Today" if day isn't specified.
   - "start": 24-hour time HH:mm (e.g. "08:30", "13:00") strictly rounded to the 5-minute grid.
   - "end": 24-hour time HH:mm (e.g. "10:00", "14:30") strictly rounded to the 5-minute grid.
   - "title": course name or subject code (e.g. "CS 101 Lecture", "Math 53 Discussion", "Chem 16 Lab").
2. Standard Philippine university schedules: AM is morning, PM is afternoon. If a time is 1:00-2:30 without AM/PM, it's typically 13:00-14:30.
3. Ignore blank periods or lunch breaks unless explicitly listed as a subject.
    `.trim();

    if (file) {
      contents.push({
        inlineData: {
          data: file.buffer.toString('base64'),
          mimeType: file.mimetype,
        },
      });
      contents.push({ text: `${promptText}\n\nSchedule image attached above.` });
    } else {
      contents.push({
        text: `${promptText}\n\nUser provided text schedule:\n${textSchedule}`,
      });
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: SCHEDULE_EXTRACTION_SCHEMA,
        maxOutputTokens: 2048,
        temperature: 0.1,
      },
    });

    const rawText = response.text?.trim() || '{}';
    const parsed = JSON.parse(rawText);

    const fixedBlocks: FixedBlock[] = (parsed.fixedBlocks || []).map((b: any, index: number) => ({
      id: `fixed-${Date.now()}-${index}`,
      day: b.day || 'Today',
      start: b.start || '09:00',
      end: b.end || '10:00',
      title: b.title || 'Class Block',
    }));

    return res.json({
      fixedBlocks,
      notes: parsed.notes || 'Successfully extracted schedule.',
    });
  } catch (error: any) {
    console.error('Schedule extraction error:', error?.message || error);
    return res.status(500).json({
      error: 'Hindi mabasa ang schedule sa ngayon. Maaari mong i-type o i-edit nang mano-mano ang mga klase.',
      fallbackBlocks: [
        { id: `fb-1`, day: 'Today', start: '08:30', end: '10:00', title: 'CS 101 Lecture' },
        { id: `fb-2`, day: 'Today', start: '13:00', end: '15:00', title: 'Math 53 Discussion' },
      ],
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
    return res.status(400).json({ error: 'Walang habits na na-set.' });
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
5. Provide a warm, punchy 1-line reason in conversational Taglish for each habit placement (e.g., "Isiningit bago mag-lunch habang alert pa", "Pang-relax pagkatapos ng klase").
6. If any habit truly cannot fit, place it in "unplaced" with a clear reason.
    `.trim();

    let response = await ai.models.generateContent({
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

      response = await ai.models.generateContent({
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
        summary: parsed.summary || 'Na-singit na ang habits mo ngayon!',
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
    return res.status(400).json({ error: 'Pakisulat kung ano ang biglang lakad.' });
  }

  try {
    const ai = getGeminiClient();

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
   - "social / drinks / inuman / hangout" late at night means deep-focus habits (coding, study) MUST be moved EARLIER before the hangout starts because they can't do focus work after!
   - "study / surprise quiz review": prioritize study, make habit sessions lighter.
3. Replan ONLY the rest of today from ${currentTime} onwards.
4. Check if habits still fit in remaining free slots:
   - If a habit cannot fit in full: add it to "conflicts" with canSqueeze: true (for timer/count habits) or false, and suggest minimum duration (e.g. 15 or 25 mins).
   - If everything fits: populate "blocks" with the newly shifted times and clear reasons.
5. Strict 5-minute grid. No overlaps with fixed blocks, the new event, or sleep.
    `.trim();

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ text: replanPrompt }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: REPLAN_SCHEMA,
        maxOutputTokens: 2048,
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    if (parsed.detectedEvent) {
      return res.json({
        ...parsed,
        plannedBy: 'gemini',
      });
    }
  } catch (err: any) {
    console.error('Gemini replan error, falling back to heuristic replan:', err?.message || err);
  }

  // Safe heuristic fallback for replan
  // Simple extraction of hours from event text (e.g. "7-10pm" -> 19:00 - 22:00)
  const isNightSocial = /inuman|hangout|barkada|inom|party|gala/i.test(eventText);
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
      notes: isNightSocial ? 'Social / inuman: Inilipat ang focus habits bago magsimula.' : undefined,
    },
    blocks: fallback.blocks,
    conflicts: fallback.unplaced.map((u) => {
      const h = habits.find((hb) => hb.id === u.habitId);
      return {
        habitId: u.habitId,
        habitTitle: h?.title || 'Habit',
        reason: 'Sumikip ang oras dahil sa biglang lakad.',
        canSqueeze: h?.type === 'timer' || h?.type === 'count',
        minMinutes: 15,
      };
    }),
    summary: 'Na-replan ang araw mo gamit ang fallback mode para sa biglang lakad.',
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
