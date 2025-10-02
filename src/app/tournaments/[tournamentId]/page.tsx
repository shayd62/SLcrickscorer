

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, Plus, ListOrdered, BarChart2, ShieldCheck, Trash2, Settings, Gamepad2, Pencil, Radio, Star, ShieldAlert, User, Award, ChevronRight, Search, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tournament, Team, TournamentPoints, TournamentGroup, TournamentMatch, MatchState, Batsman, Bowler, BatterLeaderboardStat, BowlerLeaderboardStat, Innings, FielderLeaderboardStat, Player, AllRounderLeaderboardStat, UserProfile } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, onSnapshot, collection, query, where, getDocs, arrayRemove } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PlayerSearchDialog } from '@/components/player-search-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const formatOvers = (balls: number, ballsPerOver: number = 6) => `${Math.floor(balls / ballsPerOver)}.${balls % ballsPerOver}`;


function LiveMatchCard({ match, tournamentId }: { match: TournamentMatch, tournamentId: string }) {
    const [liveData, setLiveData] = useState<MatchState | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (match.matchId) {
            const unsub = onSnapshot(doc(db, "matches", match.matchId), (doc) => {
                if (doc.exists()) {
                    setLiveData(doc.data() as MatchState);
                }
            });
            return () => unsub();
        }
    }, [match.matchId]);

    if (!liveData) return null;

    const currentInnings = liveData.currentInnings === 'innings1' ? liveData.innings1 : liveData.innings2;
    if (!currentInnings) return null;

    const battingTeamConfig = currentInnings.battingTeam === 'team1' ? liveData.config.team1 : liveData.config.team2;
    const battingTeamName = battingTeamConfig.name;

    const handleClick = () => {
      router.push(`/scorecard/${match.matchId}`);
    };

    return (
        <Card className="mb-4 cursor-pointer hover:bg-secondary/50" onClick={handleClick}>
            <CardContent className="p-4">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <p className="font-bold text-lg">{match.team1} vs {match.team2}</p>
                        <div className="flex items-center gap-2 text-sm text-green-500 font-semibold">
                            <Radio className="h-4 w-4 animate-pulse"/>
                            <span>LIVE</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-xl">{battingTeamName}: {currentInnings.score}/{currentInnings.wickets}</p>
                        <p className="text-sm text-muted-foreground">({formatOvers(currentInnings.balls, liveData.config.ballsPerOver)} ov)</p>
                        {liveData.target && <p className="text-xs text-destructive">Target: {liveData.target}</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function PastMatchCard({ match }: { match: TournamentMatch }) {
    const router = useRouter();

    if (!match.result) return null;

    const handleClick = () => {
        if (match.matchId) {
            router.push(`/scorecard/${match.matchId}`);
        }
    };

    return (
        <Card className="mb-4 cursor-pointer hover:bg-secondary/50" onClick={handleClick}>
            <CardContent className="p-4">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <p className="font-bold text-lg">{match.team1} vs {match.team2}</p>
                        <p className="text-sm text-green-600 font-semibold">{match.result.winner} won</p>
                        <p className="text-xs text-muted-foreground">{match.result.method}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
            </CardContent>
        </Card>
    );
}

function GroupManagement({ tournament, onUpdate, isOwner }: { tournament: Tournament, onUpdate: (data: Partial<Tournament>) => Promise<void>, isOwner: boolean }) {
  const [newGroupName, setNewGroupName] = useState('');
  const [tournamentType, setTournamentType] = useState<'round-robin' | 'knockout'>('round-robin');
  
  const [selectedRounds, setSelectedRounds] = useState<string[]>([]);
    useEffect(() => {
        if (tournament.tournamentStructure) {
            setSelectedRounds(tournament.tournamentStructure);
        }
    }, [tournament.tournamentStructure]);
  
  const { toast } = useToast();
  const router = useRouter();
  const tournamentId = tournament.id;

    const roundRobinOptions = [
        'League Matches',
        'Super 4',
        'Super 6',
        'Super 8',
        'Quarter Final',
        'Semi Final',
        'Final',
    ];
    const knockoutStages = ['Quarter Final', 'Semi Final', 'Final'];

    const handleRoundSelection = (round: string, checked: boolean) => {
        const newSelectedRounds = checked
            ? [...selectedRounds, round]
            : selectedRounds.filter(r => r !== round);
        
        setSelectedRounds(newSelectedRounds);
        onUpdate({ tournamentStructure: newSelectedRounds });

        if (knockoutStages.includes(round) && checked) {
            const existingGroups = tournament.groups || [];
            if (!existingGroups.some(g => g.name === round)) {
                const updatedGroups = [...existingGroups, { name: round, teams: [] }];
                onUpdate({ groups: updatedGroups });
            }
        } else if (knockoutStages.includes(round) && !checked) {
            const updatedGroups = (tournament.groups || []).filter(g => g.name !== round);
            onUpdate({ groups: updatedGroups });
        }
    };

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
  
  const handleGenerateFixtures = (groupName: string) => {
    router.push(`/tournaments/${tournamentId}/add-match?group=${encodeURIComponent(groupName)}`);
  };

  const isNextRound = tournament.qualifiedTeams && tournament.qualifiedTeams.length > 0;
  
  const leagueGroupAssignedTeams = useMemo(() => 
    (tournament.groups || [])
    .filter(g => !knockoutStages.includes(g.name))
    .flatMap(g => g.teams), 
  [tournament.groups]);

  const unassignedTeams = useMemo(() => (tournament.participatingTeams || []).filter(t => !leagueGroupAssignedTeams.includes(t)), [tournament.participatingTeams, leagueGroupAssignedTeams]);

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Tournament Structure</CardTitle>
                <CardDescription>Define the stages of your tournament.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label>Tournament Type</Label>
                    <Select value={tournamentType} onValueChange={(value: 'round-robin' | 'knockout') => setTournamentType(value)}>
                        <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="round-robin">Round Robin / League</SelectItem>
                            <SelectItem value="knockout">Knockout</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                 {tournamentType === 'round-robin' && (
                    <div className="space-y-2">
                         <Label>Rounds</Label>
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                             {roundRobinOptions.map(round => (
                                <div key={round} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={round} 
                                        checked={selectedRounds.includes(round)} 
                                        onCheckedChange={(checked) => handleRoundSelection(round, !!checked)}
                                    />
                                    <label htmlFor={round} className="text-sm font-medium leading-none">{round}</label>
                                </div>
                            ))}
                         </div>
                    </div>
                 )}
                
                 {isOwner && selectedRounds.includes('League Matches') && (
                    <div className="flex gap-2 pt-4 border-t">
                        <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="e.g., Group A" />
                        <Button onClick={handleAddGroup}><Plus className="mr-2 h-4 w-4" /> Add Group</Button>
                    </div>
                 )}
            </CardContent>
        </Card>
      <div className="grid md:grid-cols-2 gap-8">
        {(tournament.groups || []).length > 0 ? (tournament.groups || []).map(group => {
            const isKnockoutGroup = knockoutStages.includes(group.name);

            const getAvailableTeams = () => {
                if (group.name === 'Final') {
                    // This logic might need refinement based on how winners are determined.
                    // For now, let's assume it pulls from a list of qualified teams.
                    return tournament.qualifiedTeams; 
                }
                if (group.name === 'Semi Final' || group.name === 'Quarter Final') {
                    return tournament.qualifiedTeams;
                }
                return tournament.participatingTeams;
            };

            const availableTeamsForAssignment = getAvailableTeams();
            const assignedTeamsForGroup = isKnockoutGroup ? [] : leagueGroupAssignedTeams;

            return (
              <Card key={group.name}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{group.name}</CardTitle>
                  {isOwner && !knockoutStages.includes(group.name) && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-5 w-5 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete Group {group.name} and all its fixtures. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveGroup(group.name)}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardHeader>
                <CardContent>
                  <h4 className="font-semibold mb-2">Assign Teams</h4>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {(availableTeamsForAssignment || []).map(teamName => (
                      <div key={teamName} className="flex items-center space-x-2">
                        <Checkbox id={`${group.name}-${teamName}`} checked={group.teams.includes(teamName)} onCheckedChange={(checked) => isOwner && handleTeamSelection(group.name, teamName, !!checked)} disabled={!isKnockoutGroup && !group.teams.includes(teamName) && assignedTeamsForGroup.includes(teamName)} />
                        <label htmlFor={`${group.name}-${teamName}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{teamName}</label>
                      </div>
                    ))}
                    {(group.name === 'Final' || group.name === 'Semi Final' || group.name === 'Quarter Final') && (!tournament.qualifiedTeams || tournament.qualifiedTeams.length === 0) && <p className="col-span-2 text-xs text-muted-foreground">Waiting for previous stage results.</p>}
                  </div>
                   {isOwner && (
                      <Button variant="outline" className="w-full mt-4" onClick={() => handleGenerateFixtures(group.name)} disabled={group.teams.length < 2}>
                        Generate Fixtures
                      </Button>
                    )}
                </CardContent>
              </Card>
            )
        }) : <p className="text-muted-foreground text-center md:col-span-2">No groups created yet. {isOwner && "Add a group to start assigning teams."}</p>}
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


function PointsTable({ teams, title = "Points Table", onUpdate, isOwner, qualifiedTeams, isKnockout, tournamentMatches, groupName }: { teams: TournamentPoints[], title?: string, onUpdate?: (data: Partial<Tournament>) => Promise<void>, isOwner?: boolean, qualifiedTeams?: string[], isKnockout?: boolean, tournamentMatches?: TournamentMatch[], groupName: string }) {
    const [selectedTeams, setSelectedTeams] = useState<string[]>(qualifiedTeams || []);

    useEffect(() => {
        setSelectedTeams(qualifiedTeams || []);
    }, [qualifiedTeams]);

    const sortedTeams = [...teams].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.netRunRate - a.netRunRate;
    });

    const handleTeamSelect = (teamName: string, checked: boolean) => {
        setSelectedTeams(prev => {
            if (checked) {
                return [...prev, teamName];
            } else {
                return prev.filter(t => t !== teamName);
            }
        });
    };
    
    const handleQualify = () => {
        if (onUpdate) {
            onUpdate({ qualifiedTeams: selectedTeams });
        }
    }
    
    const getKnockoutResult = (teamName: string) => {
        if (!tournamentMatches) return 'Pending';
        const match = tournamentMatches.find(m => m.groupName === groupName && (m.team1 === teamName || m.team2 === teamName));
        if (!match) return 'Pending';
        if (match.status === 'Live') return 'Live';
        if (match.status === 'Upcoming') return 'Upcoming';
        if (match.status === 'Completed' && match.result) {
            return match.result.winner === teamName ? 'Win' : 'Loss';
        }
        return 'Pending';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {sortedTeams.length > 0 ? (
                    <>
                    <Table>
                        <TableHeader>
                           {isKnockout ? (
                                <TableRow>
                                    <TableHead>Team</TableHead>
                                    <TableHead className="text-right">Result</TableHead>
                                </TableRow>
                           ) : (
                                <TableRow>
                                    {isOwner && <TableHead />}
                                    <TableHead>Team</TableHead>
                                    <TableHead className="text-center">P</TableHead>
                                    <TableHead className="text-center">W</TableHead>
                                    <TableHead className="text-center">L</TableHead>
                                    <TableHead className="text-center">D</TableHead>
                                    <TableHead className="text-center">Pts</TableHead>
                                    <TableHead className="text-right">NRR</TableHead>
                                </TableRow>
                           )}
                        </TableHeader>
                        <TableBody>
                            {sortedTeams.map((team) => (
                                isKnockout ? (
                                    <TableRow key={team.teamName}>
                                        <TableCell className="font-medium">{team.teamName}</TableCell>
                                        <TableCell className={cn("text-right font-semibold", getKnockoutResult(team.teamName) === 'Win' && 'text-green-500', getKnockoutResult(team.teamName) === 'Loss' && 'text-red-500')}>{getKnockoutResult(team.teamName)}</TableCell>
                                    </TableRow>
                                ) : (
                                <TableRow key={team.teamName}>
                                    {isOwner && <TableCell><Checkbox checked={selectedTeams.includes(team.teamName)} onCheckedChange={(checked) => handleTeamSelect(team.teamName, !!checked)} /></TableCell>}
                                    <TableCell className="font-medium">{team.teamName} {qualifiedTeams?.includes(team.teamName) && <span className="text-green-500 font-bold ml-2">Q</span>}</TableCell>
                                    <TableCell className="text-center">{team.matchesPlayed}</TableCell>
                                    <TableCell className="text-center">{team.wins}</TableCell>
                                    <TableCell className="text-center">{team.losses}</TableCell>
                                    <TableCell className="text-center">{team.draws}</TableCell>
                                    <TableCell className="text-center font-bold">{team.points}</TableCell>
                                    <TableCell className="text-right">{team.netRunRate.toFixed(2)}</TableCell>
                                </TableRow>
                                )
                            ))}
                        </TableBody>
                    </Table>
                    {isOwner && !isKnockout && (
                        <div className="flex justify-end mt-4">
                            <Button onClick={handleQualify} disabled={selectedTeams.length === 0}>Qualify Selected Teams</Button>
                        </div>
                    )}
                    </>
                ) : (
                    <p className="text-muted-foreground text-center py-4">No data available to display points.</p>
                )}
            </CardContent>
        </Card>
    );
}

function ParticipatingTeamsCard({ tournament, onUpdate, isOwner }: { tournament: Tournament, onUpdate: (data: Partial<Tournament>) => Promise<void>, isOwner: boolean }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Team[]>([]);
    const { toast } = useToast();
    const { user, searchTeams } = useAuth();
    const [participatingTeams, setParticipatingTeams] = useState<Team[]>([]);
    const [playerSearchOpen, setPlayerSearchOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);

    useEffect(() => {
        const fetchTeamData = async () => {
            if (!tournament.participatingTeams || tournament.participatingTeams.length === 0) {
                setParticipatingTeams([]);
                return;
            }
            const teamsRef = collection(db, "teams");
            const chunks = [];
            for (let i = 0; i < tournament.participatingTeams.length; i += 30) {
                chunks.push(tournament.participatingTeams.slice(i, i + 30));
            }
            const teamPromises = chunks.map(chunk => getDocs(query(teamsRef, where("name", "in", chunk))));
            const teamSnapshots = await Promise.all(teamPromises);
            const teams: Team[] = [];
            teamSnapshots.forEach(snapshot => {
                snapshot.forEach(doc => teams.push({ id: doc.id, ...doc.data() } as Team));
            });
            setParticipatingTeams(teams);
        };
        fetchTeamData();
    }, [tournament.participatingTeams]);
    
    const handleSearch = async () => {
        if (searchTerm.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        const results = await searchTeams(searchTerm);
        const participatingNames = tournament.participatingTeams || [];
        const availableResults = results.filter(team => !participatingNames.includes(team.name));
        setSearchResults(availableResults);
    };

    const handleAddTeam = async (team: Team) => {
        try {
            await onUpdate({ participatingTeams: arrayUnion(team.name) });
            toast({ title: "Team Added!", description: `"${team.name}" has joined the tournament.` });
            setSearchTerm('');
            setSearchResults([]);
        } catch (e) {
            console.error("Error joining tournament: ", e);
            toast({ title: "Error", description: "Could not add team to the tournament.", variant: "destructive" });
        }
    };

    const handleRemoveTeam = async (teamName: string) => {
        await onUpdate({ participatingTeams: arrayRemove(teamName) });
        const updatedGroups = (tournament.groups || []).map(g => ({ ...g, teams: g.teams.filter(t => t !== teamName) }));
        await onUpdate({ groups: updatedGroups });
    };

    const handleOpenPlayerSearch = (team: Team) => {
        setEditingTeam(team);
        setPlayerSearchOpen(true);
    };

    const handleAddPlayerToTeam = async (player: UserProfile) => {
        if (!editingTeam) return;
        const isAlreadyAdded = editingTeam.players.some(p => p.id === player.uid);
        if (isAlreadyAdded) {
            toast({ title: "Player already in team", variant: "destructive" });
            return;
        }
        const newPlayer: Player = { id: player.uid, name: player.name };
        try {
            const teamRef = doc(db, 'teams', editingTeam.id);
            await updateDoc(teamRef, { players: arrayUnion({id: newPlayer.id, name: newPlayer.name}) });
            toast({ title: "Player Added!", description: `${newPlayer.name} has been added to ${editingTeam.name}.` });
            // Refresh team data locally
            setParticipatingTeams(prev => prev.map(t => t.id === editingTeam.id ? { ...t, players: [...t.players, newPlayer] } : t));
        } catch (error) {
            console.error("Error adding player: ", error);
            toast({ title: "Error", description: "Could not add player.", variant: "destructive" });
        }
    };

    const handleRemovePlayerFromTeam = async (team: Team, playerId: string) => {
        const playerToRemove = team.players.find(p => p.id === playerId);
        if (!playerToRemove) return;
        try {
            const teamRef = doc(db, "teams", team.id);
            await updateDoc(teamRef, { players: arrayRemove(playerToRemove) });
            setParticipatingTeams(prev => prev.map(t => t.id === team.id ? { ...t, players: t.players.filter(p => p.id !== playerId) } : t));
            toast({ title: "Player Removed", description: `${playerToRemove.name} removed from ${team.name}.` });
        } catch (e) {
            console.error("Error removing player: ", e);
            toast({ title: "Error", description: "Could not remove player.", variant: "destructive" });
        }
    };

    return (
        <Card>
            <PlayerSearchDialog open={playerSearchOpen} onOpenChange={setPlayerSearchOpen} onPlayerSelect={handleAddPlayerToTeam} />
            <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><Users className="h-6 w-6 text-primary"/><span>Participating Teams ({tournament.participatingTeams?.length || 0}/{tournament.numberOfTeams || '...'})</span></div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isOwner && (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Search to add a team..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                            />
                            <Button onClick={handleSearch}><Search className="h-4 w-4" /></Button>
                        </div>
                        {searchResults.length > 0 && (
                            <div className="border rounded-md max-h-40 overflow-y-auto">
                                {searchResults.map(team => (
                                    <div key={team.id} className="p-2 flex justify-between items-center hover:bg-secondary">
                                        <span>{team.name}</span>
                                        <Button size="sm" onClick={() => handleAddTeam(team)}>Add</Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-4 border-t pt-4">
                    {participatingTeams.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full">
                            {participatingTeams.map(team => (
                                <AccordionItem value={team.id} key={team.id}>
                                    <div className="flex items-center w-full pr-4">
                                        <AccordionTrigger className="flex-grow">
                                            {team.name}
                                        </AccordionTrigger>
                                        {isOwner && (
                                            <AlertDialog onOpenChange={(e) => e.stopPropagation()}>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Remove Team?</AlertDialogTitle><AlertDialogDescription>This will remove "{team.name}" from the tournament. Are you sure?</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveTeam(team.name)}>Remove</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                    <AccordionContent>
                                        <ul className="space-y-1 text-sm pl-4">
                                            {team.players.map(player => (
                                                <li key={player.id} className="flex justify-between items-center">
                                                    <span>{player.name}</span>
                                                    {isOwner && <Button variant="ghost" size="icon" onClick={() => handleRemovePlayerFromTeam(team, player.id)}><Trash2 className="h-3 w-3 text-destructive/70" /></Button>}
                                                </li>
                                            ))}
                                        </ul>
                                        {isOwner && (
                                            <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => handleOpenPlayerSearch(team)}>
                                                <UserPlus className="mr-2 h-4 w-4" /> Add Player
                                            </Button>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : <p className="text-sm text-muted-foreground text-center py-4">No teams have joined yet.</p>}
                </div>
            </CardContent>
        </Card>
    );
}

function calculateBattingPoints(batsman: Batsman): number {
    if (batsman.isOut && batsman.runs === 0 && batsman.balls > 0) {
        return -2;
    }
    let points = batsman.runs;
    points += (batsman.fours || 0) * 4;
    points += (batsman.sixes || 0) * 6;
    points += Math.floor(batsman.runs / 25) * 4;
    return points;
}

function calculateBowlingPoints(bowler: Bowler, allInnings: Innings[], ballsPerOver: number): number {
    let points = 0;
    
    // Dot balls
    const dotBalls = allInnings.flatMap(i => i.timeline).filter(b => b.bowlerId === bowler.id && b.runs === 0 && !b.isExtra).length;
    points += dotBalls * 0.5;

    // Wickets
    points += bowler.wickets * 20;

    // Dismissal bonus
    const dismissalBonus = allInnings.flatMap(i => i.timeline).filter(b => b.bowlerId === bowler.id && b.isWicket && (b.wicketType === 'Bowled' || b.wicketType === 'LBW')).length;
    points += dismissalBonus * 6;
    
    // Wicket-taking bonus
    if (bowler.wickets >= 5) {
        points += 12;
    } else if (bowler.wickets >= 4) {
        points += 8;
    } else if (bowler.wickets >= 3) {
        points += 4;
    }
    
    // Maiden overs
    const maidenOvers = allInnings.reduce((totalMaidens, innings) => {
        const bowlerEvents = innings.timeline.filter(e => e.bowlerId === bowler.id);
        const overs = new Map<number, number>(); // Map<overIndex, runs>

        bowlerEvents.forEach(e => {
            const overIndex = Math.floor(e.ballInOver / ballsPerOver);
            if (!overs.has(overIndex)) overs.set(overIndex, 0);
            if (!e.isExtra || e.extraType === 'by' || e.extraType === 'lb') {
                overs.set(overIndex, overs.get(overIndex)! + e.runs);
            }
        });

        return totalMaidens + Array.from(overs.values()).filter(runs => runs === 0).length;
    }, 0);
    points += maidenOvers * 6;

    return points;
}

function calculateFieldingPoints(stats: { catches: number; runOuts: number; stumpings: number; }): number {
    let points = 0;
    points += stats.catches * 8;
    points += stats.stumpings * 12;
    points += stats.runOuts * 8;

    if (stats.catches >= 3) points += 6;
    if (stats.stumpings >= 3) points += 12;
    
    return points;
}

function BatterLeaderboard({ stats }: { stats: BatterLeaderboardStat[] }) {
    if (stats.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No batting data available yet. Complete some matches to see the leaderboard.</p>;
    }
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">I</TableHead>
                    <TableHead className="text-center">Runs</TableHead>
                    <TableHead className="text-center">Avg</TableHead>
                    <TableHead className="text-right">SR</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {stats.map(player => (
                    <TableRow key={player.playerId}>
                        <TableCell className="font-medium">
                          <Link href={`/profile/${player.playerId}`} className="hover:underline">{player.playerName}</Link>
                        </TableCell>
                        <TableCell className="text-center">{player.innings}</TableCell>
                        <TableCell className="text-center font-bold">{player.runs}</TableCell>
                        <TableCell className="text-center">{player.average.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{player.strikeRate.toFixed(2)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function BowlerLeaderboard({ stats }: { stats: BowlerLeaderboardStat[] }) {
    if (stats.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No bowling data available yet. Complete some matches to see the leaderboard.</p>;
    }
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">Wkts</TableHead>
                    <TableHead className="text-center">Econ</TableHead>
                    <TableHead className="text-center">Avg</TableHead>
                    <TableHead className="text-right">SR</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {stats.map(player => (
                    <TableRow key={player.playerId}>
                        <TableCell className="font-medium">
                           <Link href={`/profile/${player.playerId}`} className="hover:underline">{player.playerName}</Link>
                        </TableCell>
                        <TableCell className="text-center font-bold">{player.wickets}</TableCell>
                        <TableCell className="text-center">{player.economy.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{player.average.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{player.strikeRate.toFixed(2)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function FielderLeaderboard({ stats }: { stats: FielderLeaderboardStat[] }) {
    if (stats.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No fielding data available yet. Complete some matches to see the leaderboard.</p>;
    }
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">Catches</TableHead>
                    <TableHead className="text-center">Run Outs</TableHead>
                    <TableHead className="text-right">Stumpings</TableHead>
                     <TableHead className="text-right">Points</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {stats.map(player => (
                    <TableRow key={player.playerId}>
                        <TableCell className="font-medium">
                           <Link href={`/profile/${player.playerId}`} className="hover:underline">{player.playerName}</Link>
                        </TableCell>
                        <TableCell className="text-center font-bold">{player.catches}</TableCell>
                        <TableCell className="text-center">{player.runOuts}</TableCell>
                        <TableCell className="text-right">{player.stumpings}</TableCell>
                        <TableCell className="text-right font-bold">{player.points}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function AllRounderLeaderboard({ stats }: { stats: AllRounderLeaderboardStat[] }) {
    if (stats.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No all-rounder data available yet. Complete some matches to see the leaderboard.</p>;
    }
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">Matches</TableHead>
                    <TableHead className="text-center">Runs</TableHead>
                    <TableHead className="text-center">Wickets</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {stats.map(player => (
                    <TableRow key={player.playerId}>
                        <TableCell className="font-medium">
                           <Link href={`/profile/${player.playerId}`} className="hover:underline">{player.playerName}</Link>
                        </TableCell>
                        <TableCell className="text-center">{player.matches}</TableCell>
                        <TableCell className="text-center">{player.runs}</TableCell>
                        <TableCell className="text-center">{player.wickets}</TableCell>
                        <TableCell className="text-right font-bold">{player.points.toFixed(1)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}


function TournamentDetailsPage() {
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [batterStats, setBatterStats] = useState<BatterLeaderboardStat[]>([]);
    const [bowlerStats, setBowlerStats] = useState<BowlerLeaderboardStat[]>([]);
    const [fielderStats, setFielderStats] = useState<FielderLeaderboardStat[]>([]);
    const [allRounderStats, setAllRounderStats] = useState<AllRounderLeaderboardStat[]>([]);
    const [pointsTables, setPointsTables] = useState<Record<string, TournamentPoints[]>>({});

    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const tournamentId = params.tournamentId as string;

    const isOwner = tournament?.userId === user?.uid;
    const isAdmin = tournament?.adminUids?.includes(user?.uid || '');
    const isOwnerOrAdmin = isOwner || isAdmin;
    const isScorer = tournament?.scorerUids?.includes(user?.uid || '');

    const liveMatches = useMemo(() => (tournament?.matches || []).filter(m => m.status === 'Live'), [tournament?.matches]);
    const upcomingMatches = useMemo(() => (tournament?.matches || []).filter(m => m.status === 'Upcoming'), [tournament?.matches]);
    const pastMatches = useMemo(() => (tournament?.matches || []).filter(m => m.status === 'Completed'), [tournament?.matches]);

    const calculateLeaderboards = useCallback(async (completedMatches: TournamentMatch[], currentTournament: Tournament) => {
        const batterPlayerStats: { [playerId: string]: BatterLeaderboardStat & { notOuts: number } } = {};
        const bowlerPlayerStats: { [playerId: string]: Bowler & { teamName: string; matches: Set<string>, allInnings: Innings[] } } = {};
        const fielderPlayerStats: { [playerId: string]: { name: string; team: string; catches: number; runOuts: number; stumpings: number; matches: Set<string> } } = {};

        for (const match of completedMatches) {
            if (!match.matchId) continue;
            
            const matchDoc = await getDoc(doc(db, 'matches', match.matchId));
            if (!matchDoc.exists()) continue;

            const matchData = matchDoc.data() as MatchState;
            
            if (matchData.config.tournamentId !== currentTournament.id) {
                continue;
            }

            const getPlayerTeam = (playerId: string, team1: Team, team2: Team): [Player | undefined, string] => {
                const player1 = team1.players.find(p => p.id === playerId);
                if (player1) return [player1, team1.name];
                const player2 = team2.players.find(p => p.id === playerId);
                if (player2) return [player2, team2.name];
                return [undefined, ''];
            }

            const processInnings = (inningsData: Innings, battingTeamName: string, bowlingTeamName: string) => {
                if (!inningsData) return;

                if (inningsData.batsmen) {
                    for (const batsman of Object.values(inningsData.batsmen) as Batsman[]) {
                        if (batsman.balls > 0 || batsman.isOut) {
                             if (!batterPlayerStats[batsman.id]) {
                                batterPlayerStats[batsman.id] = { 
                                  playerId: batsman.id,
                                  playerName: batsman.name,
                                  teamName: battingTeamName,
                                  matches: 0,
                                  innings: 0,
                                  runs: 0, 
                                  balls: 0,
                                  notOuts: 0,
                                  average: 0,
                                  strikeRate: 0,
                                  points: 0
                                };
                            }
                            batterPlayerStats[batsman.id].runs += batsman.runs;
                            batterPlayerStats[batsman.id].balls += batsman.balls;
                            batterPlayerStats[batsman.id].innings += 1;
                            if (!batsman.isOut) {
                              batterPlayerStats[batsman.id].notOuts += 1;
                            }
                        }

                        if (batsman.isOut && batsman.outInfo?.fielderId) {
                            const { method, fielderId } = batsman.outInfo;
                            const [fielder, fielderTeam] = getPlayerTeam(fielderId, matchData.config.team1, matchData.config.team2);

                            if (fielder) {
                                if (!fielderPlayerStats[fielder.id]) {
                                    fielderPlayerStats[fielder.id] = { name: fielder.name, team: fielderTeam, catches: 0, runOuts: 0, stumpings: 0, matches: new Set() };
                                }
                                fielderPlayerStats[fielder.id].matches.add(match.id);
                                if (method === 'Caught') fielderPlayerStats[fielder.id].catches++;
                                else if (method === 'Run out') fielderPlayerStats[fielder.id].runOuts++;
                                else if (method === 'Stumped') fielderPlayerStats[fielder.id].stumpings++;
                            }
                        }
                    }
                }
                 if (inningsData.bowlers) {
                    for (const bowler of Object.values(inningsData.bowlers) as Bowler[]) {
                        if (bowler.balls > 0) {
                             if (!bowlerPlayerStats[bowler.id]) {
                                bowlerPlayerStats[bowler.id] = { ...bowler, teamName: bowlingTeamName, matches: new Set(), allInnings: [] };
                            } else {
                                bowlerPlayerStats[bowler.id].balls += bowler.balls;
                                bowlerPlayerStats[bowler.id].runsConceded += bowler.runsConceded;
                                bowlerPlayerStats[bowler.id].wickets += bowler.wickets;
                            }
                            bowlerPlayerStats[bowler.id].matches.add(match.id);
                            bowlerPlayerStats[bowler.id].allInnings.push(inningsData);
                        }
                    }
                }
            };
            
            processInnings(matchData.innings1, matchData.config.team1.name, matchData.config.team2.name);
            if (matchData.innings2) {
                processInnings(matchData.innings2, matchData.config.team2.name, matchData.config.team1.name);
            }
        }
        
        const newBatterStats: BatterLeaderboardStat[] = Object.values(batterPlayerStats)
            .map(data => {
              const dismissals = data.innings - data.notOuts;
              const average = dismissals > 0 ? data.runs / dismissals : data.runs;
              const strikeRate = data.balls > 0 ? (data.runs / data.balls) * 100 : 0;
              return {
                ...data,
                average,
                strikeRate,
                points: calculateBattingPoints(data as Batsman)
              }
            })
            .sort((a, b) => b.runs - a.runs);
        setBatterStats(newBatterStats);

        const newBowlerStats: BowlerLeaderboardStat[] = Object.values(bowlerPlayerStats)
             .map(data => ({
                playerId: data.id,
                playerName: data.name,
                teamName: data.teamName,
                matches: data.matches.size,
                overs: formatOvers(data.balls),
                balls: data.balls,
                wickets: data.wickets,
                runsConceded: data.runsConceded,
                economy: data.balls > 0 ? (data.runsConceded / (data.balls / 6)) : 0,
                average: data.wickets > 0 ? data.runsConceded / data.wickets : 0,
                strikeRate: data.wickets > 0 ? data.balls / data.wickets : 0,
                points: calculateBowlingPoints(data, data.allInnings, currentTournament.oversPerInnings)
            }))
            .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded);
        setBowlerStats(newBowlerStats);
        
        const newFielderStats: FielderLeaderboardStat[] = Object.entries(fielderPlayerStats)
            .map(([playerId, data]) => ({
                playerId,
                playerName: data.name,
                teamName: data.team,
                catches: data.catches,
                runOuts: data.runOuts,
                stumpings: data.stumpings,
                points: calculateFieldingPoints(data)
            }))
            .sort((a, b) => (b.catches + b.runOuts + b.stumpings) - (a.catches + a.runOuts + a.stumpings));
        setFielderStats(newFielderStats);

        const allPlayers: { [playerId: string]: { id: string; name: string; team: string; matches: Set<string> } } = {};
        
        Object.values(batterPlayerStats).forEach(p => {
            if (!allPlayers[p.playerId]) allPlayers[p.playerId] = { id: p.playerId, name: p.playerName, team: p.teamName, matches: new Set() };
            // In theory, a player can only bat once per match.
            // But to be safe, we just collect all match IDs.
        });
        Object.values(bowlerPlayerStats).forEach(p => {
            if (!allPlayers[p.id]) allPlayers[p.id] = { id: p.id, name: p.name, team: p.teamName, matches: new Set() };
            p.matches.forEach(matchId => allPlayers[p.id].matches.add(matchId));
        });
        // We'll need to re-calc matches played by all-rounders
        for(const match of completedMatches){
            if(!match.matchId) continue;
            const matchDoc = await getDoc(doc(db, 'matches', match.matchId));
            if(!matchDoc.exists()) continue;
            const matchData = matchDoc.data() as MatchState;
            const playerIds = new Set([...matchData.config.team1.players.map(p => p.id), ...matchData.config.team2.players.map(p => p.id)]);
            playerIds.forEach(id => {
                if(allPlayers[id]){
                    allPlayers[id].matches.add(match.id);
                }
            })
        }
        
        const newAllRounderStats: AllRounderLeaderboardStat[] = Object.values(allPlayers)
            .map(player => {
                const batting = batterPlayerStats[player.id] || { runs: 0, isOut: false, balls: 0, fours: 0, sixes: 0, notOuts: 0, innings: 0 };
                const bowling = bowlerPlayerStats[player.id] || { wickets: 0, allInnings: [] };
                const fielding = fielderPlayerStats[player.id] || { catches: 0, runOuts: 0, stumpings: 0 };
                
                const battingPoints = calculateBattingPoints(batting as Batsman);
                const bowlingPoints = calculateBowlingPoints(bowling, bowling.allInnings, currentTournament.oversPerInnings);
                const fieldingPoints = calculateFieldingPoints(fielding);
                const points = battingPoints + bowlingPoints + fieldingPoints;

                return {
                    playerId: player.id,
                    playerName: player.name,
                    teamName: player.team,
                    matches: player.matches.size,
                    runs: batting.runs,
                    wickets: bowling.wickets,
                    points: points,
                };
            })
            .sort((a, b) => b.points - a.points);
        setAllRounderStats(newAllRounderStats);

    }, []);

    const calculatePointsForAllGroups = useCallback(async (currentTournament: Tournament) => {
        if (!currentTournament.groups || !currentTournament.matches || !currentTournament.pointsPolicy) return;
    
        const newPointsTables: Record<string, TournamentPoints[]> = {};
    
        for (const group of currentTournament.groups) {
            const pointsData: { [teamName: string]: TournamentPoints & { totalRunsScored: number, totalOversFaced: number, totalRunsConceded: number, totalOversBowled: number } } = {};
    
            group.teams.forEach(teamName => {
                pointsData[teamName] = { teamName, matchesPlayed: 0, wins: 0, losses: 0, draws: 0, points: 0, netRunRate: 0.00, totalRunsScored: 0, totalOversFaced: 0, totalRunsConceded: 0, totalOversBowled: 0 };
            });
    
            const groupMatches = currentTournament.matches.filter(m => m.groupName === group.name && m.status === 'Completed' && m.result && m.matchId);
    
            for (const match of groupMatches) {
                const matchDoc = await getDoc(doc(db, 'matches', match.matchId!));
                if (!matchDoc.exists()) continue;
                const matchData = matchDoc.data() as MatchState;
    
                const { winner, loser, method } = match.result!;
    
                if (pointsData[match.team1]) pointsData[match.team1].matchesPlayed++;
                if (pointsData[match.team2]) pointsData[match.team2].matchesPlayed++;
    
                if (method.toLowerCase().includes('draw') || method.toLowerCase().includes('tie')) {
                    if (pointsData[match.team1]) { pointsData[match.team1].draws++; pointsData[match.team1].points += currentTournament.pointsPolicy.draw; }
                    if (pointsData[match.team2]) { pointsData[match.team2].draws++; pointsData[match.team2].points += currentTournament.pointsPolicy.draw; }
                } else {
                    if (winner && pointsData[winner]) { pointsData[winner].wins++; pointsData[winner].points += currentTournament.pointsPolicy.win; }
                    if (loser && pointsData[loser]) { pointsData[loser].losses++; pointsData[loser].points += currentTournament.pointsPolicy.loss; }
                }
    
                // NRR Calculation
                const team1Name = matchData.config.team1.name;
                const team2Name = matchData.config.team2.name;
    
                const innings1 = matchData.innings1;
                const innings2 = matchData.innings2;

                const ballsPerOver = matchData.config.ballsPerOver || 6;
    
                // Team 1 NRR data
                if (pointsData[team1Name]) {
                    if (innings1.battingTeam === 'team1') {
                        pointsData[team1Name].totalRunsScored += innings1.score;
                        pointsData[team1Name].totalOversFaced += innings1.balls / ballsPerOver;
                    }
                    if (innings2 && innings2.battingTeam === 'team1') {
                        pointsData[team1Name].totalRunsScored += innings2.score;
                        pointsData[team1Name].totalOversFaced += innings2.balls / ballsPerOver;
                    }
                    if (innings1.bowlingTeam === 'team1') {
                        pointsData[team1Name].totalRunsConceded += innings1.score;
                        pointsData[team1Name].totalOversBowled += innings1.balls / ballsPerOver;
                    }
                    if (innings2 && innings2.bowlingTeam === 'team1') {
                        pointsData[team1Name].totalRunsConceded += innings2.score;
                        pointsData[team1Name].totalOversBowled += innings2.balls / ballsPerOver;
                    }
                }
    
                // Team 2 NRR data
                if (pointsData[team2Name]) {
                    if (innings1.battingTeam === 'team2') {
                        pointsData[team2Name].totalRunsScored += innings1.score;
                        pointsData[team2Name].totalOversFaced += innings1.balls / ballsPerOver;
                    }
                    if (innings2 && innings2.battingTeam === 'team2') {
                        pointsData[team2Name].totalRunsScored += innings2.score;
                        pointsData[team2Name].totalOversFaced += innings2.balls / ballsPerOver;
                    }
                    if (innings1.bowlingTeam === 'team2') {
                        pointsData[team2Name].totalRunsConceded += innings1.score;
                        pointsData[team2Name].totalOversBowled += innings1.balls / ballsPerOver;
                    }
                    if (innings2 && innings2.bowlingTeam === 'team2') {
                        pointsData[team2Name].totalRunsConceded += innings2.score;
                        pointsData[team2Name].totalOversBowled += innings2.balls / ballsPerOver;
                    }
                }
            }
    
            Object.values(pointsData).forEach(team => {
                const scoringRate = team.totalOversFaced > 0 ? team.totalRunsScored / team.totalOversFaced : 0;
                const concedingRate = team.totalOversBowled > 0 ? team.totalRunsConceded / team.totalOversBowled : 0;
                team.netRunRate = scoringRate - concedingRate;
            });
    
            newPointsTables[group.name] = Object.values(pointsData);
        }
        setPointsTables(newPointsTables);
    }, []);

    const fetchTournamentAndListen = useCallback(() => {
        if (!tournamentId) return;
        const unsub = onSnapshot(doc(db, "tournaments", tournamentId), (doc) => {
            if (doc.exists()) {
                const tournamentData = { ...doc.data() as Tournament, id: doc.id };
                setTournament(tournamentData);
                const completed = (tournamentData.matches || []).filter(m => m.status === 'Completed');
                if (completed.length > 0) {
                    calculateLeaderboards(completed, tournamentData);
                    calculatePointsForAllGroups(tournamentData);
                }
            } else {
                toast({ title: "Error", description: "Tournament not found.", variant: "destructive" });
                router.push('/tournaments');
            }
            setLoading(false);
        });
        return unsub;
    }, [tournamentId, router, toast, calculateLeaderboards, calculatePointsForAllGroups]);

    useEffect(() => {
        const unsubscribe = fetchTournamentAndListen();
        return () => unsubscribe && unsubscribe();
    }, [fetchTournamentAndListen]);

    const handleUpdateTournament = async (data: Partial<Tournament>) => {
      try {
        const tournamentRef = doc(db, "tournaments", tournamentId);
        await updateDoc(tournamentRef, data);
        toast({ title: "Tournament Updated", description: "The changes have been saved successfully." });
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
    
    if (loading) return <div className="flex items-center justify-center min-h-screen">Loading tournament...</div>;
    if (!tournament) return <div className="flex items-center justify-center min-h-screen">Tournament not found.</div>;

    const knockoutStages = ['Quarter Final', 'Semi Final', 'Final'];

    return (
        <div className="min-h-screen bg-gray-50 text-foreground font-body">
            <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
                <Button variant="ghost" size="icon" onClick={() => router.push('/tournaments')}><ArrowLeft className="h-6 w-6" /></Button>
                <div className='flex flex-col items-center text-center'><h1 className="text-2xl font-bold truncate max-w-sm">{tournament.name}</h1><p className="text-sm text-muted-foreground">Tournament Dashboard</p></div>
                {isOwnerOrAdmin ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Settings className="h-6 w-6" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/tournaments/edit/${tournament.id}`)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Edit Tournament</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/tournaments/${tournament.id}/advanced-settings`)}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Advanced Settings</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : <div className="w-10"></div>}
            </header>

            <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 relative">
                 <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden bg-secondary shadow-lg group">
                    <Image
                        src={tournament.coverPhotoUrl || 'https://picsum.photos/1200/400'}
                        alt="Tournament Cover Photo"
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint="cricket stadium"
                    />
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 md:w-32 md:h-32 bg-background/70 rounded-full flex items-center justify-center border-4 border-white backdrop-blur-sm">
                             <Image
                                src={tournament.logoUrl || 'https://picsum.photos/200/200'}
                                alt="Tournament Logo"
                                width={128}
                                height={128}
                                className="rounded-full object-cover"
                                data-ai-hint="cricket logo"
                            />
                        </div>
                    </div>
                </div>
                <Tabs defaultValue="teams" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="teams"><Users className="mr-2 h-4 w-4"/>Teams & Groups</TabsTrigger>
                        <TabsTrigger value="matches"><ShieldCheck className="mr-2 h-4 w-4"/>Matches</TabsTrigger>
                        <TabsTrigger value="leaderboard"><BarChart2 className="mr-2 h-4 w-4"/>Leaderboard</TabsTrigger>
                        <TabsTrigger value="points"><ListOrdered className="mr-2 h-4 w-4"/>Points Table</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="teams" className="mt-6">
                      <div className="grid md:grid-cols-2 gap-8">
                          <ParticipatingTeamsCard tournament={tournament} onUpdate={handleUpdateTournament} isOwner={isOwnerOrAdmin} />
                          <GroupManagement tournament={tournament} onUpdate={handleUpdateTournament} isOwner={isOwnerOrAdmin} />
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
                            {liveMatches.length > 0 ? liveMatches.map(match => <LiveMatchCard key={match.id} match={match} tournamentId={tournamentId} />) : <p className="text-muted-foreground text-center py-8">No live matches right now.</p>}
                        </TabsContent>
                         <TabsContent value="upcoming" className="mt-4">
                            {upcomingMatches.length > 0 ? upcomingMatches.map(match => (
                                <Card key={match.id} className="mb-4">
                                    <CardContent className="p-4 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold">{match.team1} vs {match.team2}</p>
                                            <p className="text-sm text-muted-foreground">{new Date(match.date!).toLocaleString()} at {match.venue}</p>
                                        </div>
                                        {(isOwnerOrAdmin || isScorer) && (
                                            <div className="flex items-center gap-2">
                                                <Link href={`/tournaments/${tournamentId}/match-details?team1Name=${encodeURIComponent(match.team1)}&team2Name=${encodeURIComponent(match.team2)}&date=${encodeURIComponent(match.date || '')}&venue=${encodeURIComponent(match.venue || '')}&matchRound=${encodeURIComponent(match.matchRound || '')}`}>
                                                    <Button>Start Match</Button>
                                                </Link>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="icon"><Pencil className="h-4 w-4"/></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onSelect={() => router.push(`/tournaments/${tournamentId}/add-match?group=${match.groupName}&team1=${match.team1}&team2=${match.team2}&edit=true&matchId=${match.id}`)}>
                                                            Rescheduling Match
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => router.push(`/tournaments/${tournamentId}/add-match?group=${match.groupName}&team1=${match.team1}&team2=${match.team2}&edit=true&matchId=${match.id}`)}>
                                                            Edit Match Details
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
                                        )}
                                    </CardContent>
                                </Card>
                            )) : <p className="text-muted-foreground text-center py-8">No upcoming matches scheduled.</p>}
                        </TabsContent>
                         <TabsContent value="past" className="mt-4">
                            {pastMatches.length > 0 ? pastMatches.map(match => <PastMatchCard key={match.id} match={match} />) : <p className="text-muted-foreground text-center py-8">No past matches found.</p>}
                        </TabsContent>
                      </Tabs>
                    </TabsContent>

                    <TabsContent value="leaderboard" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Leaderboard</CardTitle>
                                <CardDescription>Top performers in the tournament.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="batter" className="w-full">
                                    <TabsList className="grid w-full grid-cols-4">
                                        <TabsTrigger value="batter"><Star className="mr-2 h-4 w-4" />Batter</TabsTrigger>
                                        <TabsTrigger value="bowler"><ShieldAlert className="mr-2 h-4 w-4" />Bowler</TabsTrigger>
                                        <TabsTrigger value="all-rounder"><Award className="mr-2 h-4 w-4" />All-rounder</TabsTrigger>
                                        <TabsTrigger value="fielder"><User className="mr-2 h-4 w-4" />Fielder</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="batter" className="mt-4">
                                        <BatterLeaderboard stats={batterStats} />
                                    </TabsContent>
                                    <TabsContent value="bowler" className="mt-4">
                                        <BowlerLeaderboard stats={bowlerStats} />
                                    </TabsContent>
                                    <TabsContent value="all-rounder" className="mt-4">
                                        <AllRounderLeaderboard stats={allRounderStats} />
                                    </TabsContent>
                                    <TabsContent value="fielder" className="mt-4">
                                        <FielderLeaderboard stats={fielderStats} />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="points" className="mt-6 space-y-6">
                       {tournament.groups && tournament.groups.length > 0 ? (
                         tournament.groups.map(group => (
                           <PointsTable 
                                key={group.name} 
                                teams={pointsTables[group.name] || []} 
                                title={`Points Table - ${group.name}`} 
                                onUpdate={handleUpdateTournament} 
                                isOwner={isOwnerOrAdmin} 
                                qualifiedTeams={tournament.qualifiedTeams} 
                                isKnockout={knockoutStages.includes(group.name)}
                                tournamentMatches={tournament.matches}
                                groupName={group.name}
                           />
                         ))
                       ) : (
                         <Card><CardHeader><CardTitle>Points Table</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-4">No groups available. Create groups and play matches to see the points table.</p></CardContent></Card>
                       )}
                    </TabsContent>
                </Tabs>
                {(isOwnerOrAdmin || isScorer) && (
                    <Link href={`/tournaments/${tournamentId}/add-match`} passHref>
                        <Button className="fixed bottom-8 right-8 rounded-full h-16 w-16 shadow-lg">
                            <Plus className="h-8 w-8" />
                        </Button>
                    </Link>
                )}
            </main>
        </div>
    );
}

export default TournamentDetailsPage;
