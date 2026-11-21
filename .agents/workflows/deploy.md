---
description: Deploy this app to Cloud Run on project devfest-afterhours
---

# Deploy to Cloud Run

Project `devfest-afterhours`, region `asia-southeast1`. The Run, Cloud Build, Artifact Registry and
Vertex AI APIs are already enabled.

1. Run `npm run build` and `npm start` locally once; fix anything that fails before deploying.
2. Confirm `Dockerfile`, `.dockerignore` and `/healthz` exist and the server listens on `PORT`.
3. From the repo root:

   ```
   gcloud run deploy devfest-app \
     --source . \
     --project devfest-afterhours \
     --region asia-southeast1 \
     --allow-unauthenticated \
     --min-instances 0 --max-instances 2 \
     --memory 512Mi --cpu 1 \
     --set-env-vars GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT=devfest-afterhours,GOOGLE_CLOUD_LOCATION=global,GEMINI_MODEL=gemini-3.5-flash-lite
   ```

4. If Gemini calls fail with a permission error, grant the runtime service account Vertex access:

   ```
   PROJECT_NUMBER=$(gcloud projects describe devfest-afterhours --format='value(projectNumber)')
   gcloud projects add-iam-policy-binding devfest-afterhours \
     --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --role="roles/aiplatform.user"
   ```

5. Open the printed service URL, check `/healthz`, then run the main flow once on desktop and once at
   phone width. Put the URL in `README.md`.

Never pass API keys with `--set-env-vars`. Never raise `--max-instances` without asking.
