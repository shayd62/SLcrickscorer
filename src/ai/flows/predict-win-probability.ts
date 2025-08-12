'use server';

/**
 * @fileOverview Predicts the win probability of each team based on current match statistics.
 *
 * - predictWinProbability - A function that predicts the win probability.
 * - PredictWinProbabilityInput - The input type for the predictWinProbability function.
 * - PredictWinProbabilityOutput - The return type for the predictWinProbability function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictWinProbabilityInputSchema = z.object({
  team1Name: z.string().describe('The name of the first team.'),
  team2Name: z.string().describe('The name of the second team.'),
  team1Runs: z.number().describe('The current runs scored by the first team.'),
  team2Runs: z.number().describe('The current runs scored by the second team.'),
  wicketsLostTeam1: z.number().describe('The number of wickets lost by the first team.'),
  wicketsLostTeam2: z.number().describe('The number of wickets lost by the second team.'),
  oversRemainingTeam1: z.number().describe('The number of overs remaining for the first team.'),
  oversRemainingTeam2: z.number().describe('The number of overs remaining for the second team.'),
  targetScore: z.number().describe('The target score for the team batting second.'),
});

export type PredictWinProbabilityInput = z.infer<typeof PredictWinProbabilityInputSchema>;

const PredictWinProbabilityOutputSchema = z.object({
  team1WinProbability: z
    .number()
    .describe('The predicted win probability of the first team (0-1).'),
  team2WinProbability: z
    .number()
    .describe('The predicted win probability of the second team (0-1).'),
  matchSummary: z.string().describe('A short summary of the match and the prediction.'),
});

export type PredictWinProbabilityOutput = z.infer<typeof PredictWinProbabilityOutputSchema>;

export async function predictWinProbability(input: PredictWinProbabilityInput): Promise<PredictWinProbabilityOutput> {
  return predictWinProbabilityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictWinProbabilityPrompt',
  input: {schema: PredictWinProbabilityInputSchema},
  output: {schema: PredictWinProbabilityOutputSchema},
  prompt: `You are an expert cricket analyst providing real-time win probability predictions during a match.

  Based on the current match statistics, predict the win probability for each team.
  Consider the current run rate, wickets lost, overs remaining, and target score (if applicable).

  Team 1: {{{team1Name}}} - Runs: {{{team1Runs}}}, Wickets: {{{wicketsLostTeam1}}}, Overs Remaining: {{{oversRemainingTeam1}}}
  Team 2: {{{team2Name}}} - Runs: {{{team2Runs}}}, Wickets: {{{wicketsLostTeam2}}}, Overs Remaining: {{{oversRemainingTeam2}}}
  Target Score: {{{targetScore}}}

  Provide the win probability for each team as a number between 0 and 1.
  Also, provide a short summary of the match and the reasoning behind your prediction.

  Example output:
  { 
    "team1WinProbability": 0.65,
    "team2WinProbability": 0.35,
    "matchSummary": "Team 1 is currently in a strong position with a higher run rate and more wickets in hand. However, Team 2 has the potential to chase down the target if they accelerate their scoring."
  }
  `,
});

const predictWinProbabilityFlow = ai.defineFlow(
  {
    name: 'predictWinProbabilityFlow',
    inputSchema: PredictWinProbabilityInputSchema,
    outputSchema: PredictWinProbabilityOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
