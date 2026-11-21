# Singit

**Singit squeezes your daily habits into whatever's left of your day.** You give it your class
schedule, and Gemini plans your habits around it. When something comes up, it replans the rest
of your day. ("Isingit" is Filipino for squeezing something in.)

Built in one night for the **DevFest Manila 2026 After Hours Mini Hackathon** (#GeminiPromptMaxxing),
with one master prompt in Google Antigravity, and deployed on Google Cloud.

- **Live app:** _pending deploy_
- **Demo video:** _pending_
- **Master prompt:** [`PROMPT.md`](PROMPT.md)
- **How it was built:** [`docs/PROCESS.md`](docs/PROCESS.md)

## The problem

Habit apps give you checkboxes and fixed reminders. The hard part is working out *when* each habit
fits into a day that keeps changing: classes, a surprise quiz, a barkada hangout that suddenly shows
up at 7pm. Singit lets Gemini do that scheduling, while you keep the final say.

## What it does

**Flow A: Plan today**
1. Upload a screenshot of your class schedule, or type it in. Gemini reads it into editable time blocks.
2. Answer a 5-question quiz: wake and sleep times, your habits, preferred times, your energy, and your commitment.
3. Gemini places each habit in a free slot and gives a one-line reason for each one.
4. Track habits on the Today timeline, each in its own way:
   - **count** ("3 chess puzzles"): tap +1
   - **timer** ("2 hours coding"): a built-in pomodoro
   - **check** ("Duolingo lesson"): one tap

   Each habit also keeps a daily streak.

**Flow B: Something came up**
- Type something like *"barkada hangout 7–10pm, inuman"*, and Gemini replans the rest of today.
- The kind of event matters to the plan.
- If a habit no longer fits, you choose: **Squeeze**, **Skip today**, or **Remove**.
- Nothing changes until you confirm.

**Reminders without sign-in**
- Export today's plan as an `.ics` file with alarms. It imports into Google Calendar or your phone in one tap.
- Each habit card also has an "Add to Google Calendar" link.

## How Gemini is used

- **Reading the schedule image:** Gemini turns a screenshot of a class schedule into structured time blocks.
- **Structured output:** schedule extraction, planning and replanning all return JSON that matches a defined schema.
- **Validated on the server:** every plan is checked for overlaps, wake/sleep bounds and the 5-minute grid. An invalid plan is retried once with the errors included. If it's still invalid, a deterministic **fallback planner** takes over, and the UI shows a "Planned by Gemini" or "Fallback planner" badge.
- **Vertex AI in production:** on Cloud Run, Gemini runs through the service account, so there's no API key in production.

## Privacy

Your schedule, habits and streaks stay in your browser (localStorage). The server stores nothing.
The API is rate-limited per IP, and uploads are capped at 5 MB.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, lucide-react |
| Backend | Node 20, Express, multer, express-rate-limit |
| AI | `@google/genai`, using Gemini on Vertex AI (production) or a Gemini API key (local) |
| Hosting | Google Cloud Run (`asia-southeast1`), built with Cloud Build |
| Built with | Google Antigravity, from one master prompt plus steering rules |

## Run locally

Requirements: Node 20+.

```bash
npm install
# create .env with your own key (never commit it):
#   GEMINI_API_KEY=your-key
npm run dev          # client on http://localhost:5173, API on http://localhost:8080
```

Production build:

```bash
npm run build
npm start            # serves the built app on http://localhost:8080
```

Without `GEMINI_API_KEY`, the server uses Vertex AI (and needs Google Cloud credentials). Try
**"Load sample day"** to see a ready-made plan.

### Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `GEMINI_API_KEY` | Local development only | none |
| `GOOGLE_GENAI_USE_VERTEXAI` | Use Vertex AI (set on Cloud Run) | `false` |
| `GOOGLE_CLOUD_PROJECT` | GCP project for Vertex AI | `devfest-afterhours` |
| `GOOGLE_CLOUD_LOCATION` | Vertex AI location | `global` |
| `GEMINI_MODEL` | Model name | `gemini-2.5-flash` |
| `PORT` | Server port | `8080` |

## Deploy to Cloud Run

```bash
gcloud run deploy devfest-app \
  --source . \
  --project devfest-afterhours \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --min-instances 0 --max-instances 2 \
  --memory 512Mi --cpu 1 \
  --set-env-vars GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=devfest-afterhours,GOOGLE_CLOUD_LOCATION=global
```

The full steps, including the Vertex AI permission fix, are in [`.agents/workflows/deploy.md`](.agents/workflows/deploy.md).

## API

| Route | Purpose |
|---|---|
| `GET /healthz` | Health check |
| `POST /api/schedule/extract` | Schedule image or text in, fixed blocks out |
| `POST /api/plan` | Plan today's habits around the schedule |
| `POST /api/replan` | Replan the rest of today after something comes up |

## How this was built

This repo was steered rather than hand-coded. Antigravity read these files before writing any code:

- [`AGENTS.md`](AGENTS.md): read the rules first; `PROMPT.md` is the spec
- [`.agents/rules/`](.agents/rules): context and scope, stack and Google Cloud, UI and quality
- [`.agents/workflows/deploy.md`](.agents/workflows/deploy.md): the Cloud Run deploy steps
- [`PROMPT.md`](PROMPT.md): the one master prompt, plus a log of follow-up fix prompts

The full story, from requirements through Cloud setup, idea testing, the prompt and the deploy, is in
[`docs/PROCESS.md`](docs/PROCESS.md).

## Roadmap

- Suggestions for new daily skills to try, with fun ratings
- A weekly review that swaps or adjusts habit targets
- Awards for consistency
