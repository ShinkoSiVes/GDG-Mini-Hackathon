import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Initializes the @google/genai SDK client according to hackathon rules:
 * - In Cloud Run (production): GOOGLE_GENAI_USE_VERTEXAI=true, GOOGLE_CLOUD_PROJECT=devfest-afterhours, GOOGLE_CLOUD_LOCATION=global
 * - Locally: GEMINI_API_KEY from .env (if present)
 */
export function getGeminiClient(): GoogleGenAI {
  const isVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true';
  const apiKey = process.env.GEMINI_API_KEY;

  if (isVertex || !apiKey) {
    const project = process.env.GOOGLE_CLOUD_PROJECT || 'devfest-afterhours';
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'global';
    return new GoogleGenAI({
      vertexai: true,
      project,
      location,
    });
  }

  return new GoogleGenAI({
    apiKey,
  });
}

/**
 * Recommended Flash model with fallback default
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

/**
 * generateContent with retries for temporary Gemini errors (503 high demand, 429 rate limit).
 * Retries up to 2 times with a short backoff before giving up.
 */
export async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI['models']['generateContent']>[0],
) {
  const delays = [700, 1500];
  for (let attempt = 0; ; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const text = String(err?.message || err);
      const temporary = /\b(503|429)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand/i.test(text);
      if (!temporary || attempt >= delays.length) throw err;
      console.warn(`Gemini temporary error, retrying (${attempt + 1}/${delays.length})`);
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}
