
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Calendar, MapPin, Plus, ChevronRight, Key, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { doc, collection, query, where, addDoc, getDocs, setDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import type { Team, MatchConfig, MatchState, Innings, Player, Tournament } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const matchDetailsSchema = z.object({
  matchType: z.enum(['Limited Overs', 'Test Match', 'The Hundred']),
  matchRound: z.enum(['League', 'Quarter Final', 'Pre Quarter Final', 'Final']),
  matchNumber: z.number().min(1),
  group: z.string().min(1, 'Group is required'),
  overs: z.number().min(1),
  pitchType: z.enum(['Turf', 'Mat', 'Cement', 'Astroturf']),
  ballType: z.enum(['Leather', 'Soft Tennis', 'Tape', 'Rubber']),
  pointsTable: z.boolean(),
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

function MatchDetailsContent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [team1, setTeam1] = useState<Team | null>(null);
    const [team2, setTeam2] = useState<Team | null>(null);
    const [squad1, setSquad1] = useState<Player[]>([]);
    const [squad2, setSquad2] = useState<Player[]>([]);
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<'team1' | 'team2' | null>(null);
    const [newPlayerName, setNewPlayerName] = useState('');
    const [addingPlayer, setAddingPlayer] = useState(false);

    const team1Name = searchParams.get('team1Name') || 'Team A';
    const team2Name = searchParams.get('team2Name') || 'Team B';
    const matchDateStr = searchParams.get('date');
    const venue = searchParams.get('venue') || 'TBD';
    const tournamentId = params.tournamentId as string;
    
    const [formattedDate, setFormattedDate] = useState<string | null>(null);

    const form = useForm<MatchDetailsFormValues>({
        resolver: zodResolver(matchDetailsSchema),
        defaultValues: {
            matchType: 'Limited Overs',
            matchRound: 'League',
            overs: 20,
            pitchType: 'Turf',
            ballType: 'Leather',
            pointsTable: true
        }
    });
    
    useEffect(() => {
        if (matchDateStr) {
            const date = new Date(decodeURIComponent(matchDateStr));
            setFormattedDate(date.toLocaleString());
        } else {
            setFormattedDate('Date not set');
        }
    }, [matchDateStr]);

    const fetchTournament = useCallback(async () => {
        if (!tournamentId) return;
        const unsub = onSnapshot(doc(db, "tournaments", tournamentId), (doc) => {
            if (doc.exists()) {
                setTournament({ ...doc.data() as Tournament, id: doc.id });
            }
        });
        return unsub;
    }, [tournamentId]);
    
    useEffect(() => {
        fetchTournament();
    }, [fetchTournament]);

    const fetchTeams = useCallback(async () => {
        if (!user) return;
        try {
            const teamsRef = collection(db, 'teams');
            
            const fetchTeamData = async (name: string) => {
                const q = query(teamsRef, where("name", "==", name), where("userId", "==", user.uid));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Team;
                }
                return null;
            }

            const team1Data = await fetchTeamData(team1Name);
            if (team1Data) {
                setTeam1(team1Data);
                setSquad1(team1Data.players);
            }

            const team2Data = await fetchTeamData(team2Name);
             if (team2Data) {
                setTeam2(team2Data);
                setSquad2(team2Data.players);
            }

        } catch (error) {
            console.error("Error fetching teams: ", error);
            toast({ title: "Error", description: "Could not load team data.", variant: "destructive" });
        }
    }, [team1Name, team2Name, user, toast]);

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);


    const handleSquadSelect = (teamKey: 'team1' | 'team2') => {
        setEditingTeam(teamKey);
        setDialogOpen(true);
    };

    const handlePlayerSelection = (playerId: string, isSelected: boolean) => {
        const setSquad = editingTeam === 'team1' ? setSquad1 : setSquad2;
        const originalTeam = editingTeam === 'team1' ? team1 : team2;
        if (!originalTeam) return;
    
        setSquad(currentSquad => {
            const playerInSquad = currentSquad.some(p => p.id === playerId);
    
            if (isSelected && !playerInSquad) {
                const playerToAdd = originalTeam.players.find(p => p.id === playerId);
                if (playerToAdd) {
                    return [...currentSquad, playerToAdd];
                }
            } else if (!isSelected && playerInSquad) {
                return currentSquad.filter(p => p.id !== playerId);
            }
            return currentSquad;
        });
    };

    const handleAddNewPlayer = async () => {
        if (!newPlayerName.trim()) {
            toast({ title: "Player name is empty", variant: "destructive" });
            return;
        }

        const teamToUpdate = editingTeam === 'team1' ? team1 : team2;
        const setTeamState = editingTeam === 'team1' ? setTeam1 : setTeam2;
        const setSquadState = editingTeam === 'team1' ? setSquad1 : setSquad2;
        
        if (!teamToUpdate) return;
        
        const newPlayer: Player = {
            id: `player-${Date.now()}`,
            name: newPlayerName.trim(),
        };

        const updatedPlayers = [...teamToUpdate.players, newPlayer];
        const updatedTeamData = { ...teamToUpdate, players: updatedPlayers };

        try {
            const teamRef = doc(db, 'teams', teamToUpdate.id);
            await updateDoc(teamRef, { players: arrayUnion({id: newPlayer.id, name: newPlayer.name}) });
            
            setTeamState(updatedTeamData);
            setSquadState(squad => [...squad, newPlayer]);
            
            toast({ title: "Player Added!", description: `${newPlayer.name} has been added to ${teamToUpdate.name}.` });
            setNewPlayerName('');
            setAddingPlayer(false);
        } catch (error) {
            console.error("Error adding new player: ", error);
            toast({ title: "Error", description: "Could not add player.", variant: "destructive" });
        }
    };
    
    const handleStartMatch = (data: MatchDetailsFormValues) => {
        if (!team1 || !team2 || squad1.length < 2 || squad2.length < 2) {
            toast({ title: "Squad Error", description: "Both teams must have at least 2 players selected.", variant: 'destructive' });
            return;
        }

        const team1WithIds = { ...team1, players: squad1.map((p, i) => ({ ...p, id: `t1p${i+1}` })) };
        const team2WithIds = { ...team2, players: squad2.map((p, i) => ({ ...p, id: `t2p${i+1}` })) };

        const config: MatchConfig = {
            team1: team1WithIds,
            team2: team2WithIds,
            oversPerInnings: data.overs,
            playersPerSide: squad1.length,
            toss: { // Dummy toss, can be decided on scoring screen
                winner: 'team1',
                decision: 'bat',
            },
            opening: { // Dummy opening players, must be selected on scoring screen
                strikerId: team1WithIds.players[0].id,
                nonStrikerId: team1WithIds.players[1].id,
                bowlerId: team2WithIds.players[0].id,
            },
            tournamentId,
            venue: venue,
            ballsPerOver: 6,
            noBall: { enabled: true, reball: true, run: 1 },
            wideBall: { enabled: true, reball: true, run: 1 },
            ...data
        };
        
        const matchId = `${config.team1.name.replace(/\s+/g, '-')}-vs-${config.team2.name.replace(/\s+/g, '-')}-${Date.now()}`;
        
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
        
        const initialState = createInitialState(config, user?.uid, matchId);
        
        setDoc(doc(db, "matches", matchId), initialState)
            .then(() => {
                toast({ title: "Match Created!", description: "Redirecting to scoring..." });
                router.push(`/scoring/${initialState.id}`);
            })
            .catch(error => {
                 console.error("Error creating match: ", error);
                 toast({ title: "Error", description: "Could not create the match.", variant: "destructive" });
            });
    };

    const editingTeamData = editingTeam === 'team1' ? team1 : team2;
    const editingSquadData = editingTeam === 'team1' ? squad1 : squad2;

    return (
        <div className="min-h-screen bg-gray-50 text-foreground font-body">
            <form onSubmit={form.handleSubmit(handleStartMatch)}>
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
                            <Image src="https://picsum.photos/100/100" alt="Team 1 Logo" width={60} height={60} className="rounded-full" data-ai-hint="cricket team" />
                            <span className="font-semibold text-sm">{team1Name}</span>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleSquadSelect('team1')} disabled={!team1} className="text-black">Select Squad</Button>
                        </div>
                        <span className="text-2xl font-bold text-gray-400">VS</span>
                         <div className="flex flex-col items-center gap-2">
                            <Image src="https://picsum.photos/100/100" alt="Team 2 Logo" width={60} height={60} className="rounded-full" data-ai-hint="cricket team" />
                            <span className="font-semibold text-sm">{team2Name}</span>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleSquadSelect('team2')} disabled={!team2} className="text-black">Select Squad</Button>
                        </div>
                    </div>
                </header>

                <main className="p-4 space-y-6">
                    <div className="space-y-2">
                        <Label className="font-semibold">Match Type</Label>
                        <div className="flex gap-2">
                            <ChipButton label="Limited Overs" isSelected={form.watch('matchType') === 'Limited Overs'} onClick={() => form.setValue('matchType', 'Limited Overs')} />
                            <ChipButton label="Test Match" isSelected={form.watch('matchType') === 'Test Match'} onClick={() => form.setValue('matchType', 'Test Match')} />
                            <ChipButton label="The Hundred" isSelected={form.watch('matchType') === 'The Hundred'} onClick={() => form.setValue('matchType', 'The Hundred')} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label className="font-semibold">Match Round</Label>
                        <div className="flex gap-2">
                           <ChipButton label="League" isSelected={form.watch('matchRound') === 'League'} onClick={() => form.setValue('matchRound', 'League')} />
                           <ChipButton label="Quarter Final" isSelected={form.watch('matchRound') === 'Quarter Final'} onClick={() => form.setValue('matchRound', 'Quarter Final')} />
                           <ChipButton label="Pre Quarter Final" isSelected={form.watch('matchRound') === 'Pre Quarter Final'} onClick={() => form.setValue('matchRound', 'Pre Quarter Final')} />
                           <ChipButton label="Final" isSelected={form.watch('matchRound') === 'Final'} onClick={() => form.setValue('matchRound', 'Final')} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor="match-number" className="font-semibold">Match Number</Label>
                            <Input id="match-number" type="number" {...form.register('matchNumber', { valueAsNumber: true })} className="w-20" />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                            <Label htmlFor="group-select" className="font-semibold">Group</Label>
                             <Controller
                                control={form.control}
                                name="group"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                             <Button type="button" variant="ghost" className="p-0 h-auto">
                                0 Selected <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
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
                        <div className="flex gap-2">
                            <ChipButton label="Leather" isSelected={form.watch('ballType') === 'Leather'} onClick={() => form.setValue('ballType', 'Leather')} />
                           <ChipButton label="Soft Tennis" isSelected={form.watch('ballType') === 'Soft Tennis'} onClick={() => form.setValue('ballType', 'Soft Tennis')} />
                           <ChipButton label="Tape" isSelected={form.watch('ballType') === 'Tape'} onClick={() => form.setValue('ballType', 'Tape')} />
                           <ChipButton label="Rubber" isSelected={form.watch('ballType') === 'Rubber'} onClick={() => form.setValue('ballType', 'Rubber')} />
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-gray-500" />
                            <div>
                                <Label className="font-semibold">Location</Label>
                                <p className="text-sm text-muted-foreground">{venue}</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                     <div className="flex items-center justify-between p-3 border rounded-lg">
                         <div className="flex items-center gap-3">
                            <Key className="h-5 w-5 text-gray-500" />
                            <div>
                                <Label className="font-semibold">Match Officials</Label>
                                <p className="text-sm text-muted-foreground">Choose Officials</p>
                            </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
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
                <footer className="p-4 sticky bottom-0 bg-white border-t">
                    <Button type="submit" size="lg" className="w-full">Start Now</Button>
                </footer>
            </form>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select Squad for {editingTeamData?.name}</DialogTitle>
                        <DialogDescription>Select the players who will be playing in this match.</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-80 overflow-y-auto space-y-2 p-1">
                        {editingTeamData?.players.map(player => (
                            <div key={player.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={player.id}
                                    checked={editingSquadData.some(p => p.id === player.id)}
                                    onCheckedChange={(checked) => handlePlayerSelection(player.id, !!checked)}
                                />
                                <Label htmlFor={player.id}>{player.name}</Label>
                            </div>
                        ))}
                    </div>
                     {addingPlayer && (
                        <div className="flex items-center gap-2 mt-4">
                            <Input 
                                placeholder="New player name" 
                                value={newPlayerName}
                                onChange={(e) => setNewPlayerName(e.target.value)}
                            />
                            <Button onClick={handleAddNewPlayer} size="sm">Save</Button>
                            <Button onClick={() => setAddingPlayer(false)} size="sm" variant="ghost">Cancel</Button>
                        </div>
                    )}
                    <DialogFooter className="sm:justify-between items-center mt-4">
                        <Button type="button" variant="outline" onClick={() => setAddingPlayer(true)} disabled={addingPlayer}>
                            <Plus className="mr-2 h-4 w-4" /> Add Player
                        </Button>
                        <DialogClose asChild><Button type="button" onClick={() => setDialogOpen(false)}>Done</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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

    
