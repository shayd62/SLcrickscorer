
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, Plus, ListOrdered, BarChart2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tournament, Team, TournamentPoints } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function JoinTournamentCard({ tournament, onTeamAdded }: { tournament: Tournament, onTeamAdded: () => void }) {
    const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const { toast } = useToast();
    const { user } = useAuth();

    const fetchTeams = useCallback(async () => {
        if (!user) return;
        const q = query(collection(db, "teams"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const allTeams = querySnapshot.docs.map(doc => doc.data() as Team);
        const participating = tournament.participatingTeams || [];
        const notYetJoined = allTeams.filter(team => !participating.includes(team.name));
        setAvailableTeams(notYetJoined);
    }, [tournament, user]);

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

function PointsTable({ teams }: { teams: TournamentPoints[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Points Table</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Team</TableHead>
                            <TableHead className="text-center">Played</TableHead>
                            <TableHead className="text-center">Won</TableHead>
                            <TableHead className="text-center">Lost</TableHead>
                            <TableHead className="text-center">Points</TableHead>
                            <TableHead className="text-right">NRR</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {teams.map((team) => (
                            <TableRow key={team.teamName}>
                                <TableCell className="font-medium">{team.teamName}</TableCell>
                                <TableCell className="text-center">{team.matchesPlayed}</TableCell>
                                <TableCell className="text-center">{team.wins}</TableCell>
                                <TableCell className="text-center">{team.losses}</TableCell>
                                <TableCell className="text-center">{team.points}</TableCell>
                                <TableCell className="text-right">{team.netRunRate.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
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

    const pointsTableData: TournamentPoints[] = (tournament.participatingTeams || []).map(teamName => ({
        teamName,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        netRunRate: 0.00
    }));

    return (
        <div className="min-h-screen bg-gray-50 text-foreground font-body">
            <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
                <Button variant="ghost" size="icon" onClick={() => router.push('/tournaments')}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div className='flex flex-col items-center text-center'>
                    <h1 className="text-2xl font-bold truncate max-w-sm">{tournament.name}</h1>
                    <p className="text-sm text-muted-foreground">Tournament Dashboard</p>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                 <Tabs defaultValue="teams" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="teams"><Users className="mr-2 h-4 w-4"/>Teams</TabsTrigger>
                        <TabsTrigger value="matches"><ShieldCheck className="mr-2 h-4 w-4"/>Matches</TabsTrigger>
                        <TabsTrigger value="leaderboard"><BarChart2 className="mr-2 h-4 w-4"/>Leaderboard</TabsTrigger>
                        <TabsTrigger value="points"><ListOrdered className="mr-2 h-4 w-4"/>Points Table</TabsTrigger>
                    </TabsList>
                    <TabsContent value="teams" className="mt-6">
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
                    </TabsContent>
                    <TabsContent value="matches" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Matches</CardTitle>
                                <CardDescription>Live, upcoming, and past matches will be shown here.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-center py-12 text-muted-foreground">
                                <p>Match functionality coming soon.</p>
                                <Button className="mt-4"><Plus className="mr-2 h-4 w-4"/>Add Match</Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="leaderboard" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Leaderboard</CardTitle>
                                <CardDescription>Top performers in the tournament.</CardDescription>
                            </CardHeader>
                            <CardContent className="text-center py-12 text-muted-foreground">
                                <p>Leaderboard functionality coming soon.</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="points" className="mt-6">
                       <PointsTable teams={pointsTableData} />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

export default TournamentDetailsPage;
