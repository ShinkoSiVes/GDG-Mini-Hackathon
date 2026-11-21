# 🥭 Singit

> **"Isingit ang daily habits sa siksik mong araw."**  
> A mobile-first web app that squeezes daily habits into whatever is left of a Filipino college student's day, using Gemini to read schedules, plan habits around them, and dynamically replan when life happens.

Built for **DevFest Manila 2026 After Hours** (`#GeminiPromptMaxxing`) from one master prompt in
Google Antigravity, and deployed on Google Cloud Run.

- **Live app:** https://devfest-app-369130207380.asia-southeast1.run.app
- **Demo video:** _pending_
- **Master prompt and fix prompts:** [`PROMPT.md`](PROMPT.md)
- **How it was built:** [`docs/PROCESS.md`](docs/PROCESS.md)

---

## ⚡ The Wow Moment (Under 10 Seconds)
- **1-Tap Demo**: Tap **"Try the sample day"** to immediately preview a realistic Filipino student schedule (CS 101, Math 53, Lab) with a ready-made plan, clearly labelled as a sample day, with no setup.
- **10-Second Test**: Tap **"⚡ May Biglang Lakad?"** -> select *"🍻 Barkada hangout 7–10pm, inuman"* -> watch Gemini replan the day, moving focus habits earlier and offering to squeeze or skip conflicting habits!

---

## 🎯 Key Features

### Flow A: Set Up & Plan Today (Under 60s)
1. **Schedule Ingestion**: Upload a photo/screenshot of your school registration / portal schedule (or type as plain text). Gemini extracts fixed class blocks with structured JSON on a 5-minute grid.
2. **5-Question Quiz**:
   - Wake & sleep times
   - Habits with target types: **count** (e.g., 3 chess puzzles), **timer** (Pomodoro 25/5), or **check** (Duolingo)
   - Preferred time of day for each habit
   - Energy peak (Morning 🌅, Afternoon ☀️, Evening 🌆, Night 🌙)
   - Commitment level (1–5)
3. **Gemini Habit Squeezer**: Squeezes habits into free slots respecting energy and classes. Validated on the server (5-min grid, no collisions, wake/sleep bounds) with deterministic fallback resilience.
4. **Interactive Timeline**:
   - Count: `+1 Tap` toward target
   - Timer: Built-in 25/5 Pomodoro with focus sprint and break timer
   - Check: Single tap completion
   - Daily streaks per habit + overall streak flame!

### Flow B: "Something Came Up" (Dynamic Replanning)
- Type surprise events (e.g., *"barkada hangout 7-10pm, inuman"* or *"surprise quiz tomorrow, need to review tonight"*).
- Gemini interprets event type:
  - **Late social / inuman**: shifts focus habits earlier before the event starts.
  - **Study review**: lightens or reschedules conflicting habits.
- Before/after diff preview with reasons.
- Conflict options: **Squeeze** (shorter 15m session), **Skip today**, or **Remove from today**.
- Animate timeline reshuffling on apply!

### Reminders Without Sign-In
- **"Send to my calendar"**: Exports today's plan as an `.ics` file with `VALARM` 10 minutes before each event in `Asia/Manila` timezone.
- **"Add to Google Calendar"**: Direct prefilled Google Calendar link per habit card.
- **Privacy First**: All schedules and habits reside in browser `localStorage`. No database, no tracking.

---

## 🛠️ Stack & Architecture
- **Backend**: Single Node 20 Express server serving built frontend and `/api/*` routes.
- **AI**: Official `@google/genai` SDK with structured output (`responseSchema`) and server-side collision validation.
  - Cloud Run (Production): Vertex AI via service account (`GOOGLE_GENAI_USE_VERTEXAI=true`, `GOOGLE_CLOUD_PROJECT=devfest-afterhours`, `GOOGLE_CLOUD_LOCATION=global`).
  - Local: `GEMINI_API_KEY` from gitignored `.env`.
  - Model: `gemini-3.5-flash-lite` by default, overridable with `GEMINI_MODEL`.
  - Fallbacks: an invalid plan is retried once with the validation errors, then a deterministic fallback planner takes over. The UI badge shows whether Gemini or the fallback made the plan.
- **Safety**: per-IP rate limit on `/api/*` (with `trust proxy` for Cloud Run) and a 5 MB upload limit.
- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS + Lucide Icons + Canvas Confetti.
- **Production Container**: Multi-stage `Dockerfile` (node:20-slim) with health route `/healthz`.

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Add your Gemini API key in .env
echo "GEMINI_API_KEY=your_key_here" > .env

# 3. Build client and server
npm run build

# 4. Start production server
npm start
# Server runs on http://localhost:8080 (serves API and UI)

# Or run dev mode with live reload:
npm run dev
```

Never commit `.env`. It's gitignored.

### Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `GEMINI_API_KEY` | Local development only | none |
| `GOOGLE_GENAI_USE_VERTEXAI` | Use Vertex AI (set on Cloud Run) | `false` |
| `GOOGLE_CLOUD_PROJECT` | GCP project for Vertex AI | `devfest-afterhours` |
| `GOOGLE_CLOUD_LOCATION` | Vertex AI location | `global` |
| `GEMINI_MODEL` | Gemini model name | `gemini-3.5-flash-lite` |
| `PORT` | Server port | `8080` |

### API

| Route | Purpose |
|---|---|
| `GET /healthz` | Health check |
| `POST /api/schedule/extract` | Schedule image or text in, fixed class blocks out |
| `POST /api/plan` | Plan today's habits around the schedule |
| `POST /api/replan` | Replan the rest of today after something comes up |

---

## ☁️ Deploying to Cloud Run

Deploy directly using Google Cloud SDK:

```bash
gcloud run deploy devfest-app \
  --source . \
  --project devfest-afterhours \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --min-instances 0 --max-instances 2 \
  --memory 512Mi --cpu 1 \
  --set-env-vars GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=devfest-afterhours,GOOGLE_CLOUD_LOCATION=global,GEMINI_MODEL=gemini-3.5-flash-lite
```

The full steps, including the Vertex AI permission fix, are in [`.agents/workflows/deploy.md`](.agents/workflows/deploy.md).

---

## 🧭 How This Was Built

This repo was steered rather than hand-coded. Antigravity read these files before writing any code:

- [`AGENTS.md`](AGENTS.md): read the rules first; `PROMPT.md` is the spec
- [`.agents/rules/`](.agents/rules): context and scope, stack and Google Cloud, UI and quality
- [`.agents/workflows/deploy.md`](.agents/workflows/deploy.md): the Cloud Run deploy steps
- [`PROMPT.md`](PROMPT.md): the one master prompt, plus a log of follow-up fix prompts from QA

The full story is in [`docs/PROCESS.md`](docs/PROCESS.md): requirements, Google Cloud setup, idea
testing and scoring, the prompt, QA and the deploy.

## 🗺️ Roadmap

- Suggestions for new daily skills to try, with fun ratings
- A weekly review that swaps or adjusts habit targets
- Awards for consistency
