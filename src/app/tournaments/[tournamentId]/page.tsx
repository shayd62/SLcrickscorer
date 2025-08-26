
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, Plus, ListOrdered, BarChart2, ShieldCheck, Trash2, Settings, Gamepad2 } from 'lucide-react';
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
    <div className="grid md:grid-cols-2 gap-8 mt-6 border-t pt-6">
      <div>
        <Card>
          <CardHeader><CardTitle>Create Groups</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g., Group A" />
            <Button onClick={handleAddGroup}><Plus className="mr-2 h-4 w-4" /> Add</Button>
          </CardContent>
        </Card>
        {unassignedTeams.length > 0 && (
          <Card className="mt-8">
            <CardHeader><CardTitle>Unassigned Teams</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">{unassignedTeams.map(team => <li key={team} className="p-2 bg-secondary rounded-md">{team}</li>)}</ul>
            </CardContent>
          </Card>
        )}
      </div>
      <div className="space-y-8">
        {(tournament.groups || []).map(group => (
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
              <div className="grid grid-cols-2 gap-2">
                {tournament.participatingTeams.map(teamName => (
                  <div key={teamName} className="flex items-center space-x-2">
                    <Checkbox id={`${group.name}-${teamName}`} checked={group.teams.includes(teamName)} onCheckedChange={(checked) => handleTeamSelection(group.name, teamName, !!checked)} disabled={!group.teams.includes(teamName) && assignedTeams.includes(teamName)} />
                    <label htmlFor={`${group.name}-${teamName}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{teamName}</label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FixtureGeneration({ tournament, onUpdate }: { tournament: Tournament, onUpdate: (data: Partial<Tournament>) => Promise<void> }) {
  const { toast } = useToast();

  const generateFixtures = () => {
    if (!tournament.groups || tournament.groups.length === 0) {
      toast({ title: 'No Groups Found', description: 'Please create groups and assign teams before generating fixtures.', variant: 'destructive'});
      return;
    }

    let allNewMatches: TournamentMatch[] = [];
    tournament.groups.forEach(group => {
      const teams = group.teams;
      if (teams.length < 2) return;

      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          allNewMatches.push({
            id: `match-${group.name.replace(/\s/g, '-')}-${teams[i].replace(/\s/g, '-')}-vs-${teams[j].replace(/\s/g, '-')}-${Date.now()}`,
            groupName: group.name,
            team1: teams[i],
            team2: teams[j],
            status: 'Upcoming',
          });
        }
      }
    });

    onUpdate({ matches: allNewMatches });
    toast({ title: 'Fixtures Generated!', description: 'All matches for all groups have been created.'});
  };

  return (
    <div className="mt-6 border-t pt-6">
      <Card>
        <CardHeader><CardTitle>Generate Fixtures</CardTitle><CardDescription>Automatically create matches for all teams in their respective groups.</CardDescription></CardHeader>
        <CardContent>
          <Button onClick={generateFixtures} className="w-full"><Gamepad2 className="mr-2 h-4 w-4" /> Generate All Fixtures</Button>
        </CardContent>
      </Card>
    </div>
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

    const handleUpdateTournament = async (data: Partial<Tournament>) => {
      try {
        const tournamentRef = doc(db, "tournaments", tournamentId);
        await updateDoc(tournamentRef, data);
      } catch (e) {
        console.error("Error updating tournament: ", e);
        toast({ title: "Error", description: "Could not update tournament details.", variant: 'destructive' });
      }
    };
    
    const calculatePointsForGroup = useCallback((groupName: string): TournamentPoints[] => {
      if (!tournament || !tournament.groups || !tournament.matches) return [];
      
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
            if (winner && pointsData[winner]) { pointsData[winner].wins++; pointsData[winner].points += tournament.pointsPolicy?.win || 2; }
            if (loser && pointsData[loser]) { pointsData[loser].losses++; pointsData[loser].points += tournament.pointsPolicy?.loss || 0; }
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

            <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                <Tabs defaultValue="teams" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="teams"><Users className="mr-2 h-4 w-4"/>Teams & Groups</TabsTrigger>
                        <TabsTrigger value="matches"><ShieldCheck className="mr-2 h-4 w-4"/>Matches</TabsTrigger>
                        <TabsTrigger value="leaderboard"><BarChart2 className="mr-2 h-4 w-4"/>Leaderboard</TabsTrigger>
                        <TabsTrigger value="points"><ListOrdered className="mr-2 h-4 w-4"/>Points Table</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="teams" className="mt-6">
                      <div className="grid md:grid-cols-2 gap-8">
                          <Card>
                              <CardHeader><CardTitle className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Users className="h-6 w-6 text-primary"/><span>Participating Teams ({tournament.participatingTeams?.length || 0})</span></div></CardTitle></CardHeader>
                              <CardContent>
                                {tournament.participatingTeams?.length > 0 ? (
                                  <ul className="space-y-2">
                                    {tournament.participatingTeams.map(teamName => (
                                      <li key={teamName} className="flex items-center justify-between p-2 bg-secondary rounded-md">
                                        <span>{teamName}</span>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Remove Team?</AlertDialogTitle><AlertDialogDescription>This will remove "{teamName}" from the tournament. Are you sure?</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => await updateDoc(doc(db, "tournaments", tournament.id), { participatingTeams: arrayRemove(teamName) })}>Remove</AlertDialogAction></AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </li>
                                    ))}
                                  </ul>
                                ) : <p className="text-sm text-muted-foreground text-center py-4">No teams have joined yet.</p>}
                              </CardContent>
                          </Card>
                          <JoinTournamentCard tournament={tournament} onTeamAdded={() => {}}/>
                      </div>
                      {tournament.tournamentFormat === 'Round Robin' && <GroupManagement tournament={tournament} onUpdate={handleUpdateTournament} />}
                    </TabsContent>
                    
                    <TabsContent value="matches" className="mt-6">
                      {tournament.tournamentFormat === 'Round Robin' && <FixtureGeneration tournament={tournament} onUpdate={handleUpdateTournament} />}
                      <Accordion type="multiple" defaultValue={groupNames} className="w-full mt-6">
                          {(tournament.groups || []).map(group => (
                              <AccordionItem value={group.name} key={group.name}>
                                  <AccordionTrigger className="text-xl font-bold">{group.name}</AccordionTrigger>
                                  <AccordionContent>
                                      <div className="space-y-2">
                                          {(tournament.matches || []).filter(m => m.groupName === group.name).length === 0 ? (
                                              <p className="text-muted-foreground text-center py-4">No fixtures generated for this group.</p>
                                          ) : (
                                              (tournament.matches || []).filter(m => m.groupName === group.name).map(match => (
                                                  <div key={match.id} className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                                                      <div className="font-semibold">{match.team1} vs {match.team2}</div>
                                                      <div className="flex items-center gap-2">
                                                          <span className="text-sm px-2 py-1 bg-background rounded-full">{match.status}</span>
                                                          <Button size="sm" variant="outline">Score Match</Button>
                                                      </div>
                                                  </div>
                                              ))
                                          )}
                                      </div>
                                  </AccordionContent>
                              </AccordionItem>
                          ))}
                          {(tournament.groups || []).length === 0 && <p className="text-muted-foreground text-center py-8">No groups created yet. Go to the "Teams & Groups" tab to get started.</p>}
                      </Accordion>
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
                         <Card><CardHeader><CardTitle>Points Table</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-4">No groups available. Create groups and generate matches to see the points table.</p></CardContent></Card>
                       )}
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

export default TournamentDetailsPage;
