// astroinsight/src/server/utils/validation.js
import { z } from 'zod';

// Basic string validation
const nonEmptyString = z.string().min(1, { message: "Cannot be empty" });

export const birthInfoSchema = z.object({
  name: nonEmptyString.max(100, "Name too long"),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, use YYYY-MM-DD"), // Or z.date() if input is Date object
  birthTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format, use HH:MM"),
  birthLocation: nonEmptyString.max(255, "Location too long"),
  // Latitude and longitude will be derived from birthLocation via geocoding service
  // gender: z.enum(["Male", "Female", "Other"]).optional(), // If gender is strict
  gender: z.string().max(20).optional(), // More flexible gender input
  // timezone will be derived
});

export const updateProfileSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  // Add other updatable fields here, e.g., email if you allow changing it (requires re-verification)
});

export const astrologyQuestionSchema = z.object({
  birthChartId: z.number().int().positive(),
  conversationId: z.number().int().positive().optional(), // Optional: continue existing or start new
  question: nonEmptyString.max(2000, "Question is too long"),
  analysisType: z.enum([
    "BIRTH_CHART_ANALYSIS", 
    "PREDICTIONS_TRANSITS", 
    "COMPATIBILITY_ANALYSIS", // Needs another chart ID
    "REMEDIAL_MEASURES"
  ]).optional(), // Could be generic Q&A without specific type
});