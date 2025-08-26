
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, Plus, ListOrdered, BarChart2, ShieldCheck, Trash2, Settings, Gamepad2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tournament, Team, TournamentPoints, TournamentGroup, TournamentMatch } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, onSnapshot, collection, query, where, getDocs, arrayRemove } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

function GroupManagement({ tournament, onUpdate }: { tournament: Tournament, onUpdate: (data: Partial<Tournament>) => Promise<void> }) {
  const [newGroupName, setNewGroupName] = useState('');
  const { toast } = useToast();

  const handleAddGroup = () => {
    if (!newGroupName.trim()) {
      toast({ title: 'Group name cannot be empty', variant: 'destructive' });
      return;
    }
    const updatedGroups = [...(tournament.groups || []), { name: newGroupName, teams: [] }];
    onUpdate({ groups: updatedGroups });
    setNewGroupName('');
  };

  const handleRemoveGroup = (groupNameToRemove: string) => {
    const updatedGroups = (tournament.groups || []).filter(g => g.name !== groupNameToRemove);
    const updatedMatches = (tournament.matches || []).filter(m => m.groupName !== groupNameToRemove);
    onUpdate({ groups: updatedGroups, matches: updatedMatches });
  };
  
  const handleTeamSelection = (groupName: string, teamName: string, checked: boolean) => {
    const updatedGroups = (tournament.groups || []).map(group => {
      if (group.name === groupName) {
        const teams = checked ? [...group.teams, teamName] : group.teams.filter(t => t !== teamName);
        return { ...group, teams };
      }
      return group;
    });
    onUpdate({ groups: updatedGroups });
  };
  
  const assignedTeams = useMemo(() => (tournament.groups || []).flatMap(g => g.teams), [tournament.groups]);
  const unassignedTeams = useMemo(() => (tournament.participatingTeams || []).filter(t => !assignedTeams.includes(t)), [tournament.participatingTeams, assignedTeams]);
  
  return (
    <div className="space-y-6 border-t pt-6 mt-6">
       <Card>
          <CardHeader>
            <CardTitle>Create & Manage Groups</CardTitle>
          </CardHeader>
           <CardContent className="flex gap-2">
            <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g., Group A" />
            <Button onClick={handleAddGroup}><Plus className="mr-2 h-4 w-4" /> Add Group</Button>
          </CardContent>
        </Card>
      <div className="grid md:grid-cols-2 gap-8">
        {(tournament.groups || []).length > 0 ? (tournament.groups || []).map(group => (
          <Card key={group.name}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{group.name}</CardTitle>
              <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-5 w-5 text-destructive" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete Group {group.name} and all its fixtures. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveGroup(group.name)}>Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
            </CardHeader>
            <CardContent>
              <h4 className="font-semibold mb-2">Assign Teams</h4>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {tournament.participatingTeams.map(teamName => (
                  <div key={teamName} className="flex items-center space-x-2">
                    <Checkbox id={`${group.name}-${teamName}`} checked={group.teams.includes(teamName)} onCheckedChange={(checked) => handleTeamSelection(group.name, teamName, !!checked)} disabled={!group.teams.includes(teamName) && assignedTeams.includes(teamName)} />
                    <label htmlFor={`${group.name}-${teamName}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{teamName}</label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )) : <p className="text-muted-foreground text-center md:col-span-2">No groups created yet. Add a group to start assigning teams.</p>}
      </div>
       {unassignedTeams.length > 0 && (
          <Card className="mt-8">
            <CardHeader><CardTitle>Unassigned Teams</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">{unassignedTeams.map(team => <li key={team} className="p-2 bg-secondary rounded-md">{team}</li>)}</ul>
            </CardContent>
          </Card>
        )}
    </div>
  );
}


function PointsTable({ teams, title = "Points Table" }: { teams: TournamentPoints[], title?: string }) {
    const sortedTeams = [...teams].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.netRunRate - a.netRunRate;
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {sortedTeams.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Team</TableHead>
                                <TableHead className="text-center">P</TableHead>
                                <TableHead className="text-center">W</TableHead>
                                <TableHead className="text-center">L</TableHead>
                                <TableHead className="text-center">D</TableHead>
                                <TableHead className="text-center">Pts</TableHead>
                                <TableHead className="text-right">NRR</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedTeams.map((team) => (
                                <TableRow key={team.teamName}>
                                    <TableCell className="font-medium">{team.teamName}</TableCell>
                                    <TableCell className="text-center">{team.matchesPlayed}</TableCell>
                                    <TableCell className="text-center">{team.wins}</TableCell>
                                    <TableCell className="text-center">{team.losses}</TableCell>
                                    <TableCell className="text-center">{team.draws}</TableCell>
                                    <TableCell className="text-center font-bold">{team.points}</TableCell>
                                    <TableCell className="text-right">{team.netRunRate.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-muted-foreground text-center py-4">No data available to display points.</p>
                )}
            </CardContent>
        </Card>
    );
}

function ParticipatingTeamsCard({ tournament, onUpdate }: { tournament: Tournament, onUpdate: (data: Partial<Tournament>) => Promise<void> }) {
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
            await onUpdate({ participatingTeams: arrayUnion(selectedTeam) });
            toast({ title: "Team Added!", description: `"${selectedTeam}" has joined the tournament.` });
            setSelectedTeam('');
            // The onSnapshot listener will handle the UI update.
        } catch (e) {
            console.error("Error joining tournament: ", e);
            toast({ title: "Error", description: "Could not add team to the tournament.", variant: 'destructive' });
        }
    };

    const handleRemoveTeam = async (teamName: string) => {
        await onUpdate({ participatingTeams: arrayRemove(teamName) });
        // Also remove from any groups
        const updatedGroups = (tournament.groups || []).map(g => ({
            ...g,
            teams: g.teams.filter(t => t !== teamName)
        }));
        await onUpdate({ groups: updatedGroups });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><Users className="h-6 w-6 text-primary"/><span>Participating Teams ({tournament.participatingTeams?.length || 0})</span></div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {tournament.participatingTeams?.length > 0 ? (
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                        {tournament.participatingTeams.map(teamName => (
                            <li key={teamName} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                                <span>{teamName}</span>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Remove Team?</AlertDialogTitle><AlertDialogDescription>This will remove "{teamName}" from the tournament and any groups it's in. Are you sure?</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveTeam(teamName)}>Remove</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-sm text-muted-foreground text-center py-4">No teams have joined yet.</p>}

                <div className="mt-4 space-y-2 border-t pt-4">
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
                            <Plus className="mr-2 h-4 w-4" /> Add Saved Team
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
                </div>
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

    const liveMatches = useMemo(() => (tournament?.matches || []).filter(m => m.status === 'Live'), [tournament?.matches]);
    const upcomingMatches = useMemo(() => (tournament?.matches || []).filter(m => m.status === 'Upcoming'), [tournament?.matches]);
    const pastMatches = useMemo(() => (tournament?.matches || []).filter(m => m.status === 'Completed'), [tournament?.matches]);


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

    const handleUpdateTournament = async (data: Partial<Tournament>) => {
      try {
        const tournamentRef = doc(db, "tournaments", tournamentId);
        await updateDoc(tournamentRef, data);
      } catch (e) {
        console.error("Error updating tournament: ", e);
        toast({ title: "Error", description: "Could not update tournament details.", variant: 'destructive' });
      }
    };
    
    const handleDeleteMatch = async (matchId: string) => {
        if (!tournament || !tournament.matches) return;
        const matchToRemove = tournament.matches.find(m => m.id === matchId);
        if (matchToRemove) {
            try {
                const tournamentRef = doc(db, "tournaments", tournamentId);
                await updateDoc(tournamentRef, {
                    matches: arrayRemove(matchToRemove)
                });
                toast({ title: "Match Deleted", description: "The match has been removed from the schedule." });
            } catch (e) {
                console.error("Error deleting match: ", e);
                toast({ title: "Error", description: "Could not delete the match.", variant: 'destructive' });
            }
        }
    };
    
    const calculatePointsForGroup = useCallback((groupName: string): TournamentPoints[] => {
      if (!tournament || !tournament.groups || !tournament.matches || !tournament.pointsPolicy) return [];
      
      const group = tournament.groups.find(g => g.name === groupName);
      if (!group) return [];

      const pointsData: { [teamName: string]: TournamentPoints } = {};
      
      group.teams.forEach(teamName => {
        pointsData[teamName] = { teamName, matchesPlayed: 0, wins: 0, losses: 0, draws: 0, points: 0, netRunRate: 0.00 };
      });

      tournament.matches.filter(m => m.groupName === groupName).forEach(match => {
        if (match.status === 'Completed' && match.result) {
          const { winner, loser, method } = match.result;

          if (pointsData[match.team1]) pointsData[match.team1].matchesPlayed++;
          if (pointsData[match.team2]) pointsData[match.team2].matchesPlayed++;
          
          if (method.toLowerCase().includes('draw') || method.toLowerCase().includes('tie')) {
            if (pointsData[match.team1]) { pointsData[match.team1].draws++; pointsData[match.team1].points += tournament.pointsPolicy?.draw || 1; }
            if (pointsData[match.team2]) { pointsData[match.team2].draws++; pointsData[match.team2].points += tournament.pointsPolicy?.draw || 1; }
          } else {
            if (winner && pointsData[winner]) { pointsData[winner].wins++; pointsData[winner].points += tournament.pointsPolicy.win; }
            if (loser && pointsData[loser]) { pointsData[loser].losses++; pointsData[loser].points += tournament.pointsPolicy.loss; }
          }
        }
      });

      return Object.values(pointsData);
    }, [tournament]);

    if (loading) return <div className="flex items-center justify-center min-h-screen">Loading tournament...</div>;
    if (!tournament) return <div className="flex items-center justify-center min-h-screen">Tournament not found.</div>;

    const groupNames = tournament.groups?.map(g => g.name) || [];

    return (
        <div className="min-h-screen bg-gray-50 text-foreground font-body">
            <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
                <Button variant="ghost" size="icon" onClick={() => router.push('/tournaments')}><ArrowLeft className="h-6 w-6" /></Button>
                <div className='flex flex-col items-center text-center'><h1 className="text-2xl font-bold truncate max-w-sm">{tournament.name}</h1><p className="text-sm text-muted-foreground">Tournament Dashboard</p></div>
                <Button variant="ghost" size="icon" onClick={() => router.push(`/tournaments/edit/${tournament.id}`)}><Settings className="h-6 w-6" /></Button>
            </header>

            <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 relative">
                <Tabs defaultValue="teams" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="teams"><Users className="mr-2 h-4 w-4"/>Teams & Groups</TabsTrigger>
                        <TabsTrigger value="matches"><ShieldCheck className="mr-2 h-4 w-4"/>Matches</TabsTrigger>
                        <TabsTrigger value="leaderboard"><BarChart2 className="mr-2 h-4 w-4"/>Leaderboard</TabsTrigger>
                        <TabsTrigger value="points"><ListOrdered className="mr-2 h-4 w-4"/>Points Table</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="teams" className="mt-6">
                      <div className="grid md:grid-cols-2 gap-8">
                          <ParticipatingTeamsCard tournament={tournament} onUpdate={handleUpdateTournament} />
                          {tournament.tournamentFormat === 'Round Robin' ? (
                            <GroupManagement tournament={tournament} onUpdate={handleUpdateTournament} />
                          ) : (
                             <Card>
                                <CardHeader><CardTitle>Group Management</CardTitle></CardHeader>
                                <CardContent><p className="text-muted-foreground text-center py-4">Group management is only available for Round Robin tournaments.</p></CardContent>
                             </Card>
                          )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="matches" className="mt-6">
                      <Tabs defaultValue="upcoming" className="w-full">
                        <TabsList>
                            <TabsTrigger value="live">Live</TabsTrigger>
                            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                            <TabsTrigger value="past">Past</TabsTrigger>
                        </TabsList>
                        <TabsContent value="live" className="mt-4">
                            {liveMatches.length > 0 ? liveMatches.map(match => <div key={match.id}>{match.team1} vs {match.team2}</div>) : <p className="text-muted-foreground text-center py-8">No live matches right now.</p>}
                        </TabsContent>
                         <TabsContent value="upcoming" className="mt-4">
                            {upcomingMatches.length > 0 ? upcomingMatches.map(match => (
                                <Card key={match.id} className="mb-4">
                                    <CardContent className="p-4 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold">{match.team1} vs {match.team2}</p>
                                            <p className="text-sm text-muted-foreground">{new Date(match.date!).toLocaleString()} at {match.venue}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button>Start Match</Button>
                                            <Link href={`/tournaments/${tournamentId}/game-details?group=${match.groupName}&team1=${match.team1}&team2=${match.team2}&edit=true&matchId=${match.id}`}>
                                                <Button variant="outline" size="icon"><Pencil className="h-4 w-4"/></Button>
                                            </Link>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Match?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                          This will permanently delete the match between {match.team1} and {match.team2}. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteMatch(match.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </CardContent>
                                </Card>
                            )) : <p className="text-muted-foreground text-center py-8">No upcoming matches scheduled.</p>}
                        </TabsContent>
                         <TabsContent value="past" className="mt-4">
                            {pastMatches.length > 0 ? pastMatches.map(match => <div key={match.id}>{match.team1} vs {match.team2}</div>) : <p className="text-muted-foreground text-center py-8">No past matches found.</p>}
                        </TabsContent>
                      </Tabs>
                    </TabsContent>

                    <TabsContent value="leaderboard" className="mt-6">
                        <Card><CardHeader><CardTitle>Leaderboard</CardTitle><CardDescription>Top performers in the tournament.</CardDescription></CardHeader><CardContent className="text-center py-12 text-muted-foreground"><p>Leaderboard functionality coming soon.</p></CardContent></Card>
                    </TabsContent>

                    <TabsContent value="points" className="mt-6 space-y-6">
                       {tournament.groups && tournament.groups.length > 0 ? (
                         tournament.groups.map(group => (
                           <PointsTable key={group.name} teams={calculatePointsForGroup(group.name)} title={`Points Table - ${group.name}`} />
                         ))
                       ) : (
                         <Card><CardHeader><CardTitle>Points Table</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-4">No groups available. Create groups and play matches to see the points table.</p></CardContent></Card>
                       )}
                    </TabsContent>
                </Tabs>
                <Link href={`/tournaments/${tournamentId}/add-match`} passHref>
                    <Button className="fixed bottom-8 right-8 rounded-full h-16 w-16 shadow-lg">
                        <Plus className="h-8 w-8" />
                    </Button>
                </Link>
            </main>
        </div>
    );
}

export default TournamentDetailsPage;

    