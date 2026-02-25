// src/actions/generate-description.ts
'use server';

import { generateEventDescription as generateEventDescriptionFlow, type GenerateEventDescriptionInput } from '@/ai/flows/generate-event-description';
import { z } from 'zod';

const ActionInputSchema = z.object({
  title: z.string().min(3, "Le titre doit comporter au moins 3 caractères."),
  keywords: z.string().min(3, "Veuillez fournir quelques mots-clés."),
});

export type GenerateDescriptionState = {
  message?: string;
  description?: string;
  errors?: {
    title?: string[];
    keywords?: string[];
  }
}

export async function generateDescription(prevState: GenerateDescriptionState, formData: FormData): Promise<GenerateDescriptionState> {
  const validatedFields = ActionInputSchema.safeParse({
    title: formData.get('title'),
    keywords: formData.get('keywords'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'La validation a échoué.',
    };
  }
  
  const { title, keywords } = validatedFields.data;
  const keywordsArray = keywords.split(',').map(k => k.trim()).filter(Boolean);

  try {
    const input: GenerateEventDescriptionInput = {
      title,
      keywords: keywordsArray,
    };
    const result = await generateEventDescriptionFlow(input);
    return { message: 'Succès', description: result.eventDescription };
  } catch (error) {
    console.error(error);
    return { message: 'Une erreur est survenue lors de la génération de la description.' };
  }
}
