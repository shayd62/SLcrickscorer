
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tournament, TournamentGroup } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function AddMatchPage() {
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<TournamentGroup | null>(null);
    const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const tournamentId = params.tournamentId as string;

    const fetchTournamentAndListen = useCallback(() => {
        if (!tournamentId) return;
        const unsub = onSnapshot(doc(db, "tournaments", tournamentId), (doc) => {
            if (doc.exists()) {
                setTournament({ ...doc.data() as Tournament, id: doc.id });
            } else {
                toast({ title: "Error", description: "Tournament not found.", variant: "destructive" });
                router.push('/tournaments');
            }
            setLoading(false);
        });
        return unsub;
    }, [tournamentId, router, toast]);

    useEffect(() => {
        const unsubscribe = fetchTournamentAndListen();
        return () => unsubscribe && unsubscribe();
    }, [fetchTournamentAndListen]);

    const handleGroupSelect = (groupName: string) => {
        const group = tournament?.groups?.find(g => g.name === groupName) || null;
        setSelectedGroup(group);
        setSelectedTeams([]); // Reset team selection when group changes
    };

    const handleTeamSelect = (teamName: string) => {
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
    
    const handleProceed = () => {
        if (selectedTeams.length !== 2) {
             toast({
                title: "Selection Error",
                description: "Please select exactly two teams to proceed.",
                variant: "destructive"
            });
            return;
        }
        const query = new URLSearchParams({
            group: selectedGroup!.name,
            team1: selectedTeams[0],
            team2: selectedTeams[1],
        }).toString();

        router.push(`/tournaments/${tournamentId}/game-details?${query}`);
    }

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 text-foreground font-body">
            <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
                <div className='flex flex-col items-center text-center'>
                    <h1 className="text-2xl font-bold">Add New Match</h1>
                    <p className="text-sm text-muted-foreground">{tournament?.name}</p>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="p-4 md:p-8 flex justify-center">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Step 1: Select Teams</CardTitle>
                        <CardDescription>Choose a group and then select the two teams that will play the match.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Group</label>
                            <Select onValueChange={handleGroupSelect} disabled={!tournament?.groups || tournament.groups.length === 0}>
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
                                            />
                                            <label htmlFor={teamName} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                {teamName}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <Button onClick={handleProceed} disabled={selectedTeams.length !== 2} className="w-full">
                            Next: Add Game Details
                        </Button>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
