# Stack and Google Cloud

## Stack
- Single Node.js 20+ app in one container: an Express (or similar) server that serves the frontend and
  exposes `/api/*` routes. A Vite + React frontend built to static files is fine; keep one package.json
  at the root (or a root build script) so one `npm run build` and `npm start` work.
- Use the official `@google/genai` SDK for Gemini. All Gemini calls happen on the server, never in the browser.

## Gemini access (two modes, picked by env vars)
- Cloud Run (production): Vertex AI with the service account, no API key.
  `GOOGLE_GENAI_USE_VERTEXAI=true`, `GOOGLE_CLOUD_PROJECT=devfest-afterhours`, `GOOGLE_CLOUD_LOCATION=global`.
- Local dev (optional): `GEMINI_API_KEY` in a gitignored `.env`. If the key is absent, use Vertex mode.
- Model name comes from `GEMINI_MODEL` with a sensible current Flash model as the default. Keep requests
  small (short prompts, `maxOutputTokens` set) because the cloud budget is $5.

## Cloud Run readiness
- Listen on `process.env.PORT` (default 8080) and host `0.0.0.0`.
- Include a `Dockerfile` (node:20-slim, multi-stage if there is a frontend build) and a `.dockerignore`
  that excludes `node_modules`, `.env`, `.git`.
- `npm start` must run the production server with no dev tools.
- Health route: `GET /healthz` returns 200.

## Security
- No secrets in client code, in git, or in logs. `.env` and any key files are gitignored.
- Validate and size-limit all user input on the server (body limit, file size limit if uploads exist).
- Handle Gemini errors and timeouts with a friendly message in the UI, never a raw stack trace.
- Add a simple per-IP rate limit on `/api/*` so a public link can't drain the budget.

## Data
- Prefer no database. If state is truly needed, use Firestore in Native mode on project
  `devfest-afterhours`, and say why before adding it.
