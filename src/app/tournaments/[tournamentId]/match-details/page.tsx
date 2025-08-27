

'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, MapPin, Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { doc, collection, query, where, addDoc, getDocs, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import type { Team, MatchConfig, MatchState, Innings, Player } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';

function createInitialState(config: MatchConfig, userId?: string | null, matchId?: string): MatchState {
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


function MatchDetailsContent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { user } = useAuth();

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

    useEffect(() => {
        if (matchDateStr) {
            const date = new Date(decodeURIComponent(matchDateStr));
            setFormattedDate(date.toLocaleString());
        } else {
            setFormattedDate('Date not set');
        }
    }, [matchDateStr]);

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
            const player = originalTeam.players.find(p => p.id === playerId);
            if (!player) return currentSquad;

            if (isSelected) {
                // Add player if not already in squad
                if (!currentSquad.some(p => p.id === playerId)) {
                    return [...currentSquad, player];
                }
            } else {
                // Remove player from squad
                return currentSquad.filter(p => p.id !== playerId);
            }
            // Return current squad if no change
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
            setSquadState(squad => [...squad, newPlayer]); // Also add to current squad
            
            toast({ title: "Player Added!", description: `${newPlayer.name} has been added to ${teamToUpdate.name}.` });
            setNewPlayerName('');
            setAddingPlayer(false);
        } catch (error) {
            console.error("Error adding new player: ", error);
            toast({ title: "Error", description: "Could not add player.", variant: "destructive" });
        }
    };
    
    const handleStartMatch = async () => {
        if (!team1 || !team2 || squad1.length < 2 || squad2.length < 2) {
            toast({ title: "Squad Error", description: "Both teams must have at least 2 players selected.", variant: 'destructive' });
            return;
        }

        const team1WithIds = { ...team1, players: squad1.map((p, i) => ({ ...p, id: `t1p${i+1}` })) };
        const team2WithIds = { ...team2, players: squad2.map((p, i) => ({ ...p, id: `t2p${i+1}` })) };

        const config: MatchConfig = {
            team1: team1WithIds,
            team2: team2WithIds,
            oversPerInnings: 20, // Default or fetch from tournament
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
        };
        
        try {
            const matchId = `${config.team1.name.replace(/\s+/g, '-')}-vs-${config.team2.name.replace(/\s+/g, '-')}-${Date.now()}`;
            const initialState = createInitialState(config, user?.uid, matchId);
            await setDoc(doc(db, "matches", matchId), initialState);
            
            toast({ title: "Match Created!", description: "Redirecting to scoring..." });
            router.push(`/scoring/${initialState.id}`);

        } catch (error) {
             console.error("Error creating match: ", error);
             toast({ title: "Error", description: "Could not create the match.", variant: "destructive" });
        }
    };

    const editingTeamData = editingTeam === 'team1' ? team1 : team2;
    const editingSquadData = editingTeam === 'team1' ? squad1 : squad2;

    return (
        <div className="min-h-screen bg-gray-50 text-foreground font-body">
            <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
                <div className='flex flex-col items-center'>
                    <h1 className="text-2xl font-bold">Match Details</h1>
                </div>
                <div className="w-10"></div>
            </header>
            <main className="p-4 md:p-8 flex justify-center">
                <Card className="w-full max-w-2xl shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-center text-2xl font-bold">{team1Name} vs {team2Name}</CardTitle>
                        <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-4 pt-2">
                             <div className='flex items-center gap-1.5'>
                                <Calendar className="h-4 w-4"/>
                                <span>{formattedDate || 'Loading date...'}</span>
                             </div>
                             <div className='flex items-center gap-1.5'>
                                <MapPin className="h-4 w-4"/>
                                <span>{venue}</span>
                             </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Separator />
                        <div className="w-full max-w-lg mx-auto flex justify-around items-center">
                            <div className="flex flex-col items-center gap-2">
                                <Image src="https://picsum.photos/100/100" alt="Team 1 Logo" width={60} height={60} className="rounded-full" data-ai-hint="cricket team" />
                                <span className="font-semibold">{team1Name}</span>
                                <Button variant="outline" size="sm" onClick={() => handleSquadSelect('team1')} disabled={!team1}>Select Squad</Button>
                            </div>
                            <span className="text-2xl font-bold text-muted-foreground">VS</span>
                             <div className="flex flex-col items-center gap-2">
                                <Image src="https://picsum.photos/100/100" alt="Team 2 Logo" width={60} height={60} className="rounded-full" data-ai-hint="cricket team" />
                                <span className="font-semibold">{team2Name}</span>
                                <Button variant="outline" size="sm" onClick={() => handleSquadSelect('team2')} disabled={!team2}>Select Squad</Button>
                            </div>
                        </div>

                         <div className="flex justify-center gap-4 pt-6">
                            <Button size="lg" className="w-40" onClick={handleStartMatch}>Start Now</Button>
                        </div>
                    </CardContent>
                </Card>
            </main>
            
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
                        <Button variant="outline" onClick={() => setAddingPlayer(true)} disabled={addingPlayer}>
                            <Plus className="mr-2 h-4 w-4" /> Add Player
                        </Button>
                        <DialogClose asChild><Button onClick={() => setDialogOpen(false)}>Done</Button></DialogClose>
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

    
