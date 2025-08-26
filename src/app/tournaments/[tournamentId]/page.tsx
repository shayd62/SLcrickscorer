
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Shield, Users, Calendar, Trophy, Plus, ListChecks, MapPin, Sun, Circle, GitBranch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tournament, Team } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs, onSnapshot } from 'firebase/firestore';

function JoinTournamentCard({ tournament, onTeamAdded }: { tournament: Tournament, onTeamAdded: () => void }) {
    const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const { toast } = useToast();

    const fetchTeams = useCallback(async () => {
        const querySnapshot = await getDocs(collection(db, "teams"));
        const allTeams = querySnapshot.docs.map(doc => doc.data() as Team);
        const participating = tournament.participatingTeams || [];
        const notYetJoined = allTeams.filter(team => !participating.includes(team.name));
        setAvailableTeams(notYetJoined);
    }, [tournament]);

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    const handleJoin = async () => {
        if (!selectedTeam) {
            toast({ title: "No team selected", description: "Please select a team to add.", variant: 'destructive' });
            return;
        }

        try {
            const tournamentRef = doc(db, "tournaments", tournament.id);
            await updateDoc(tournamentRef, {
                participatingTeams: arrayUnion(selectedTeam)
            });
            toast({ title: "Team Added!", description: `"${selectedTeam}" has joined the tournament.` });
            setSelectedTeam('');
            onTeamAdded(); // Callback to refresh parent state
        } catch (e) {
            console.error("Error joining tournament: ", e);
            toast({ title: "Error", description: "Could not add team to the tournament.", variant: 'destructive' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Join Tournament</CardTitle>
                <CardDescription>Add one of your saved teams to this tournament.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {availableTeams.length > 0 ? (
                    <>
                    <Select onValueChange={setSelectedTeam} value={selectedTeam}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a team to add" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableTeams.map(team => (
                                <SelectItem key={team.name} value={team.name}>{team.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleJoin} disabled={!selectedTeam} className="w-full">
                        <Plus className="mr-2 h-4 w-4" /> Add Team to Tournament
                    </Button>
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground text-center">All your saved teams have already joined this tournament.</p>
                )}
                 <Link href="/teams/create" className='block'>
                    <Button variant="outline" className='w-full'>
                        <Plus className="mr-2 h-4 w-4" /> Create a New Team
                    </Button>
                </Link>
            </CardContent>
        </Card>
    )
}

function TournamentDetailsPage() {
    const [tournament, setTournament] = useState<Tournament | null>(null);
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


    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading tournament...</div>;
    }

    if (!tournament) {
        return <div className="flex items-center justify-center min-h-screen">Tournament not found.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 text-foreground font-body">
            <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
                <Button variant="ghost" size="icon" onClick={() => router.push('/tournaments')}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div className='flex flex-col items-center text-center'>
                    <h1 className="text-2xl font-bold truncate max-w-sm">{tournament.name}</h1>
                    <p className="text-sm text-muted-foreground">Tournament Details</p>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Trophy className="text-primary h-6 w-6"/> Tournament Info</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                            <span>{tournament.oversPerInnings} overs per side</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <span>Dates: {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}</span>
                        </div>
                        {tournament.tournamentFormat && (
                            <div className="flex items-center gap-2">
                                <GitBranch className="h-5 w-5 text-muted-foreground" />
                                <span>Format: {tournament.tournamentFormat}</span>
                            </div>
                         )}
                         <div className="flex items-center gap-2">
                            <ListChecks className="h-5 w-5 text-muted-foreground" />
                            <span>Points: Win - {tournament.pointsPolicy?.win ?? 0}, Draw - {tournament.pointsPolicy?.draw ?? 0}, Loss - {tournament.pointsPolicy?.loss ?? 0}</span>
                        </div>
                         {tournament.prize && (
                            <div className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-muted-foreground" />
                                <span>Prize: {tournament.prize}</span>
                            </div>
                         )}
                         {tournament.venue && (
                            <div className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-muted-foreground" />
                                <span>Venue: {tournament.venue}</span>
                            </div>
                         )}
                         {tournament.ballType && (
                            <div className="flex items-center gap-2">
                                <Circle className="h-5 w-5 text-muted-foreground" />
                                <span>Ball: {tournament.ballType}</span>
                            </div>
                         )}
                         {tournament.pitchType && (
                            <div className="flex items-center gap-2">
                                <Sun className="h-5 w-5 text-muted-foreground" />
                                <span>Pitch: {tournament.pitchType}</span>
                            </div>
                         )}
                    </CardContent>
                </Card>
                
                <div className="grid md:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Users className="h-6 w-6 text-primary"/>
                                    <span>Participating Teams ({tournament.participatingTeams?.length || 0})</span>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                           {tournament.participatingTeams?.length > 0 ? (
                                <ul className="space-y-2">
                                    {tournament.participatingTeams.map(teamName => (
                                        <li key={teamName} className="p-2 bg-secondary rounded-md">{teamName}</li>
                                    ))}
                                </ul>
                           ) : (
                               <p className="text-sm text-muted-foreground text-center py-4">No teams have joined yet.</p>
                           )}
                        </CardContent>
                    </Card>

                    <JoinTournamentCard tournament={tournament} onTeamAdded={() => { /* Real-time listener handles this */ }}/>
                </div>
                
            </main>
        </div>
    );
}

export default TournamentDetailsPage;
