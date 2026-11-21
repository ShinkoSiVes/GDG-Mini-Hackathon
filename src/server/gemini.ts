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
