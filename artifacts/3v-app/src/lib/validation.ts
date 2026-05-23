/**
 * Validation utilities for form data and API responses
 */

import { z } from 'zod';

// Auth validation schemas
export const authSchemas = {
  signIn: z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  }),

  signUp: z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    confirmPassword: z.string(),
    fullName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
    phoneNumber: z.string().optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  }),

  contactForm: z.object({
    name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
    email: z.string().email('Email invalide'),
    subject: z.string().min(3, 'Le sujet doit contenir au moins 3 caractères'),
    message: z.string().min(10, 'Le message doit contenir au moins 10 caractères'),
  }),

  prayerRequest: z.object({
    title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères'),
    content: z.string().min(5, 'Le contenu doit contenir au moins 5 caractères'),
  }),
};

// API response validation
export const apiSchemas = {
  biblicalReading: z.object({
    id: z.string(),
    day_number: z.number(),
    date: z.string(),
    month: z.number(),
    year: z.number().optional(),
    books: z.string(),
    chapters: z.string(),
    chapters_count: z.number(),
    type: z.string(),
    comment: z.string().nullable(),
  }),

  userProgress: z.object({
    reading_id: z.string(),
    completed: z.boolean(),
    completed_at: z.string().nullable().optional(),
  }),
};

// Validation helper functions
export const validateInput = <T>(schema: z.ZodSchema, data: unknown): { success: boolean; data?: T; errors?: Record<string, string> } => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated as T };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'Erreur de validation' } };
  }
};

export const validateAndParse = async <T>(
  schema: z.ZodSchema,
  data: unknown,
  onError?: (errors: Record<string, string>) => void
): Promise<T | null> => {
  const result = validateInput<T>(schema, data);
  if (!result.success && onError && result.errors) {
    onError(result.errors);
  }
  return result.data || null;
};

export default { authSchemas, apiSchemas, validateInput, validateAndParse };
