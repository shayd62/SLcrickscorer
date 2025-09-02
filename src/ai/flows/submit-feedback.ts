'use server';

/**
 * @fileOverview A flow to handle user feedback submission.
 * 
 * - submitFeedback - A function that processes user feedback.
 * - SubmitFeedbackInput - The input type for the submitFeedback function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const SubmitFeedbackInputSchema = z.object({
  feedback: z.string().min(10, "Feedback must be at least 10 characters long."),
  userId: z.string().optional(),
  userEmail: z.string().optional(),
});
export type SubmitFeedbackInput = z.infer<typeof SubmitFeedbackInputSchema>;

export async function submitFeedback(input: SubmitFeedbackInput): Promise<{ success: boolean }> {
  return submitFeedbackFlow(input);
}

const submitFeedbackFlow = ai.defineFlow(
  {
    name: 'submitFeedbackFlow',
    inputSchema: SubmitFeedbackInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    console.log("New feedback received:", input);
    // In a real application, you would save this to a database,
    // send an email, or create a ticket in a support system.
    return { success: true };
  }
);
