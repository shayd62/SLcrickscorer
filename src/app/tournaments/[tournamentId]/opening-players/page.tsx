
'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CricketBallIcon, CricketBatIcon } from '@/components/icons';
import type { MatchConfig, MatchState, Innings } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

const openingPlayersSchema = z.object({
    strikerId: z.string().min(1, 'Please select a striker.'),
    nonStrikerId: z.string().min(1, 'Please select a non-striker.'),
    bowlerId: z.string().min(1, 'Please select an opening bowler.'),
  }).refine(data => data.strikerId !== data.nonStrikerId, {
    message: "Striker and non-striker must be different players.",
    path: ["nonStrikerId"],
});

type OpeningPlayersFormValues = z.infer<typeof openingPlayersSchema>;

const createInitialState = (config: MatchConfig, userId?: string | null, matchId?: string): MatchState => {
  const { team1, team2, toss, opening, oversPerInnings } = config;
  
  const battingTeamKey = (toss.winner === 'team1' && toss.decision === 'bat') || (toss.winner === 'team2' && toss.decision === 'bowl') ? 'team1' : 'team2';
  const bowlingTeamKey = battingTeamKey === 'team1' ? 'team2' : 'team1';

  const createInnings = (bTKey: 'team1' | 'team2', boTKey: 'team1' | 'team2'): Innings => {
    const bTeam = bTKey === 'team1' ? team1 : team2;
    const boTeam = boTKey === 'team1' ? team1 : team2;
    return {
      battingTeam: bTKey,
      bowlingTeam: boTKey,
      score: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      timeline: [],
      batsmen: bTeam.players.reduce((acc, p) => ({ ...acc, [p.id]: { ...p, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false } }), {}),
      bowlers: boTeam.players.reduce((acc, p) => ({ ...acc, [p.id]: { ...p, overs: 0, balls: 0, maidens: 0, runsConceded: 0, wickets: 0 } }), {}),
      currentPartnership: {
        batsman1Id: opening.strikerId,
        batsman2Id: opening.nonStrikerId,
        runs: 0,
        balls: 0,
      },
      fallOfWickets: []
    }
  };

  return {
    id: matchId,
    config,
    innings1: createInnings(battingTeamKey, bowlingTeamKey),
    currentInnings: 'innings1',
    onStrikeId: opening.strikerId,
    nonStrikeId: opening.nonStrikerId,
    currentBowlerId: opening.bowlerId,
    matchOver: false,
    resultText: 'Match in progress...',
    userId: userId || undefined,
  };
};

function OpeningPlayersPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user } = useAuth();
    
    const matchConfig: MatchConfig | null = JSON.parse(searchParams.get('config') || 'null');

    const form = useForm<OpeningPlayersFormValues>({
        resolver: zodResolver(openingPlayersSchema),
    });

    if (!matchConfig) {
        return <div className="flex items-center justify-center min-h-screen">Invalid match configuration. Please go back.</div>;
    }

    const { toss, team1, team2 } = matchConfig;
    const battingTeamKey = (toss.winner === 'team1' && toss.decision === 'bat') || (toss.winner === 'team2' && toss.decision === 'bowl') ? 'team1' : 'team2';
    const bowlingTeamKey = battingTeamKey === 'team1' ? 'team2' : 'team1';

    const battingTeam = battingTeamKey === 'team1' ? team1 : team2;
    const bowlingTeam = bowlingTeamKey === 'team1' ? team1 : team2;

    const onSubmit = async (data: OpeningPlayersFormValues) => {
        const finalConfig = {
            ...matchConfig,
            opening: {
                strikerId: data.strikerId,
                nonStrikerId: data.nonStrikerId,
                bowlerId: data.bowlerId,
            }
        };

        const matchId = `${finalConfig.team1.name.replace(/\s+/g, '-')}-vs-${finalConfig.team2.name.replace(/\s+/g, '-')}-${Date.now()}`;
        const initialState = createInitialState(finalConfig, user?.uid, matchId);
        
        try {
            await setDoc(doc(db, "matches", matchId), initialState);
            toast({ title: "Match Created!", description: "Let the game begin!" });
            router.push(`/scoring/${matchId}`);
        } catch (e) {
            console.error("Error creating match: ", e);
            toast({ title: "Error", description: "Could not create the match.", variant: "destructive" });
        }
    };
    
    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-center text-2xl font-bold">Opening Lineup</CardTitle>
                    <CardDescription className="text-center">Select the opening batsmen and bowler to start the match.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2"><CricketBatIcon className="text-primary h-5 w-5"/> Batting Team: {battingTeam.name}</h3>
                            <div className="space-y-4">
                                <Controller
                                    control={form.control}
                                    name="strikerId"
                                    render={({ field }) => (
                                        <div>
                                            <Label>Striker</Label>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger><SelectValue placeholder="Select Striker" /></SelectTrigger>
                                                <SelectContent>
                                                    {battingTeam.players.map(p => <SelectItem key={p.id} value={p.id} disabled={p.id === form.watch('nonStrikerId')}>{p.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            {form.formState.errors.strikerId && <p className="text-destructive text-sm mt-1">{form.formState.errors.strikerId.message}</p>}
                                        </div>
                                    )}
                                />
                                <Controller
                                    control={form.control}
                                    name="nonStrikerId"
                                    render={({ field }) => (
                                        <div>
                                            <Label>Non-Striker</Label>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger><SelectValue placeholder="Select Non-Striker" /></SelectTrigger>
                                                <SelectContent>
                                                    {battingTeam.players.map(p => <SelectItem key={p.id} value={p.id} disabled={p.id === form.watch('strikerId')}>{p.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            {form.formState.errors.nonStrikerId && <p className="text-destructive text-sm mt-1">{form.formState.errors.nonStrikerId.message}</p>}
                                        </div>
                                    )}
                                />
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2"><CricketBallIcon className="text-primary h-5 w-5"/> Bowling Team: {bowlingTeam.name}</h3>
                            <Controller
                                control={form.control}
                                name="bowlerId"
                                render={({ field }) => (
                                     <div>
                                        <Label>Opening Bowler</Label>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger><SelectValue placeholder="Select Opening Bowler" /></SelectTrigger>
                                            <SelectContent>
                                                {bowlingTeam.players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        {form.formState.errors.bowlerId && <p className="text-destructive text-sm mt-1">{form.formState.errors.bowlerId.message}</p>}
                                    </div>
                                )}
                            />
                        </div>
                        <Button type="submit" size="lg" className="w-full">Start Match</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function OpeningPlayersPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <OpeningPlayersPageContent />
        </Suspense>
    )
}
