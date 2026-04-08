'use server'

import { z } from 'zod';

// Type for the prompt response
export type Prompt = {
  id: number;
  text: string;
  images: string[];
  created_at: string;
};

// Schema validation for the tune ID
const tuneIdSchema = z.string().min(1);

export async function getAstriaPrompts(tuneId: string) {
  try {
    // Validate tune ID
    const validTuneId = tuneIdSchema.parse(tuneId);
    const API_KEY = process.env.ASTRIA_API_KEY;

    if (!API_KEY) {
      console.warn("ASTRIA_API_KEY is missing, skipping fetch");
      return [] as Prompt[];
    }

    const response = await fetch(
      `https://api.astria.ai/tunes/${validTuneId}/prompts`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch prompts: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return data as Prompt[];
  } catch (error) {
    throw error;
  }
}