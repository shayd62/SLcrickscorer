

'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Calendar, MapPin, Plus, ChevronRight, Key, Shield, Search, Settings, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { doc, collection, query, where, addDoc, getDocs, setDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import type { Team, MatchConfig, MatchState, Innings, Player, Tournament, UserProfile, PowerPlay } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PlayerSearchDialog } from '@/components/player-search-dialog';

const powerPlaySchema = z.object({
  type: z.string().min(1),
  startOver: z.number().min(1),
  endOver: z.number().min(1),
});

const matchDetailsSchema = z.object({
  matchType: z.enum(['Limited Overs', 'Test Match', 'The Hundred', 'T20', 'ODI', 'Sixes a Side']),
  matchRound: z.enum(['League', 'Quarter Final', 'Semi Final', 'Final']),
  matchNumber: z.number().min(1),
  group: z.string().optional(),
  overs: z.number().min(1),
  pitchType: z.enum(['Turf', 'Mat', 'Cement', 'Astroturf']),
  ballType: z.enum(['Leather Ball', 'Tennis Ball', 'Tape Tennis Ball', 'Rubber Ball', 'Synthetic Ball', 'Other']),
  pointsTable: z.boolean(),
  powerPlay: z.array(powerPlaySchema).optional(),
});

type MatchDetailsFormValues = z.infer<typeof matchDetailsSchema>;

function ChipButton({ label, isSelected, onClick }: { label: string, isSelected: boolean, onClick: () => void }) {
    return (
        <Button
            type="button"
            variant={isSelected ? 'default' : 'outline'}
            className={cn("rounded-full", isSelected && "bg-green-500 hover:bg-green-600")}
            onClick={onClick}
        >
            {label}
        </Button>
    )
}

function PowerPlayDialog({ open, onOpenChange, control, overs }: { open: boolean; onOpenChange: (open: boolean) => void; control: any; overs: number }) {
    const { fields, append, remove } = useFieldArray({ control, name: 'powerPlay' });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Power Play Settings</DialogTitle>
                    <DialogDescription>Define the Power Play overs for the match. Max overs: {overs}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2 border p-2 rounded-lg">
                            <Input
                                {...control.register(`powerPlay.${index}.type`)}
                                placeholder={`P${index + 1}`}
                                className="w-16"
                            />
                            <Input
                                type="number"
                                {...control.register(`powerPlay.${index}.startOver`, { valueAsNumber: true, max: overs })}
                                placeholder="Start"
                                className="w-20"
                            />
                            <Input
                                type="number"
                                {...control.register(`powerPlay.${index}.endOver`, { valueAsNumber: true, max: overs })}
                                placeholder="End"
                                className="w-20"
                            />
                            <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button variant="outline" onClick={() => append({ type: `P${fields.length + 1}`, startOver: 1, endOver: overs })}>
                    <Plus className="mr-2 h-4 w-4" /> Add Power Play Phase
                </Button>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button onClick={() => onOpenChange(false)}>Done</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function MatchDetailsContent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [team1, setTeam1] = useState<Team | null>(null);
    const [team2, setTeam2] = useState<Team | null>(null);
    
    const [powerPlayDialogOpen, setPowerPlayDialogOpen] = useState(false);
    
    const team1Name = searchParams.get('team1Name') || 'Team A';
    const team2Name = searchParams.get('team2Name') || 'Team B';
    const matchDateStr = searchParams.get('date');
    const venue = searchParams.get('venue') || 'TBD';
    const tournamentId = params.tournamentId as string;
    const matchRoundParam = searchParams.get('matchRound') as 'League' | 'Quarter Final' | 'Semi Final' | 'Final' | null;

    
    const [formattedDate, setFormattedDate] = useState<string | null>(null);

    const form = useForm<MatchDetailsFormValues>({
        resolver: zodResolver(matchDetailsSchema),
        defaultValues: {
            matchType: 'Limited Overs',
            matchRound: matchRoundParam || 'League',
            overs: 20,
            pitchType: 'Turf',
            ballType: 'Leather Ball',
            pointsTable: true,
            powerPlay: [{ type: 'P1', startOver: 1, endOver: 6 }]
        }
    });

    const matchRound = form.watch('matchRound');
    const isKnockoutStage = ['Quarter Final', 'Semi Final', 'Final'].includes(matchRound);

    useEffect(() => {
        if (matchDateStr) {
            const date = new Date(decodeURIComponent(matchDateStr));
            setFormattedDate(date.toLocaleString());
        } else {
            setFormattedDate('Date not set');
        }
    }, [matchDateStr]);

    useEffect(() => {
        if (matchRoundParam) {
            form.setValue('matchRound', matchRoundParam);
        }
    }, [matchRoundParam, form]);

    const fetchTournament = useCallback(async () => {
        if (!tournamentId) return;
        const unsub = onSnapshot(doc(db, "tournaments", tournamentId), (doc) => {
            if (doc.exists()) {
                const tournamentData = { ...doc.data() as Tournament, id: doc.id };
                setTournament(tournamentData);
                // Set default form values from tournament settings
                form.setValue('overs', tournamentData.oversPerInnings || 20);
                if (tournamentData.tournamentFormat) {
                  form.setValue('matchType', tournamentData.tournamentFormat);
                }
            }
        });
        return unsub;
    }, [tournamentId, form]);
    
    useEffect(() => {
        fetchTournament();
    }, [fetchTournament]);

    useEffect(() => {
        if (tournament) {
            const nextMatchNumber = (tournament.matches?.length || 0) + 1;
            form.setValue('matchNumber', nextMatchNumber);

            const group = tournament.groups?.find(g => g.teams.includes(team1Name) && g.teams.includes(team2Name));
            if (group) {
                form.setValue('group', group.name);
            }
        }
    }, [tournament, team1Name, team2Name, form]);

    const fetchTeams = useCallback(async () => {
        try {
            const teamsRef = collection(db, 'teams');
            
            const fetchTeamData = async (name: string) => {
                const q = query(teamsRef, where("name", "==", name));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Team;
                }
                return null;
            }

            const team1Data = await fetchTeamData(team1Name);
            if (team1Data) setTeam1(team1Data);

            const team2Data = await fetchTeamData(team2Name);
            if (team2Data) setTeam2(team2Data);

        } catch (error) {
            console.error("Error fetching teams: ", error);
            toast({ title: "Error", description: "Could not load team data.", variant: "destructive" });
        }
    }, [team1Name, team2Name, toast]);

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);


    const handleProceedToToss = (data: MatchDetailsFormValues) => {
        if (!team1 || !team2) {
            toast({ title: "Team Error", description: "One or both teams could not be loaded.", variant: 'destructive' });
            return;
        }

        const config: MatchConfig = {
            team1: team1,
            team2: team2,
            oversPerInnings: data.overs,
            playersPerSide: Math.min(team1.players.length, team2.players.length), // Use the smaller team size
            toss: { // Dummy toss, will be decided on next page
                winner: 'team1',
                decision: 'bat',
            },
            opening: { // Dummy opening players, to be selected later
                strikerId: '',
                nonStrikerId: '',
                bowlerId: '',
            },
            tournamentId,
            venue: venue,
            matchDate: matchDateStr ? decodeURIComponent(matchDateStr) : undefined,
            ballsPerOver: tournament?.ballsPerOver || 6,
            powerPlay: data.powerPlay,
            noBall: tournament?.noBall || { enabled: true, reball: true, run: 1 },
            wideBall: tournament?.wideBall || { enabled: true, reball: true, run: 1 },
            ...data
        };
        
        const params = new URLSearchParams({
            config: JSON.stringify(config),
        });

        router.push(`/tournaments/${tournamentId}/toss?${params.toString()}`);
    };
    
    return (
        <div className="min-h-screen bg-background text-foreground font-body">
            <PowerPlayDialog open={powerPlayDialogOpen} onOpenChange={setPowerPlayDialogOpen} control={form.control} overs={form.watch('overs')} />
            <form onSubmit={form.handleSubmit(handleProceedToToss)}>
                <header className="p-4 bg-gray-800 text-white">
                    <div className="flex items-center justify-between">
                         <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:bg-gray-700"><ArrowLeft className="h-6 w-6" /></Button>
                         <h1 className="text-lg font-bold text-center">{team1Name} vs {team2Name}</h1>
                         <div className="w-10"></div>
                    </div>
                    <div className="text-center text-xs text-gray-300 flex items-center justify-center gap-4 pt-2">
                         <div className='flex items-center gap-1.5'>
                            <Calendar className="h-4 w-4"/>
                            <span>{formattedDate || 'Loading date...'}</span>
                         </div>
                         <div className='flex items-center gap-1.5'>
                            <MapPin className="h-4 w-4"/>
                            <span>{venue}</span>
                         </div>
                    </div>
                    <div className="mt-4 flex justify-around items-center">
                        <div className="flex flex-col items-center gap-2">
                            <Image src={team1?.logoUrl || "https://picsum.photos/seed/t1-logo/100/100"} alt="Team 1 Logo" width={60} height={60} className="rounded-full" data-ai-hint="cricket team" />
                            <span className="font-semibold text-sm">{team1Name}</span>
                        </div>
                        <span className="text-2xl font-bold text-gray-400">VS</span>
                         <div className="flex flex-col items-center gap-2">
                            <Image src={team2?.logoUrl || "https://picsum.photos/seed/t2-logo/100/100"} alt="Team 2 Logo" width={60} height={60} className="rounded-full" data-ai-hint="cricket team" />
                            <span className="font-semibold text-sm">{team2Name}</span>
                        </div>
                    </div>
                </header>

                <main className="p-4 space-y-6">
                    <div className="space-y-2">
                        <Label className="font-semibold">Match Type</Label>
                        <div className="flex flex-wrap gap-2">
                            <ChipButton label="Limited Overs" isSelected={form.watch('matchType') === 'Limited Overs'} onClick={() => form.setValue('matchType', 'Limited Overs')} />
                            <ChipButton label="T20" isSelected={form.watch('matchType') === 'T20'} onClick={() => form.setValue('matchType', 'T20')} />
                            <ChipButton label="ODI" isSelected={form.watch('matchType') === 'ODI'} onClick={() => form.setValue('matchType', 'ODI')} />
                            <ChipButton label="Test Match" isSelected={form.watch('matchType') === 'Test Match'} onClick={() => form.setValue('matchType', 'Test Match')} />
                            <ChipButton label="The Hundred" isSelected={form.watch('matchType') === 'The Hundred'} onClick={() => form.setValue('matchType', 'The Hundred')} />
                            <ChipButton label="Sixes a Side" isSelected={form.watch('matchType') === 'Sixes a Side'} onClick={() => form.setValue('matchType', 'Sixes a Side')} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label className="font-semibold">Match Round</Label>
                        <div className="flex flex-wrap gap-2">
                           <ChipButton label="League" isSelected={form.watch('matchRound') === 'League'} onClick={() => form.setValue('matchRound', 'League')} />
                           <ChipButton label="Quarter Final" isSelected={form.watch('matchRound') === 'Quarter Final'} onClick={() => form.setValue('matchRound', 'Quarter Final')} />
                           <ChipButton label="Semi Final" isSelected={form.watch('matchRound') === 'Semi Final'} onClick={() => form.setValue('matchRound', 'Semi Final')} />
                           <ChipButton label="Final" isSelected={form.watch('matchRound') === 'Final'} onClick={() => form.setValue('matchRound', 'Final')} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor="match-number" className="font-semibold">Match Number</Label>
                            <Input id="match-number" type="number" {...form.register('matchNumber', { valueAsNumber: true })} className="w-20" />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor="group-select" className={cn("font-semibold", isKnockoutStage && "text-muted-foreground")}>Group</Label>
                             <Controller
                                control={form.control}
                                name="group"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isKnockoutStage}>
                                        <SelectTrigger className="w-24 border-0 shadow-none">
                                            <SelectValue placeholder="Select"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tournament?.groups?.map(g => <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor="overs" className="font-semibold">Overs</Label>
                            <Input id="overs" type="number" {...form.register('overs', { valueAsNumber: true })} className="w-20" />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                           <Label className="font-semibold">PowerPlay</Label>
                           <Button type="button" variant="ghost" onClick={() => setPowerPlayDialogOpen(true)}><Settings className="h-5 w-5" /></Button>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label className="font-semibold">Pitch Type</Label>
                        <div className="flex gap-2">
                           <ChipButton label="Turf" isSelected={form.watch('pitchType') === 'Turf'} onClick={() => form.setValue('pitchType', 'Turf')} />
                           <ChipButton label="Mat" isSelected={form.watch('pitchType') === 'Mat'} onClick={() => form.setValue('pitchType', 'Mat')} />
                           <ChipButton label="Cement" isSelected={form.watch('pitchType') === 'Cement'} onClick={() => form.setValue('pitchType', 'Cement')} />
                           <ChipButton label="Astroturf" isSelected={form.watch('pitchType') === 'Astroturf'} onClick={() => form.setValue('pitchType', 'Astroturf')} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label className="font-semibold">Ball Type</Label>
                        <div className="flex flex-wrap gap-2">
                            <ChipButton label="Leather Ball" isSelected={form.watch('ballType') === 'Leather Ball'} onClick={() => form.setValue('ballType', 'Leather Ball')} />
                            <ChipButton label="Tennis Ball" isSelected={form.watch('ballType') === 'Tennis Ball'} onClick={() => form.setValue('ballType', 'Tennis Ball')} />
                            <ChipButton label="Tape Tennis Ball" isSelected={form.watch('ballType') === 'Tape Tennis Ball'} onClick={() => form.setValue('ballType', 'Tape Tennis Ball')} />
                            <ChipButton label="Rubber Ball" isSelected={form.watch('ballType') === 'Rubber Ball'} onClick={() => form.setValue('ballType', 'Rubber Ball')} />
                            <ChipButton label="Synthetic Ball" isSelected={form.watch('ballType') === 'Synthetic Ball'} onClick={() => form.setValue('ballType', 'Synthetic Ball')} />
                            <ChipButton label="Other" isSelected={form.watch('ballType') === 'Other'} onClick={() => form.setValue('ballType', 'Other')} />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <MapPin className="h-5 w-5 text-gray-500" />
                        <div>
                            <Label className="font-semibold">Location</Label>
                            <p className="text-sm text-muted-foreground">{venue}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                         <Key className="h-5 w-5 text-gray-500" />
                        <div>
                            <Label className="font-semibold">Match Officials</Label>
                            <p className="text-sm text-muted-foreground">Not assigned</p>
                        </div>
                    </div>

                     <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                            <Label htmlFor="points-table-switch" className="font-semibold">Points Table</Label>
                            <p className="text-sm text-muted-foreground">Impact of This Match on the Points Table</p>
                        </div>
                        <Controller
                            control={form.control}
                            name="pointsTable"
                            render={({ field }) => (
                                <Switch
                                    id="points-table-switch"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            )}
                        />
                    </div>
                </main>
                <footer className="p-4 sticky bottom-0 bg-background border-t">
                    <Button type="submit" size="lg" className="w-full">Save & Proceed to Toss</Button>
                </footer>
            </form>
        </div>
    )
}


export default function MatchDetailsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading details...</div>}>
            <MatchDetailsContent />
        </Suspense>
    )
}


