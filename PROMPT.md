# Master prompt

Paste everything between the lines into Antigravity, and paste the same text into the form's
"What was your prompt?" field.

---

Build **Singit**, a mobile-first web app that squeezes your daily habits into whatever is left of your day, using Gemini to read your schedule, plan your habits around it, and replan when life happens. ("Isingit" is Filipino for squeezing something in.)

**Who it's for:** a Filipino college student who is building daily habits (Duolingo, chess puzzles, coding) without a personal assistant. Habit apps give them checkboxes and fixed reminders. What they actually need is something that works out *when* each habit fits today and adjusts when a barkada hangout suddenly shows up.

**Build exactly two flows, completely. Nothing else.**

**Flow A: Set up and plan today (under 60 seconds)**
1. The user uploads a screenshot or photo of their class schedule (from a school portal or registration form), or types it as plain text. Gemini reads the image and returns the fixed blocks as JSON: `{day, start, end, title}`. Show them in an editable table so the user can fix mistakes.
2. A 5-question quiz:
   - wake and sleep time
   - their habits, each with a target type: **count** ("3 chess puzzles"), **timer** ("2 hours coding"), or **check** ("Duolingo lesson")
   - preferred time of day for each habit
   - when their energy is highest
   - commitment level, 1–5 (how hard to protect habits when the day gets tight)
3. Gemini plans today. It places each habit in a free slot that respects the fixed blocks, wake and sleep times, preferences and energy, and gives a one-line reason for each placement.
4. The **Today** screen shows a vertical timeline of fixed blocks and habit blocks. Each habit card works for its type:
   - **count:** tap +1 toward the target
   - **timer:** a built-in pomodoro (25/5) with start and pause, adding minutes toward the target
   - **check:** a single tap
   Hitting the target marks the habit done. Each habit has a daily **streak** that continues only if its target was met, and the header shows an overall streak.

**Flow B: "Something came up"**
1. A prominent button opens a text box. The user types something like "barkada hangout 7–10pm, inuman" or "surprise quiz tomorrow, need to review tonight".
2. Gemini works out the event's time and type, then replans the **rest of today from the current time**. The event type should matter: drinks late means focus habits move earlier, and a review session means lighter habits.
3. If everything still fits, show a before/after diff with reasons. If not, ask for each habit that doesn't fit: **Squeeze** (shorter session, for timer and count habits), **Skip today**, or **Remove from today**. Nothing changes until the user confirms.

**Reminders without sign-in**
- A **"Send to my calendar"** button exports today's habit blocks as an `.ics` file. Each event gets an alarm 10 minutes before (VALARM), in the Asia/Manila timezone, so it imports into Google Calendar or a phone calendar in one tap.
- Each habit card also gets an **"Add to Google Calendar"** link that uses the calendar's event template URL.
- No OAuth, no accounts.

**Gemini, done properly**
- All Gemini calls go through the server, using the `@google/genai` SDK.
  - In production, use Vertex AI through the service account (`GOOGLE_GENAI_USE_VERTEXAI=true`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION=global`).
  - Locally, use `GEMINI_API_KEY` from a gitignored `.env` if it's present.
  - Read the model name from `GEMINI_MODEL`, defaulting to a current Flash model.
- Use **structured output** (`responseMimeType: application/json` with a `responseSchema`) for:
  - schedule extraction
  - planning, which returns `{blocks:[{habitId,start,end,reason}], unplaced:[{habitId,why}], summary}`
  - replanning
- **Validate every plan on the server:**
  - every block falls between wake and sleep time
  - no block overlaps a fixed block or another habit
  - all times are on the 5-minute grid
- **Fallbacks so the demo never breaks:**
  - If a plan fails validation, retry once with the errors included.
  - If it fails again, use a deterministic **fallback planner** that puts each habit in the earliest free slot that is long enough, in order of preferred time.
  - Show a small badge saying "Planned by Gemini" or "Fallback planner".
  - Add a **"Load sample day"** button with a clearly labelled sample student schedule and habits, so the app can be tried in one tap.

**Privacy and safety**
- The schedule, habits and streaks live only in the browser (localStorage). The server stores nothing.
- Show this in the UI: "Your schedule stays on your device."
- Rate-limit `/api/*` per IP.
- Limit upload size to 5 MB.
- Show friendly error states, never stack traces.

**Look and feel**
- Warm and confident, not a generic gradient template: an off-white paper background, ink-black type, one bright mango-yellow accent, a chunky rounded timeline, and big tap targets.
- It must look great at 390px wide and also work on a laptop.
- Use light Taglish microcopy ("Kaya pa 'yan", "Na-singit na!").
- Animate the timeline reshuffling when a replan is applied, so the change is visible.

**Ship it to Google Cloud**
- Build a single Node 20 container:
  - an Express server that serves the built frontend
  - `/api/*` routes
  - a `/healthz` route
  - listening on `PORT` (default 8080)
- Include a `Dockerfile`, a `.dockerignore`, and a `README.md` with run and deploy steps.
- Deploy to **Cloud Run** in `asia-southeast1` on project `devfest-afterhours` using `gcloud run deploy --source .` with min instances 0 and max instances 2.

**Done means**
- `npm run build` and `npm start` work.
- Flow A works end to end from a real schedule screenshot.
- Flow B replans after "barkada hangout 7–10pm".
- The `.ics` file imports into Google Calendar with alarms.
- The fallback planner takes over when Gemini is unavailable.
- Before finishing, walk through both flows once yourself.

---

## Follow-up prompts log

### Fix prompt 1: after local QA (2026-11-22, ~00:48)

Local QA ran the build, the API (plan, replan, extract), the UI in Chrome, and phone widths of 390 and 360 px. Item 9 (typography) came from a separate font review and was sent as a short follow-up message right after items 1–8.

```
QA found these issues. Fix all of them, keep everything else unchanged, then run typecheck, build, and walk both flows once.

1. Schedule extraction drops classes: typed "MWF 9:00-12:00 CS 101 Lecture; TTh 13:00-14:30 Math 53; F 15:00-17:00 CS 101 Lab" returned only CS 101. Extraction must return EVERY class on EVERY listed day (expand MWF/TTh/etc. into one block per day). Planning must then use only today's day blocks (Asia/Manila), and the editable table should show today's blocks first.
2. Add app.set('trust proxy', 1) in the Express server so the per-IP rate limit works behind Cloud Run.
3. Sample day must be honest: show a visible "Sample day" badge instead of "Planned by Gemini", set plannedBy to 'sample', and label the sample streaks as sample data.
4. Validate /api/replan output with the same validatePlan rules (no overlap with fixed blocks or the new event, wake/sleep bounds, 5-min grid), retry once with errors, then fall back. Enforce in the replan prompt: for late social/drinking events, never place focus habits (timer habits) after the event; move them earlier or offer Squeeze/Skip.
5. Use one model name everywhere: default GEMINI_MODEL = 'gemini-2.5-flash' in code, footer, and README (the deploy sets GEMINI_MODEL explicitly). (This turned out wrong: that model is rejected by the API. See fix prompt 2.)
6. Fix the TypeScript error in src/client/components/Timeline.tsx line 39 (TimelineItem union type).
7. Replan should start from the real current time; only the sample day uses 14:00, and the modal must say which.
8. At 360px width, keep the header "Load Sample Day" button on one line (shorter label or icon-only on small screens).
9. Typography: add Bricolage Grotesque (700, 800) to the existing Google Fonts link in index.html (keep Plus Jakarta Sans and JetBrains Mono, display=swap). Add `display: ['Bricolage Grotesque', 'Plus Jakarta Sans', 'sans-serif']` to tailwind.config.js fontFamily and apply `font-display tracking-tight` to the hero headline, section titles and habit card titles. Add `tabular-nums` to every time range, counter and the pomodoro timer. Do not change colors, sizes or layout.
Do not modify README.md, PROMPT.md, AGENTS.md, docs/, or .agents/.
```

### Fix prompt 2: after re-QA (2026-11-22, ~01:05) — NOT SENT

NOT SENT to Antigravity (credits nearly used up): the model change and the extraction hardening below were made directly in the code instead. The extraction "bug" turned out to be a test mistake (curl -F cut the text at the first semicolon); with a correct test, all classes were returned.

Re-QA showed that `gemini-2.5-flash` returns 404 ("no longer available to new users"), which silently put every call into fallback mode. `gemini-3.5-flash-lite` works, and `gemini-3.8-flash` returned 503 high demand. Schedule extraction also still dropped classes.

```
Fix prompt 2 (from re-QA):
1. Model: Google rejects gemini-2.5-flash ("no longer available to new users"). Set the default GEMINI_MODEL to 'gemini-3.5-flash-lite' in src/server/gemini.ts, and make the footer text say "Gemini 3.5 Flash-Lite" (no model id in parentheses). Keep GEMINI_MODEL overridable by env.
2. Schedule extraction still drops classes. Input "MWF 9:00-12:00 CS 101 Lecture; TTh 13:00-14:30 Math 53; F 15:00-17:00 CS 101 Lab" returns only the 3 CS 101 Lecture blocks. Make it robust in code, not just in the prompt:
   a. Split the pasted text into separate entries on ";" and newlines, and extract each entry in its own Gemini call (run them in parallel, merge, de-duplicate by day+start+end+title).
   b. For images, after extraction count the distinct time ranges visible and, if fewer blocks come back than expected, retry once asking only for the missing ones.
   c. If any entry fails, keep the entries that worked and show which one failed in the editable table instead of dropping everything.
3. Do not modify README.md, PROMPT.md, AGENTS.md, docs/, or .agents/. Run typecheck and build when done, but do not start servers or run your own QA.
```

### Follow-up 3: plain English and shorter copy (2026-11-22, ~02:25)

The master prompt asked for light Taglish microcopy. After reviewing the demo, the copy was changed to plain English with fewer words, and applied directly in the code. The product behaviour and the two flows are unchanged. Changes:

- All UI text, error messages and fallback reasons are plain English. Labels are shorter ("Fit your habits into your day.", "Plan my day", "Something came up?", "Replan my day").
- Gemini's reasons and summaries are instructed to be short, direct English (12 words or fewer for habit reasons).
- Streaks start at 0 for a new user. The old defaults (3, 5 and 12 days) and the automatic "+1" when a plan is created were removed. A habit's streak badge is hidden until it is above 0, and the sample day's streaks are marked "(sample)".
- Temporary Gemini errors (503 high demand, 429) are retried twice with a short wait before the app falls back. A schedule entry that still can't be read is named in the UI instead of silently dropped.
- No invented data in setup: the class list starts empty (the app no longer pre-fills example classes), an empty text box asks for input instead of using a hidden example schedule, and a failed extraction shows an error instead of inserting fake classes.
- The replan dialog lists only habits whose time actually changed, and says so when nothing needs to move.
- Replan apply bug: a habit that Gemini returned both as "moved" and as a conflict was placed twice, and a squeezed session could overlap another habit. A conflict habit is no longer also listed as moved, and "Squeeze" now goes into the first free slot (checking classes, the event and every other habit), or is skipped if nothing is free.
- False replan conflicts: Gemini sometimes flagged a habit as a conflict when its original slot was nowhere near the new event (for example "08:30 already passed" at 03:01). The server now keeps a conflict only if the habit's original slot overlaps the event, and otherwise leaves the habit exactly as planned.
- Replan dropped unchanged habits: when Gemini returned only the habits it moved, every habit it didn't mention (for example the morning chess puzzles) disappeared from the plan after confirming. Habits that aren't moved or in conflict now stay exactly as planned.
