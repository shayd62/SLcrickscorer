
'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CricketBallIcon, CricketBatIcon } from '@/components/icons';
import { Swords, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MatchConfig } from '@/lib/types';

const tossSchema = z.object({
  winner: z.enum(['team1', 'team2'], { required_error: 'Please select a toss winner.' }),
  decision: z.enum(['bat', 'bowl'], { required_error: 'Please select the winner\'s decision.' }),
});

type TossFormValues = z.infer<typeof tossSchema>;

function TossPageContent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const tournamentId = params.tournamentId as string;
    
    const matchConfig: MatchConfig | null = JSON.parse(searchParams.get('config') || 'null');

    const form = useForm<TossFormValues>({
        resolver: zodResolver(tossSchema),
    });

    if (!matchConfig) {
        return <div className="flex items-center justify-center min-h-screen">Invalid match configuration. Please go back.</div>;
    }

    const { team1, team2 } = matchConfig;

    const onSubmit = (data: TossFormValues) => {
        const updatedConfig = {
            ...matchConfig,
            toss: {
                winner: data.winner,
                decision: data.decision,
            },
        };

        const nextParams = new URLSearchParams({
            config: JSON.stringify(updatedConfig),
        });

        router.push(`/tournaments/${tournamentId}/opening-players?${nextParams.toString()}`);
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center text-2xl font-bold">Coin Toss</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <Controller
                            control={form.control}
                            name="winner"
                            render={({ field }) => (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-center flex items-center justify-center gap-2"><Trophy className="text-primary h-5 w-5"/> Who won the toss?</h3>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="bg-secondary p-2 rounded-lg grid grid-cols-2 gap-2">
                                        <Label htmlFor="t1" className={cn("p-4 rounded-md text-center cursor-pointer", field.value === 'team1' && "bg-background shadow-sm ring-2 ring-primary")}>
                                            <RadioGroupItem value="team1" id="t1" className="sr-only"/>
                                            {team1.name}
                                        </Label>
                                        <Label htmlFor="t2" className={cn("p-4 rounded-md text-center cursor-pointer", field.value === 'team2' && "bg-background shadow-sm ring-2 ring-primary")}>
                                            <RadioGroupItem value="team2" id="t2" className="sr-only"/>
                                            {team2.name}
                                        </Label>
                                    </RadioGroup>
                                    {form.formState.errors.winner && <p className="text-destructive text-sm text-center">{form.formState.errors.winner.message}</p>}
                                </div>
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="decision"
                            render={({ field }) => (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-center flex items-center justify-center gap-2"><Swords className="text-primary h-5 w-5"/> What did they choose?</h3>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="bg-secondary p-2 rounded-lg grid grid-cols-2 gap-2">
                                        <Label htmlFor="bat" className={cn("p-4 rounded-md text-center cursor-pointer flex items-center justify-center gap-2", field.value === 'bat' && "bg-background shadow-sm ring-2 ring-primary")}>
                                            <RadioGroupItem value="bat" id="bat" className="sr-only"/>
                                            <CricketBatIcon className="h-5 w-5"/> Bat
                                        </Label>
                                        <Label htmlFor="bowl" className={cn("p-4 rounded-md text-center cursor-pointer flex items-center justify-center gap-2", field.value === 'bowl' && "bg-background shadow-sm ring-2 ring-primary")}>
                                            <RadioGroupItem value="bowl" id="bowl" className="sr-only"/>
                                            <CricketBallIcon className="h-5 w-5"/> Bowl
                                        </Label>
                                    </RadioGroup>
                                    {form.formState.errors.decision && <p className="text-destructive text-sm text-center">{form.formState.errors.decision.message}</p>}
                                </div>
                            )}
                        />
                        <Button type="submit" size="lg" className="w-full">Confirm & Select Openers</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function TossPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading Toss...</div>}>
            <TossPageContent />
        </Suspense>
    )
}
