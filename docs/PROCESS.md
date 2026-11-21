# Singit: build process

A running record of how Singit was planned, steered, built and shipped for the
DevFest Manila 2026 After Hours Mini Hackathon (#GeminiPromptMaxxing).

## 1. Requirements

The submission form asks for:
- a deployed app link
- a project description
- the platform used (Antigravity)
- the exact prompt
- a YouTube video showing the prompt going in and the result coming out
- a public LinkedIn post
- confirmation that a GCP project is linked to the event credits

No rubric was published, so the prompt, the demo and the deployed app are treated as what gets judged.

## 2. Google Cloud setup (before any code)

- Created project `devfest-afterhours` and linked it to the event credit billing account.
- Activated the credits with an API call from Cloud Shell.
- Enabled Cloud Run, Cloud Build, Artifact Registry and Vertex AI.
- Added a $5 all-services budget alert and a $4 spending cap on Vertex AI.

## 3. Steering for Antigravity

| File | Purpose |
|---|---|
| `AGENTS.md` | Read the rules first. `PROMPT.md` is the spec. |
| `.agents/rules/00-context.md` | One-night scope, a wow moment within 10 seconds, Gemini at the core |
| `.agents/rules/10-stack-and-gcp.md` | Node + Express, Gemini on the server, Vertex AI on Cloud Run with no API keys, `PORT`, Dockerfile, `/healthz`, rate limiting |
| `.agents/rules/20-ui-and-quality.md` | Mobile-first, not a template, every state handled, tested before calling anything done |
| `.agents/workflows/deploy.md` | The exact Cloud Run deploy command, capped at 2 instances |

Antigravity 2.0 reads `.agents/` (plural) and `AGENTS.md`.

## 4. Idea, pressure-tested before building

- **Problem:** habit apps only give you checkboxes and fixed reminders. The real problem is finding when each habit fits into a day that keeps changing.
- **Testing:** the idea was questioned one angle at a time (problem, Gemini's role, alarms, accuracy, who wouldn't want it), then scored against a judge-style rubric.
- **Score history:** 53, then 55 after clarifying the automation, then about 73 predicted after the fixes below.
- **Fixes adopted:**
  - a fallback planner and a "Load sample day" button
  - Gemini reading a screenshot of a class schedule
  - `.ics` calendar alarms with no sign-in
  - two flows only
  - schedule data kept on the device

## 5. Master prompt

The full text is in [`PROMPT.md`](../PROMPT.md). It covers:
- who it's for
- Flow A: schedule screenshot + a 5-question quiz, then today's plan with counters, timers and streaks
- Flow B: "Something came up", then Gemini replans and asks whether to skip, squeeze or remove
- structured output with server-side validation, one retry, then the fallback planner
- privacy, look and feel, deployment
- a "done means" checklist

Follow-up fix prompts are logged at the bottom of `PROMPT.md`.

## 6. Build log

- 2026-11-22: first Antigravity build from the master prompt (Vite + React + Tailwind frontend, Node server, Dockerfile).

## 7. Deploy

Pending: Cloud Run in `asia-southeast1`, deployed from Cloud Shell.

## 8. Submission

- Deployed link: pending
- YouTube video: pending
- LinkedIn post: pending
