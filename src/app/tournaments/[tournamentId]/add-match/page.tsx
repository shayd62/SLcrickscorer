
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tournament, TournamentGroup, TournamentMatch } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export default function AddMatchPage() {
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<TournamentGroup | null>(null);
    const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
    const [matchDate, setMatchDate] = useState<Date | undefined>();
    const [matchTime, setMatchTime] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
    
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const tournamentId = params.tournamentId as string;

    const fetchTournamentAndListen = useCallback(() => {
        if (!tournamentId) return;
        const unsub = onSnapshot(doc(db, "tournaments", tournamentId), (doc) => {
            if (doc.exists()) {
                const tournamentData = { ...doc.data() as Tournament, id: doc.id };
                setTournament(tournamentData);

                const groupNameFromParams = searchParams.get('group');
                if (groupNameFromParams) {
                    const group = tournamentData.groups?.find(g => g.name === groupNameFromParams);
                    if (group) {
                        setSelectedGroup(group);
                    }
                }

                const editMode = searchParams.get('edit') === 'true';
                const matchId = searchParams.get('matchId');

                if (editMode && matchId) {
                    setIsEditing(true);
                    setEditingMatchId(matchId);
                    const matchToEdit = tournamentData.matches?.find(m => m.id === matchId);
                    if (matchToEdit) {
                        const group = tournamentData.groups?.find(g => g.name === matchToEdit.groupName) || null;
                        setSelectedGroup(group);
                        setSelectedTeams([matchToEdit.team1, matchToEdit.team2]);
                        if (matchToEdit.date) {
                            const date = new Date(matchToEdit.date);
                            setMatchDate(date);
                            setMatchTime(format(date, 'HH:mm'));
                        }
                    }
                }

            } else {
                toast({ title: "Error", description: "Tournament not found.", variant: "destructive" });
                router.push('/tournaments');
            }
            setLoading(false);
        });
        return unsub;
    }, [tournamentId, router, toast, searchParams]);

    useEffect(() => {
        const unsubscribe = fetchTournamentAndListen();
        return () => unsubscribe && unsubscribe();
    }, [fetchTournamentAndListen]);

    const handleGroupSelect = (groupName: string) => {
        const group = tournament?.groups?.find(g => g.name === groupName) || null;
        setSelectedGroup(group);
        setSelectedTeams([]);
    };

    const handleTeamSelect = (teamName: string) => {
        if (isEditing) {
            toast({ title: "Cannot change teams while editing."});
            return;
        }
        setSelectedTeams(prev => {
            if (prev.includes(teamName)) {
                return prev.filter(t => t !== teamName);
            }
            if (prev.length < 2) {
                return [...prev, teamName];
            }
            toast({
                title: "Limit Reached",
                description: "You can only select two teams for a match.",
                variant: "destructive"
            });
            return prev;
        });
    };
    
    const handleScheduleMatch = async () => {
        if (selectedTeams.length !== 2) {
             toast({ title: "Selection Error", description: "Please select exactly two teams.", variant: "destructive" });
            return;
        }
        if (!matchDate) {
            toast({ title: "Date Missing", description: "Please select a date for the match.", variant: "destructive" });
            return;
        }
        if (!matchTime) {
            toast({ title: "Time Missing", description: "Please enter a time for the match.", variant: "destructive" });
            return;
        }

        const [hours, minutes] = matchTime.split(':').map(Number);
        const finalMatchDate = new Date(matchDate);
        finalMatchDate.setHours(hours, minutes);

        if (isEditing && editingMatchId) {
            // Update existing match
            const updatedMatches = tournament?.matches?.map(m => {
                if (m.id === editingMatchId) {
                    return { ...m, date: finalMatchDate.toISOString() };
                }
                return m;
            });
            try {
                const tournamentRef = doc(db, "tournaments", tournamentId);
                await updateDoc(tournamentRef, { matches: updatedMatches });
                toast({ title: "Match Rescheduled!", description: "The match date and time have been updated." });
                router.push(`/tournaments/${tournamentId}`);
            } catch (e) {
                console.error("Error rescheduling match: ", e);
                toast({ title: "Error", description: "Could not reschedule the match.", variant: 'destructive' });
            }
        } else {
            // Add new match
            const newMatch: TournamentMatch = {
                id: `match-${selectedTeams[0].replace(/\s/g, '')}-vs-${selectedTeams[1].replace(/\s/g, '')}-${Date.now()}`,
                groupName: selectedGroup!.name,
                team1: selectedTeams[0],
                team2: selectedTeams[1],
                status: 'Upcoming',
                date: finalMatchDate.toISOString(),
                venue: tournament?.location || 'TBD',
            };
            
            try {
                const tournamentRef = doc(db, "tournaments", tournamentId);
                await updateDoc(tournamentRef, {
                    matches: arrayUnion(newMatch)
                });
                toast({ title: "Match Scheduled!", description: "The new match has been added to the tournament." });
                router.push(`/tournaments/${tournamentId}`);
            } catch (e) {
                console.error("Error scheduling match: ", e);
                toast({ title: "Error", description: "Could not schedule the match.", variant: 'destructive' });
            }
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 text-foreground font-body">
            <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
                <div className='flex flex-col items-center text-center'>
                    <h1 className="text-2xl font-bold">{isEditing ? 'Reschedule Match' : 'Add New Match'}</h1>
                    <p className="text-sm text-muted-foreground">{tournament?.name}</p>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="p-4 md:p-8 flex justify-center">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>{isEditing ? 'Update Date and Time' : 'Schedule a New Match'}</CardTitle>
                        <CardDescription>{isEditing ? 'Change the scheduled date and time for this match.' : 'Choose a group, select two teams, and set the date and time.'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Select Group</Label>
                            <Select onValueChange={handleGroupSelect} value={selectedGroup?.name} disabled={!tournament?.groups || tournament.groups.length === 0 || isEditing}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a group" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tournament?.groups?.map(g => (
                                        <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {!tournament?.groups || tournament.groups.length === 0 && (
                                <p className="text-xs text-destructive">No groups found. Please create groups in the tournament dashboard first.</p>
                            )}
                        </div>

                        {selectedGroup && (
                            <div className="space-y-4">
                                <h4 className="font-semibold">Select Teams from {selectedGroup.name}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedGroup.teams.map(teamName => (
                                        <div key={teamName} className="flex items-center space-x-2 p-3 rounded-md border bg-secondary/30">
                                            <Checkbox
                                                id={teamName}
                                                checked={selectedTeams.includes(teamName)}
                                                onCheckedChange={() => handleTeamSelect(teamName)}
                                                disabled={isEditing}
                                            />
                                            <label htmlFor={teamName} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                {teamName}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !matchDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {matchDate ? format(matchDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={matchDate} onSelect={setMatchDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor='time'>Time</Label>
                                <Input id="time" type="time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} />
                            </div>
                        </div>
                        
                        <Button onClick={handleScheduleMatch} disabled={selectedTeams.length !== 2 || !matchDate || !matchTime} className="w-full">
                           {isEditing ? 'Save Changes' : 'Schedule Match'}
                        </Button>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
