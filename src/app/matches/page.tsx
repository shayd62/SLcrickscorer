

'use client';
import withAuth from "@/components/with-auth";
import { useAuth } from "@/contexts/auth-context";
import type { MatchState, Tournament, TournamentMatch } from "@/lib/types";
import { collection, onSnapshot, query, where, doc, deleteDoc, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, User, LogOut, Home as HomeIcon, Settings, Trophy, Users as UsersIcon, Trash2, Gamepad2, Radio, Calendar, Clock, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
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
import { Badge } from "@/components/ui/badge";
import { SettingsSheet } from "@/components/settings-sheet";

const formatOvers = (balls: number, ballsPerOver: number = 6) => {
    if (balls === 0) return "0.0";
    const overs = Math.floor(balls / ballsPerOver);
    const ballsInOver = balls % ballsPerOver;
    return `${overs}.${ballsInOver}`;
};

function ActiveMatchCard({ match, onDelete, currentUserId }: { match: MatchState, onDelete: (matchId: string) => void, currentUserId?: string }) {
  const router = useRouter();
  const { config, innings1, innings2, target } = match;

  const isCreator = match.userId === currentUserId;
  
  const handleNavigation = () => {
    if (isCreator) {
      router.push(`/scoring/${match.id}`);
    } else {
      router.push(`/scorecard/${match.id}`);
    }
  };

  const firstBattingTeamKey = innings1.battingTeam;
  const secondBattingTeamKey = firstBattingTeamKey === 'team1' ? 'team2' : 'team1';

  const firstBattingTeamInfo = config[firstBattingTeamKey];
  const secondBattingTeamInfo = config[secondBattingTeamKey];

  const firstBattingData = {
      score: innings1.score,
      wickets: innings1.wickets,
      overs: formatOvers(innings1.balls, config.ballsPerOver)
  };

  const secondBattingData = innings2 ? {
      score: innings2.score,
      wickets: innings2.wickets,
      overs: formatOvers(innings2.balls, config.ballsPerOver)
  } : { score: 0, wickets: 0, overs: '0.0' };


  const runsNeeded = target && innings2 ? target - innings2.score : 0;
  const chasingTeam = innings2 ? (innings2.battingTeam === 'team1' ? config.team1 : config.team2) : null;
  
  const tossWinner = config.toss.winner === 'team1' ? config.team1.name : config.team2.name;
  const tossResult = `${tossWinner} won the toss and chose to ${config.toss.decision}.`;


  return (
    <Card className="rounded-lg shadow-sm cursor-pointer" onClick={handleNavigation}>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">{config.tournamentId ? `${config.matchNumber || '1st'} ${config.matchFormat || 'ODI'} • ${config.tournamentId}` : `Friendly Match • ${config.oversPerInnings} Overs`}</p>
            <Badge variant="outline" className="text-primary border-primary">{config.matchFormat || 'ODI'}</Badge>
        </div>
        
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                     <Image src="https://picsum.photos/seed/sl-flag/24/16" width={24} height={16} alt={`${firstBattingTeamInfo.shortName} flag`} className="rounded-sm" data-ai-hint="sri lanka flag" />
                    <span className="font-semibold text-lg">{firstBattingTeamInfo.shortName || firstBattingTeamInfo.name}</span>
                </div>
                <div className="font-bold text-lg">{firstBattingData.score}-{firstBattingData.wickets} <span className="font-normal text-muted-foreground">({firstBattingData.overs})</span></div>
            </div>
            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                     <Image src="https://picsum.photos/seed/zim-flag/24/16" width={24} height={16} alt={`${secondBattingTeamInfo.shortName} flag`} className="rounded-sm" data-ai-hint="zimbabwe flag" />
                    <span className="font-semibold text-lg">{secondBattingTeamInfo.shortName || secondBattingTeamInfo.name}</span>
                </div>
                <div className="font-bold text-lg">{secondBattingData.score}-{secondBattingData.wickets} <span className="font-normal text-muted-foreground">({secondBattingData.overs})</span></div>
            </div>
        </div>

        {innings2 && runsNeeded > 0 && chasingTeam ? (
             <p className="text-sm text-destructive font-medium pt-1 border-t">{chasingTeam.name} need {runsNeeded} runs to win</p>
        ) : (
            <p className="text-sm text-muted-foreground pt-1 border-t">{tossResult}</p>
        )}
      </CardContent>
       {isCreator && (
            <div className="p-2 border-t flex justify-end">
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                        This will permanently delete this match.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(match.id!)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )}
    </Card>
  );
}

function UpcomingMatchCard({ match, tournamentName }: { match: TournamentMatch, tournamentName: string }) {
  const router = useRouter();

  const matchDate = new Date(match.date || 0);

  return (
    <Card className="p-4 flex flex-col gap-3 rounded-2xl shadow-sm bg-secondary/40">
      <div className="text-center text-xs text-muted-foreground">
         {tournamentName} - Match {match.id.slice(-4)}
      </div>
      <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
              <Image src="https://picsum.photos/seed/teamA/32/32" width={32} height={32} alt={`${match.team1} flag`} className="rounded-full" data-ai-hint="cricket logo" />
              <span className="font-semibold text-base">{match.team1}</span>
          </div>
          <div className="flex items-center gap-3">
               <Image src="https://picsum.photos/seed/teamB/32/32" width={32} height={32} alt={`${match.team2} flag`} className="rounded-full" data-ai-hint="cricket logo" />
              <span className="font-semibold text-base">{match.team2}</span>
          </div>
      </div>
      <div className="text-center text-muted-foreground space-y-1 mt-2">
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4"/> {matchDate.toLocaleDateString()}</div>
          <div className="flex items-center gap-1.5"><Clock className="h-4 w-4"/> {matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
    </Card>
  );
}

function RecentResultCard({ match, onDelete, currentUserId }: { match: MatchState, onDelete: (matchId: string) => void, currentUserId?: string }) {
    const { config, innings1, innings2, target, resultText } = match;
    const router = useRouter();
    const isCreator = match.userId === currentUserId;

    const winnerKey = match.winner;
    
    // Determine which team batted first
    const firstInningsTeamKey = innings1.battingTeam;
    const secondInningsTeamKey = firstInningsTeamKey === 'team1' ? 'team2' : 'team1';

    const firstInningsTeamInfo = config[firstInningsTeamKey];
    const secondInningsTeamInfo = config[secondInningsTeamKey];

    const firstInningsIsWinner = winnerKey === firstInningsTeamKey;
    const secondInningsIsWinner = winnerKey === secondInningsTeamKey;

    const firstInningsScore = {
        score: innings1.score,
        wickets: innings1.wickets,
    };
    
    const secondInningsScore = innings2 ? {
        score: innings2.score,
        wickets: innings2.wickets,
        overs: formatOvers(innings2.balls, config.ballsPerOver),
    } : { score: 0, wickets: 0, overs: '0.0' };


    return (
        <Card className="rounded-lg shadow-sm cursor-pointer" onClick={() => router.push(`/match-analysis/${match.id}`)}>
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center text-primary font-semibold">
                    <p>{config.tournamentId || 'Friendly Match'}</p>
                    <ChevronRight className="h-5 w-5"/>
                </div>
                 <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">RESULT</span> • {config.matchNumber ? `${config.matchNumber}th Match,` : ''} {config.venue ? `${config.venue},` : ''} {config.matchDate ? new Date(config.matchDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                </div>
                
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Image src="https://picsum.photos/seed/t1-flag/24/16" width={24} height={16} alt={`${firstInningsTeamInfo.name} flag`} className="rounded-sm" data-ai-hint="cricket team" />
                            <span className={cn("text-lg", firstInningsIsWinner && "font-bold")}>{firstInningsTeamInfo.name}</span>
                        </div>
                        <div className="font-bold text-lg">{firstInningsScore.score}/{firstInningsScore.wickets}</div>
                    </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                             <Image src="https://picsum.photos/seed/t2-flag/24/16" width={24} height={16} alt={`${secondInningsTeamInfo.name} flag`} className="rounded-sm" data-ai-hint="cricket team" />
                            <span className={cn("text-lg", secondInningsIsWinner && "font-bold")}>{secondInningsTeamInfo.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                             {innings2 && <span className="font-normal text-muted-foreground text-sm">({secondInningsScore.overs}/{config.oversPerInnings} ov, T:{target})</span>}
                             <span className="font-bold text-lg">{secondInningsScore.score}/{secondInningsScore.wickets}</span>
                        </div>
                    </div>
                </div>

                <p className="text-sm font-medium pt-2">{resultText}</p>
                 {isCreator && (
                    <div className="p-2 border-t flex justify-end -mb-4 -mx-4">
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This will permanently delete this match.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(match.id!)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function BottomNav() {
  const navItemsLeft = [
    { name: 'Home', icon: HomeIcon, href: '/matches', active: true },
    { name: 'Tournament', icon: Trophy, href: '/tournaments', active: false },
  ];
  const navItemsRight = [
    { name: 'My Game', icon: Gamepad2, href: '/my-game', active: false },
    { name: 'Settings', icon: Settings, href: '/profile', active: false },
  ];
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg md:hidden h-16">
      <div className="flex justify-between items-center h-full">
        <div className="flex justify-around w-2/5">
          {navItemsLeft.map((item) => (
            <Link href={item.href} key={item.name}>
              <div
                className={cn(
                  'flex flex-col items-center gap-1 text-muted-foreground',
                  item.active && 'text-primary'
                )}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-xs font-medium">{item.name}</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="w-1/5 flex justify-center">
            <Link href="/setup">
                <Button size="icon" className="rounded-full w-14 h-14 -translate-y-4 shadow-lg bg-primary hover:bg-primary/90">
                    <Plus className="h-8 w-8" />
                </Button>
            </Link>
        </div>
        <div className="flex justify-around w-2/5">
            <Link href={'/my-game'}>
              <div
                className={cn('flex flex-col items-center gap-1 text-muted-foreground')}
              >
                <Gamepad2 className="h-6 w-6" />
                <span className="text-xs font-medium">My Game</span>
              </div>
            </Link>
            <SettingsSheet />
        </div>
      </div>
    </footer>
  );
}


function HomePage() {
    const { user, logout } = useAuth();
    const [activeMatches, setActiveMatches] = useState<MatchState[]>([]);
    const [completedMatches, setCompletedMatches] = useState<MatchState[]>([]);
    const [upcomingMatches, setUpcomingMatches] = useState<{ match: TournamentMatch, tournamentName: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        setLoading(true);

        const liveQuery = query(collection(db, "matches"), where("matchOver", "==", false));
        const liveUnsubscribe = onSnapshot(liveQuery, (querySnapshot) => {
            const liveMatchesData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MatchState));
            setActiveMatches(liveMatchesData);
            setLoading(false);
        }, (error) => {
            console.error("Failed to fetch live matches:", error);
            setLoading(false);
        });
        
        const completedQuery = query(collection(db, "matches"), where("matchOver", "==", true), orderBy("endTime", "desc"));
        const completedUnsubscribe = onSnapshot(completedQuery, (querySnapshot) => {
            const completedMatchesData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MatchState));
            setCompletedMatches(completedMatchesData);
        }, (error) => {
            console.error("Failed to fetch completed matches:", error);
        });
        
        const fetchUpcomingMatches = async () => {
            const tournamentsQuery = query(collection(db, "tournaments"));
            const tournamentsSnapshot = await getDocs(tournamentsQuery);
            const allUpcoming: { match: TournamentMatch, tournamentName: string }[] = [];
            tournamentsSnapshot.forEach(doc => {
                const tournament = doc.data() as Tournament;
                if (tournament.matches) {
                    const upcoming = tournament.matches
                        .filter(m => m.status === 'Upcoming')
                        .map(m => ({ match: m, tournamentName: tournament.name }));
                    allUpcoming.push(...upcoming);
                }
            });
            allUpcoming.sort((a, b) => new Date(a.match.date || 0).getTime() - new Date(b.match.date || 0).getTime());
            setUpcomingMatches(allUpcoming);
        };

        fetchUpcomingMatches();


        return () => {
            liveUnsubscribe();
            completedUnsubscribe();
        };

    }, [user]);

    const handleDeleteMatch = async (matchId: string) => {
      try {
        await deleteDoc(doc(db, 'matches', matchId));
        toast({
          title: "Match Deleted",
          description: "The match has been successfully deleted.",
        });
      } catch (error) {
        console.error("Error deleting match: ", error);
        toast({
          title: "Error",
          description: "Failed to delete the match. Please try again.",
          variant: "destructive",
        });
      }
    };

    if (!user && loading) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <p>Loading...</p>
          </div>
        );
    }
  
    return (
        <div className="min-h-screen bg-secondary/30 text-foreground flex flex-col items-center font-sans">
            <div className="w-full max-w-md mx-auto p-4 pb-24">
                <header className="py-4 px-4 md:px-6 flex items-center justify-center text-center bg-[#2C3E50] text-white rounded-b-2xl">
                    <div className='flex flex-col items-center'>
                        <h1 className="text-2xl font-bold">
                        <span className="text-red-500">SL</span>
                        <span className="text-green-500">cricscorer</span>
                        </h1>
                        <p className="text-sm text-gray-300">Professional Match Scoring</p>
                    </div>
                </header>
                
                <main className="space-y-6 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/setup">
                            <Button className="w-full h-20 text-lg" variant="outline">
                                <Plus className="mr-2 h-6 w-6" />
                                Create New Match
                            </Button>
                        </Link>
                        <Link href="/teams">
                             <Button className="w-full h-20 text-lg" variant="outline">
                                <UsersIcon className="mr-2 h-6 w-6" />
                                My Teams
                            </Button>
                        </Link>
                    </div>

                    <Tabs defaultValue="live" className="w-full pt-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="live">Live</TabsTrigger>
                            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                            <TabsTrigger value="past">Past</TabsTrigger>
                        </TabsList>
                        <TabsContent value="live" className="mt-4 space-y-4">
                            {loading && <p>Loading matches...</p>}
                            {!loading && activeMatches.length === 0 && (
                                <Card className="p-8 text-center text-muted-foreground rounded-2xl">
                                    No live matches. Start a new one!
                                </Card>
                            )}
                            {activeMatches.map(match => (
                                <ActiveMatchCard key={match.id} match={match} onDelete={handleDeleteMatch} currentUserId={user?.uid} />
                            ))}
                        </TabsContent>
                        <TabsContent value="upcoming" className="mt-4 space-y-4">
                             {loading && <p>Loading matches...</p>}
                             {!loading && upcomingMatches.length === 0 && (
                                <Card className="p-8 text-center text-muted-foreground rounded-2xl">
                                    No upcoming matches found.
                                </Card>
                             )}
                             {upcomingMatches.map(({match, tournamentName}) => (
                                <UpcomingMatchCard key={match.id} match={match} tournamentName={tournamentName} />
                             ))}
                        </TabsContent>
                         <TabsContent value="past" className="mt-4 space-y-4">
                             {loading && <p>Loading matches...</p>}
                             {!loading && completedMatches.length === 0 && (
                                <Card className="p-8 text-center text-muted-foreground rounded-2xl">
                                    No completed matches yet.
                                </Card>
                             )}
                             {completedMatches.map(match => (
                                <RecentResultCard key={match.id} match={match} onDelete={handleDeleteMatch} currentUserId={user?.uid} />
                             ))}
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
            <BottomNav />
        </div>
    );
}

export default withAuth(HomePage);

    
