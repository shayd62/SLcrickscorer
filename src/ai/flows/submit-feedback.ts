'use server';

/**
 * @fileOverview A flow to handle user feedback submission.
 * 
 * - submitFeedback - A function that processes user feedback.
 * - SubmitFeedbackInput - The input type for the submitFeedback function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type SubmitFeedbackInput = {
  feedback: string;
  userId?: string;
  userEmail?: string;
};

export async function submitFeedback(input: SubmitFeedbackInput): Promise<{ success: boolean }> {
  return submitFeedbackFlow(input);
}

const submitFeedbackFlow = ai.defineFlow(
  {
    name: 'submitFeedbackFlow',
    inputSchema: z.object({
      feedback: z.string().min(10, "Feedback must be at least 10 characters long."),
      userId: z.string().optional(),
      userEmail: z.string().optional(),
    }),
    outputSchema: z.object({ success: z.boolean() }),
  },
  async (input) => {
    console.log("New feedback received:", input);
    
    try {
      await addDoc(collection(db, 'feedback'), {
        ...input,
        createdAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error("Error saving feedback to Firestore:", error);
      // In a real application, you might want to handle this error more gracefully.
      return { success: false };
    }
  }
);
