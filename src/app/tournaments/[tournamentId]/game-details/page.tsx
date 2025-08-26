
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, CalendarIcon, Gamepad2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tournament, TournamentMatch } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const gameDetailsSchema = z.object({
  matchType: z.string({ required_error: "Match type is required." }),
  date: z.date({ required_error: "Match date is required." }),
  venue: z.string().min(1, "Venue is required."),
  overs: z.number().min(1, "Overs must be at least 1.").max(100),
  umpire: z.string().optional(),
});

type GameDetailsFormValues = z.infer<typeof gameDetailsSchema>;

export default function GameDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const tournamentId = params.tournamentId as string;
    const groupName = searchParams.get('group');
    const team1 = searchParams.get('team1');
    const team2 = searchParams.get('team2');
    
    const form = useForm<GameDetailsFormValues>({
        resolver: zodResolver(gameDetailsSchema),
        defaultValues: { overs: 20 },
    });

    useEffect(() => {
        if (!groupName || !team1 || !team2) {
            toast({ title: "Missing Information", description: "Team and group selection is required.", variant: "destructive" });
            router.push(`/tournaments/${tournamentId}`);
        }
    }, [groupName, team1, team2, tournamentId, router, toast]);

    const onSubmit = async (data: GameDetailsFormValues) => {
        const newMatch: TournamentMatch = {
            id: `match-${team1!.replace(/\s/g, '')}-vs-${team2!.replace(/\s/g, '')}-${Date.now()}`,
            groupName: groupName!,
            team1: team1!,
            team2: team2!,
            status: 'Upcoming',
            date: data.date.toISOString(),
            venue: data.venue,
            overs: data.overs,
            matchType: data.matchType,
        };

        try {
            const tournamentRef = doc(db, "tournaments", tournamentId);
            await updateDoc(tournamentRef, {
                matches: arrayUnion(newMatch)
            });
            toast({ title: "Match Added!", description: "The new match has been scheduled." });
            router.push(`/tournaments/${tournamentId}`);
        } catch (e) {
            console.error("Error adding match: ", e);
            toast({ title: "Error", description: "Could not save the match.", variant: 'destructive' });
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-50 text-foreground font-body">
             <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
                <div className='flex flex-col items-center text-center'>
                    <h1 className="text-2xl font-bold">Game Details</h1>
                    <p className="text-sm text-muted-foreground">{team1} vs {team2}</p>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="p-4 md:p-8 flex justify-center">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Step 2: Enter Match Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Match Type</Label>
                                    <Controller
                                        control={form.control}
                                        name="matchType"
                                        render={({ field }) => (
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="T20">T20</SelectItem>
                                              <SelectItem value="ODI">ODI</SelectItem>
                                              <SelectItem value="Test">Test</SelectItem>
                                              <SelectItem value="Custom">Custom</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        )}
                                      />
                                    {form.formState.errors.matchType && <p className="text-destructive text-sm">{form.formState.errors.matchType.message}</p>}
                                </div>
                                <div className="space-y-2">
                                  <Label>Date</Label>
                                   <Controller
                                      control={form.control}
                                      name="date"
                                      render={({ field }) => (
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                              <CalendarIcon className="mr-2 h-4 w-4" />
                                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                        </Popover>
                                      )}
                                    />
                                  {form.formState.errors.date && <p className="text-destructive text-sm">{form.formState.errors.date.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="venue">Venue</Label>
                                <Input id="venue" {...form.register('venue')} placeholder="e.g., National Stadium" />
                                {form.formState.errors.venue && <p className="text-destructive text-sm">{form.formState.errors.venue.message}</p>}
                            </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="overs">Number of Overs</Label>
                                    <Input id="overs" type="number" {...form.register('overs', { valueAsNumber: true })} />
                                    {form.formState.errors.overs && <p className="text-destructive text-sm">{form.formState.errors.overs.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="umpire">Umpire (Optional)</Label>
                                    <Input id="umpire" {...form.register('umpire')} placeholder="Enter umpire name" />
                                </div>
                            </div>
                            
                            <Button type="submit" className="w-full text-lg py-6">
                                <Gamepad2 className="mr-2 h-5 w-5" />
                                Save Match
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
