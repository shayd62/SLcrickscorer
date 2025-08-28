
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Users, Calendar, MapPin, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tournament, Team } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import withAuth from '@/components/with-auth';
import Link from 'next/link';

function TournamentInvitePage() {
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [userTeams, setUserTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const tournamentId = params.tournamentId as string;

    const fetchTournament = useCallback(() => {
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

    const fetchUserTeams = useCallback(async () => {
        if (!user) return;
        const q = query(collection(db, "teams"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const teamsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
        setUserTeams(teamsData);
    }, [user]);

    useEffect(() => {
        const unsubscribe = fetchTournament();
        return () => unsubscribe && unsubscribe();
    }, [fetchTournament]);

    useEffect(() => {
        if (user) {
            fetchUserTeams();
        }
    }, [user, fetchUserTeams]);

    const handleAddTeam = async () => {
        if (!selectedTeam) {
            toast({ title: "No team selected", variant: "destructive" });
            return;
        }
        if (tournament?.participatingTeams?.includes(selectedTeam)) {
            toast({ title: "Team Already Joined", description: "This team is already part of the tournament.", variant: "destructive"});
            return;
        }

        try {
            const tournamentRef = doc(db, "tournaments", tournamentId);
            await updateDoc(tournamentRef, {
                participatingTeams: arrayUnion(selectedTeam)
            });
            toast({ title: "Success!", description: `Your team "${selectedTeam}" has joined the tournament.` });
            setSelectedTeam('');
        } catch (e) {
            console.error("Error joining tournament: ", e);
            toast({ title: "Error", description: "Could not add your team to the tournament.", variant: 'destructive' });
        }
    };
    
    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading tournament...</div>
    }

    if (!tournament) {
        return <div className="flex items-center justify-center min-h-screen">Tournament not found.</div>
    }

    const availableUserTeams = userTeams.filter(team => !tournament.participatingTeams?.includes(team.name));

    return (
        <div className="min-h-screen bg-gray-100 text-foreground font-body">
            <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
                <Button variant="ghost" size="icon" onClick={() => router.push('/matches')}><ArrowLeft className="h-6 w-6" /></Button>
                <div className='flex flex-col items-center text-center'>
                    <h1 className="text-2xl font-bold truncate max-w-sm">{tournament.name}</h1>
                    <p className="text-sm text-muted-foreground">Tournament Invitation</p>
                </div>
                <div className="w-10"></div>
            </header>
            <main className="p-4 md:p-8 flex justify-center">
                <Card className="w-full max-w-lg shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <ShieldCheck className="h-6 w-6 text-primary"/>
                           You're Invited!
                        </CardTitle>
                        <CardDescription>
                            Join the "{tournament.name}" tournament. Select one of your saved teams to participate.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4 p-4 border rounded-lg bg-secondary/30">
                            <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-muted-foreground"/>
                                <div>
                                    <p className="font-semibold">Dates</p>
                                    <p className="text-sm text-muted-foreground">{new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground"/>
                                <div>
                                    <p className="font-semibold">Location</p>
                                    <p className="text-sm text-muted-foreground">{tournament.location || 'TBD'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Users className="h-5 w-5 text-muted-foreground"/>
                                <div>
                                    <p className="font-semibold">Teams Joined</p>
                                    <p className="text-sm text-muted-foreground">{tournament.participatingTeams?.length || 0} / {tournament.numberOfTeams || 'unlimited'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Select Your Team</Label>
                             {availableUserTeams.length > 0 ? (
                                <div className="flex items-center gap-2">
                                    <Select onValueChange={setSelectedTeam} value={selectedTeam}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose one of your teams" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableUserTeams.map(team => (
                                                <SelectItem key={team.id} value={team.name}>{team.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleAddTeam} disabled={!selectedTeam}>Join Tournament</Button>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                                    All your saved teams have already joined, or you have no teams.
                                </p>
                            )}
                        </div>

                        <Link href="/teams/create" className="w-full">
                            <Button variant="outline" className="w-full">
                                <Plus className="mr-2 h-4 w-4"/>
                                Create a New Team
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

export default withAuth(TournamentInvitePage);
