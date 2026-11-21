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

(Any fix prompts sent after the master prompt, in order.)
