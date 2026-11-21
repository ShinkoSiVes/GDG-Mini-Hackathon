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

- 2026-11-22 ~00:25: first Antigravity build from the master prompt (Vite + React + Tailwind frontend, Express server, Dockerfile).
- 2026-11-22 ~00:38: Antigravity's own pass. It benchmarked models, switched the default model, and rewrote the README.

## 6a. Local QA (2026-11-22, ~00:45)

**Passed**
- Production build and `/healthz`.
- `/api/plan` returned a valid Gemini plan in **1.9 s**: no clashes, morning and evening placement, Taglish reasons.
- Flow B in the UI: it detected the inuman event (7–10pm), moved coding earlier, and showed the before/after diff, Squeeze/Skip/Remove, and a confirm step before applying.
- Counters, timeline updates and friendly input errors worked, with no browser console errors.
- At 390 and 360 px wide, no horizontal scroll.
- The `.ics` export has a 10-minute VALARM and the Asia/Manila timezone (checked in code).

**Found and sent to Antigravity as fix prompt 1** (see `PROMPT.md`)
- Schedule extraction dropped classes (1 of 3 returned).
- Missing `trust proxy` for Cloud Run rate limiting.
- The sample day was shown as "Planned by Gemini", with unlabelled streaks.
- `/api/replan` wasn't validated. One API run put a focus habit after a drinking event.
- Model names were inconsistent across code, footer and README.
- One TypeScript error.
- Replan always started from 14:00.
- The header button wrapped at 360 px.
- Typography: added a display font for headings and tabular numbers.

**Not yet tested:** reading a real schedule screenshot, importing the `.ics` into Google Calendar, a full pomodoro run.

## 7. Deploy

Deployed 2026-11-22 to Cloud Run (`asia-southeast1`) from Cloud Shell, from commit `dafbc60`: https://devfest-app-369130207380.asia-southeast1.run.app

Live checks: plan, replan and schedule extraction all answered by Gemini on Vertex AI (`gemini-3.5-flash-lite`, location `global`), and 6 of 6 classes were extracted from a typed schedule. The Event credits expire about 12 hours after activation, so after that only the fallback planner works.

## 8. Submission

- Deployed link: https://devfest-app-369130207380.asia-southeast1.run.app
- YouTube video: pending
- LinkedIn post: pending

## 6b. Re-QA (2026-11-22, ~01:00)

- Typecheck clean. `trust proxy` and replan validation confirmed in the code and in 3 repeated replan runs.
- **Mistake caught:** fix prompt 1 set the default model to `gemini-2.5-flash`, which the API rejects, so every call silently fell back to the planner. `gemini-3.5-flash-lite` works, and `gemini-3.8-flash` returned 503 high demand.
- Schedule extraction looked like it returned only 1 of 3 classes, but that was a test mistake (curl -F cut the text at the first semicolon). With a correct test it returned 6 of 6 and 4 of 4.
- Still to verify: Vertex AI model availability in production, a real schedule screenshot, `.ics` import.

## 6c. Direct fixes (2026-11-22, ~01:10)

With Antigravity credits nearly used up, the remaining fixes were made directly in the code:
- Default model set to `gemini-3.5-flash-lite` in code, footer, README and the deploy workflow.
- Extraction hardened: text is split on `;` and newlines and extracted per entry in parallel, images get a second "what did I miss" pass, and partial failures keep the entries that worked.
- Re-checked: typecheck and build clean; plan, replan and extraction all served by Gemini; the sample day shows a "Sample Day" badge and (sample) streaks; the Bricolage Grotesque heading font loads.

## 6d. English copy, streak fix and retries (2026-11-22, ~02:30)

- Replaced the Taglish copy with short, plain English across the UI, error messages, planner reasons and Gemini's instructions (logged in `PROMPT.md` as follow-up 3).
- QA on a clean browser (no saved data) caught: new users started with a "1d" streak and the habits carried default streaks of 3, 5 and 12 days. Streaks now start at 0.
- QA caught a temporary Gemini 503 ("high demand") dropping a class during extraction. Added retries for temporary errors, and the UI now names any entry it couldn't read.
- A parallel stress test of 15 extraction calls hit the 429 quota on the free local API key. That is a local-key limit, not an app bug. The deployed app uses Vertex AI.
- Typecheck and build clean. Plan, replan and extraction verified in plain English; Flow A, the quiz and the replan dialog verified in the browser.

## 6e. Rehearsal fixes (2026-11-22, ~02:55)

Rehearsing on the live app from a clean browser caught three more issues, all fixed and redeployed:
- The schedule setup pre-filled two example classes, and a failed extraction silently inserted two fake classes. A plan could then be built on classes the user never entered. The list now starts empty and failures only show an error.
- The replan dialog listed habits as "moved" when their times hadn't changed, and the summary claimed a move that didn't happen. It now lists only habits that moved, and says "Nothing needs to move" when none do.
- A leftover non-English label on the pomodoro timer was translated.
