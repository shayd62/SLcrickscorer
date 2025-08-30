
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, Users, ArrowLeft, Trophy, MapPin, ChevronRight, UserPlus, Settings, Pencil, Share2, Pin, Star, ShieldAlert, Award, User as UserIcon } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { Team, UserProfile, MatchState, Innings, Batsman, Bowler, BatterLeaderboardStat, BowlerLeaderboardStat, FielderLeaderboardStat, AllRounderLeaderboardStat } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { PlayerSearchDialog } from '@/components/player-search-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatOvers = (balls: number, ballsPerOver: number = 6) => `${Math.floor(balls / ballsPerOver)}.${balls % ballsPerOver}`;

function MatchResultCard({ match, currentTeamName }: { match: MatchState, currentTeamName: string }) {
    const router = useRouter();
    const { config, resultText } = match;

    const opponent = config.team1.name === currentTeamName ? config.team2 : config.team1;
    const isWinner = match.winner === (config.team1.name === currentTeamName ? 'team1' : 'team2');

    return (
        <Card className="cursor-pointer hover:bg-secondary/50" onClick={() => router.push(`/scorecard/${match.id}`)}>
            <CardContent className="p-4">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">vs {opponent.name}</p>
                        <p className={cn(
                            "font-semibold",
                            isWinner ? 'text-green-500' : 'text-destructive'
                        )}>
                            {resultText}
                        </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
            </CardContent>
        </Card>
    );
}

function BatterLeaderboard({ stats }: { stats: BatterLeaderboardStat[] }) {
    if (stats.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No batting data available yet.</p>;
    }
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">Runs</TableHead>
                    <TableHead className="text-right">SR</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {stats.map(player => (
                    <TableRow key={player.playerId}>
                        <TableCell className="font-medium">{player.playerName}</TableCell>
                        <TableCell className="text-center font-bold">{player.runs}</TableCell>
                        <TableCell className="text-right">{player.strikeRate.toFixed(2)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function BowlerLeaderboard({ stats }: { stats: BowlerLeaderboardStat[] }) {
    if (stats.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No bowling data available yet.</p>;
    }
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">Wickets</TableHead>
                    <TableHead className="text-right">Econ</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {stats.map(player => (
                    <TableRow key={player.playerId}>
                        <TableCell className="font-medium">{player.playerName}</TableCell>
                        <TableCell className="text-center font-bold">{player.wickets}</TableCell>
                        <TableCell className="text-right">{player.economy.toFixed(2)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function FielderLeaderboard({ stats }: { stats: FielderLeaderboardStat[] }) {
    if (stats.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No fielding data available yet.</p>;
    }
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">Catches</TableHead>
                    <TableHead className="text-center">Run Outs</TableHead>
                    <TableHead className="text-right">Stumpings</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {stats.map(player => (
                    <TableRow key={player.playerId}>
                        <TableCell className="font-medium">{player.playerName}</TableCell>
                        <TableCell className="text-center font-bold">{player.catches}</TableCell>
                        <TableCell className="text-center">{player.runOuts}</TableCell>
                        <TableCell className="text-right">{player.stumpings}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function AllRounderLeaderboard({ stats }: { stats: AllRounderLeaderboardStat[] }) {
    if (stats.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No all-rounder data available yet.</p>;
    }
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">Runs</TableHead>
                    <TableHead className="text-center">Wickets</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {stats.map(player => (
                    <TableRow key={player.playerId}>
                        <TableCell className="font-medium">{player.playerName}</TableCell>
                        <TableCell className="text-center">{player.runs}</TableCell>
                        <TableCell className="text-center">{player.wickets}</TableCell>
                        <TableCell className="text-right font-bold">{player.points}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function EditTeamPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [matches, setMatches] = useState<MatchState[]>([]);
  const [isPlayerSearchOpen, setPlayerSearchOpen] = useState(false);
  const [batterStats, setBatterStats] = useState<BatterLeaderboardStat[]>([]);
  const [bowlerStats, setBowlerStats] = useState<BowlerLeaderboardStat[]>([]);
  const [fielderStats, setFielderStats] = useState<FielderLeaderboardStat[]>([]);
  const [allRounderStats, setAllRounderStats] = useState<AllRounderLeaderboardStat[]>([]);

  
  const teamId = params.teamId as string;

  const calculateLeaderboards = useCallback((completedMatches: MatchState[], currentTeam: Team) => {
    const batterPlayerStats: { [playerId: string]: { name: string; runs: number; balls: number; matches: Set<string> } } = {};
    const bowlerPlayerStats: { [playerId: string]: { name: string; balls: number; runsConceded: number; wickets: number; matches: Set<string> } } = {};
    const fielderPlayerStats: { [playerId: string]: { name: string; catches: number; runOuts: number; stumpings: number; matches: Set<string> } } = {};

    const teamPlayerIds = new Set(currentTeam.players.map(p => p.id));

    for (const matchData of completedMatches) {
        const processInnings = (innings: Innings) => {
            if (!innings) return;
            
            // Batting Stats for team members
            for (const batsman of Object.values(innings.batsmen) as Batsman[]) {
                if (teamPlayerIds.has(batsman.id) && (batsman.balls > 0 || batsman.isOut)) {
                     if (!batterPlayerStats[batsman.id]) {
                        batterPlayerStats[batsman.id] = { name: batsman.name, runs: 0, balls: 0, matches: new Set() };
                    }
                    batterPlayerStats[batsman.id].runs += batsman.runs;
                    batterPlayerStats[batsman.id].balls += batsman.balls;
                    batterPlayerStats[batsman.id].matches.add(matchData.id!);
                }
            }

            // Bowling and Fielding Stats for team members
            for (const bowler of Object.values(innings.bowlers) as Bowler[]) {
                if (teamPlayerIds.has(bowler.id) && bowler.balls > 0) {
                     if (!bowlerPlayerStats[bowler.id]) {
                        bowlerPlayerStats[bowler.id] = { name: bowler.name, balls: 0, runsConceded: 0, wickets: 0, matches: new Set() };
                    }
                    bowlerPlayerStats[bowler.id].balls += bowler.balls;
                    bowlerPlayerStats[bowler.id].runsConceded += bowler.runsConceded;
                    bowlerPlayerStats[bowler.id].wickets += bowler.wickets;
                    bowlerPlayerStats[bowler.id].matches.add(matchData.id!);
                }
            }
            
            // Fielding from dismissals
            for (const batsman of Object.values(innings.batsmen) as Batsman[]) {
              if (batsman.isOut && batsman.outInfo?.fielderId && teamPlayerIds.has(batsman.outInfo.fielderId)) {
                  const fielderId = batsman.outInfo.fielderId;
                  const fielder = currentTeam.players.find(p => p.id === fielderId);
                  if (fielder) {
                      if (!fielderPlayerStats[fielderId]) {
                          fielderPlayerStats[fielderId] = { name: fielder.name, catches: 0, runOuts: 0, stumpings: 0, matches: new Set() };
                      }
                      fielderPlayerStats[fielderId].matches.add(matchData.id!);
                      if (batsman.outInfo.method === 'Caught') fielderPlayerStats[fielderId].catches++;
                      else if (batsman.outInfo.method === 'Run out') fielderPlayerStats[fielderId].runOuts++;
                      else if (batsman.outInfo.method === 'Stumped') fielderPlayerStats[fielderId].stumpings++;
                  }
              }
            }
        };
        
        processInnings(matchData.innings1);
        if (matchData.innings2) {
            processInnings(matchData.innings2);
        }
    }
    
    setBatterStats(Object.entries(batterPlayerStats)
        .map(([playerId, data]) => ({
            playerId,
            playerName: data.name,
            teamName: currentTeam.name,
            matches: data.matches.size,
            runs: data.runs,
            balls: data.balls,
            strikeRate: data.balls > 0 ? (data.runs / data.balls) * 100 : 0
        }))
        .sort((a, b) => b.runs - a.runs));

    setBowlerStats(Object.entries(bowlerPlayerStats)
         .map(([playerId, data]) => ({
            playerId,
            playerName: data.name,
            teamName: currentTeam.name,
            matches: data.matches.size,
            overs: formatOvers(data.balls),
            wickets: data.wickets,
            runsConceded: data.runsConceded,
            economy: data.balls > 0 ? (data.runsConceded / (data.balls / 6)) : 0
        }))
        .sort((a, b) => b.wickets - a.wickets || a.economy - b.economy));
    
    setFielderStats(Object.entries(fielderPlayerStats)
        .map(([playerId, data]) => ({
            playerId,
            playerName: data.name,
            teamName: currentTeam.name,
            matches: data.matches.size,
            catches: data.catches,
            runOuts: data.runOuts,
            stumpings: data.stumpings
        }))
        .sort((a, b) => (b.catches + b.runOuts + b.stumpings) - (a.catches + a.runOuts + a.stumpings)));
    
    const allPlayers: { [playerId: string]: { name: string; team: string; matches: Set<string> } } = {};
    Object.values(batterPlayerStats).forEach(p => { if (!allPlayers[p.name]) allPlayers[p.name] = { name: p.name, team: currentTeam.name, matches: p.matches }});
    Object.values(bowlerPlayerStats).forEach(p => { if (!allPlayers[p.name]) allPlayers[p.name] = { name: p.name, team: currentTeam.name, matches: p.matches }});
    Object.values(fielderPlayerStats).forEach(p => { if (!allPlayers[p.name]) allPlayers[p.name] = { name: p.name, team: currentTeam.name, matches: p.matches }});
    
    setAllRounderStats(Object.values(allPlayers)
        .map(player => {
            const batting = batterPlayerStats[player.name] || { runs: 0 };
            const bowling = bowlerPlayerStats[player.name] || { wickets: 0 };
            const fielding = fielderPlayerStats[player.name] || { catches: 0, runOuts: 0, stumpings: 0 };
            
            const points = (batting.runs * 1) + (bowling.wickets * 20) + ((fielding.catches + fielding.runOuts + fielding.stumpings) * 10);

            return {
                playerId: player.name,
                playerName: player.name,
                teamName: player.team,
                matches: player.matches.size,
                runs: batting.runs,
                wickets: bowling.wickets,
                points: points,
            };
        })
        .sort((a, b) => b.points - a.points));

  }, []);
  
  useEffect(() => {
    if (teamId && user) {
        const fetchTeamAndMatches = async () => {
            // Fetch team details
            const teamDocRef = doc(db, "teams", teamId);
            const docSnap = await getDoc(teamDocRef);
            if (docSnap.exists()) {
                const teamData = { id: docSnap.id, ...docSnap.data() } as Team;
                 if (teamData.userId && user && teamData.userId !== user.uid) {
                    toast({ title: "Unauthorized", description: "You do not have permission to view this team.", variant: "destructive" });
                    router.push('/teams');
                    return;
                }
                setTeam(teamData);

                // Fetch matches for this team
                const matchesRef = collection(db, "matches");
                const q1 = query(matchesRef, where("config.team1.name", "==", teamData.name), where("matchOver", "==", true));
                const q2 = query(matchesRef, where("config.team2.name", "==", teamData.name), where("matchOver", "==", true));

                const [query1Snapshot, query2Snapshot] = await Promise.all([getDocs(q1), getDocs(q2)]);
                
                const teamMatches: MatchState[] = [];
                const matchIds = new Set<string>();

                query1Snapshot.forEach((doc) => {
                    if (!matchIds.has(doc.id)) {
                        teamMatches.push({ ...doc.data(), id: doc.id } as MatchState);
                        matchIds.add(doc.id);
                    }
                });
                query2Snapshot.forEach((doc) => {
                    if (!matchIds.has(doc.id)) {
                        teamMatches.push({ ...doc.data(), id: doc.id } as MatchState);
                        matchIds.add(doc.id);
                    }
                });
                
                setMatches(teamMatches);
                calculateLeaderboards(teamMatches, teamData);

            } else {
                toast({ title: "Error", description: "Team not found.", variant: "destructive" });
                router.push('/teams');
            }
        };
        fetchTeamAndMatches();
    }
  }, [teamId, router, toast, user, calculateLeaderboards]);

  const handlePlayerDelete = async (playerToRemoveId: string) => {
    if (!team) return;
    
    const playerToRemove = team.players.find(p => p.id === playerToRemoveId);
    if (!playerToRemove) return;

    try {
        const teamRef = doc(db, "teams", teamId);
        await updateDoc(teamRef, {
            players: arrayRemove(playerToRemove)
        });

        setTeam(prevTeam => {
            if (!prevTeam) return null;
            return {
                ...prevTeam,
                players: prevTeam.players.filter(p => p.id !== playerToRemoveId)
            };
        });

        toast({
            title: "Player Removed",
            description: `${playerToRemove.name} has been removed from the team.`,
        });
    } catch (e) {
        console.error("Error removing player: ", e);
        toast({ title: "Error", description: "Could not remove player.", variant: "destructive" });
    }
  };

  const handleAddPlayerToTeam = async (player: UserProfile) => {
    if (!team) return;

    const isAlreadyAdded = team.players.some(p => p.id === player.uid);
    if (isAlreadyAdded) {
        toast({ title: "Player already in team", variant: "destructive" });
        return;
    }

    const newPlayer = {
        id: player.uid,
        name: player.name,
    };

    try {
        const teamRef = doc(db, 'teams', team.id);
        await updateDoc(teamRef, { players: arrayUnion(newPlayer) });
        
        setTeam(prevTeam => prevTeam ? ({ ...prevTeam, players: [...prevTeam.players, newPlayer] }) : null);
        
        toast({ title: "Player Added!", description: `${newPlayer.name} has been added to ${team.name}.` });
    } catch (error) {
        console.error("Error adding new player: ", error);
        toast({ title: "Error", description: "Could not add player.", variant: "destructive" });
    }
  };

  const handleTeamDelete = async () => {
    if (!team) return;
    try {
      await deleteDoc(doc(db, "teams", team.id));
      toast({
        title: "Team Deleted",
        description: `Team "${team.name}" has been deleted successfully.`,
        variant: "destructive",
      });
      router.push('/teams');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the team. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting team: ", error);
    }
  };

  const handleShare = () => {
    // This could be a link to a public team page in the future
    const teamLink = `${window.location.origin}/teams/view/${teamId}`;
    navigator.clipboard.writeText(teamLink);
    toast({
      title: "Link Copied!",
      description: "A shareable link for your team has been copied to your clipboard.",
    });
  };
  
  const handleShowPin = () => {
    if (!team) return;
    
    let hash = 0;
    for (let i = 0; i < team.id.length; i++) {
        const char = team.id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    const pin = (Math.abs(hash) % 10000).toString().padStart(4, '0');

    toast({
      title: `Team PIN for ${team.name}`,
      description: `Your 4-digit PIN is: ${pin}`,
    });
  };

  if (!team) {
    return <div className="flex justify-center items-center h-screen">Loading team...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground font-body">
       <PlayerSearchDialog open={isPlayerSearchOpen} onOpenChange={setPlayerSearchOpen} onPlayerSelect={handleAddPlayerToTeam} />
       <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm">
         <Button variant="ghost" size="icon" onClick={() => router.push('/teams')}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className='flex flex-col items-center'>
            <h1 className="text-xl font-bold">{team.name}</h1>
          </div>
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/teams/edit-form/${team.id}`)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  <span>Edit</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    <span>Share</span>
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={handleShowPin}>
                    <Pin className="mr-2 h-4 w-4" />
                    <span>Pin</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the team "{team.name}" and all its data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleTeamDelete}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete Team
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
      </header>
      <main className="p-4 md:p-8 flex flex-col items-center">
        <div className="flex flex-col items-center gap-2">
            <Image 
                src={team.logoUrl || '/placeholder-team.png'}
                alt="Team Logo"
                width={96}
                height={96}
                className="rounded-full border-2"
            />
            <h2 className="text-2xl font-bold mt-2">{team.name}</h2>
            <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{team.city || 'Location not set'}</span>
            </div>
        </div>

        <Tabs defaultValue="players" className="w-full max-w-md mt-6">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="matches">Matches</TabsTrigger>
                <TabsTrigger value="players">Players</TabsTrigger>
                <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            </TabsList>
            <TabsContent value="matches" className="mt-4 space-y-2">
                {matches.length > 0 ? (
                    matches.map(match => (
                        <MatchResultCard key={match.id} match={match} currentTeamName={team.name} />
                    ))
                ) : (
                    <Card>
                        <CardContent className="p-6 text-center text-muted-foreground">
                            No matches played yet.
                        </CardContent>
                    </Card>
                )}
            </TabsContent>
            <TabsContent value="players" className="mt-4 space-y-2">
                {team.players.map(player => (
                    <Card key={player.id}>
                        <CardContent className="p-3 flex items-center justify-between">
                            <span className="font-medium">{player.name}</span>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    This action cannot be undone. This will permanently remove {player.name} from the team.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handlePlayerDelete(player.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                ))}
                {team.players.length === 0 && (
                    <Card>
                        <CardContent className="p-6 text-center text-muted-foreground">
                            This team has no players.
                        </CardContent>
                    </Card>
                )}
                 <Button variant="outline" className="w-full mt-4" onClick={() => setPlayerSearchOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Player
                </Button>
            </TabsContent>
            <TabsContent value="leaderboard" className="mt-4">
                <Card>
                    <CardContent className="p-2">
                        <Tabs defaultValue="batter" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="batter"><Star className="mr-2 h-4 w-4" />Batter</TabsTrigger>
                                <TabsTrigger value="bowler"><ShieldAlert className="mr-2 h-4 w-4" />Bowler</TabsTrigger>
                                <TabsTrigger value="all-rounder"><Award className="mr-2 h-4 w-4" />All-rounder</TabsTrigger>
                                <TabsTrigger value="fielder"><UserIcon className="mr-2 h-4 w-4" />Fielder</TabsTrigger>
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
        </Tabs>
      </main>
    </div>
  );
}

export default EditTeamPage;
