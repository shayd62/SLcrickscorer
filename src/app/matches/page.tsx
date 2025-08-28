
'use client';
import withAuth from "@/components/with-auth";
import { useAuth } from "@/contexts/auth-context";
import type { MatchState, Tournament, TournamentMatch } from "@/lib/types";
import { collection, onSnapshot, query, where, doc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, User, LogOut, Home as HomeIcon, Settings, Trophy, Users as UsersIcon, Trash2, Gamepad2, Radio, Calendar, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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

function ActiveMatchCard({ match, onDelete, currentUserId }: { match: MatchState, onDelete: (matchId: string) => void, currentUserId?: string }) {
  const router = useRouter();
  const { config } = match;

  const isCreator = match.userId === currentUserId;
  
  const handleNavigation = () => {
    if (isCreator) {
      router.push(`/scoring/${match.id}`);
    } else {
      router.push(`/scorecard/${match.id}`);
    }
  };

  return (
    <Card className="p-4 flex flex-col gap-3 rounded-2xl shadow-sm">
      <div className="flex justify-between items-center text-center">
        <div className="flex-1">
          <p className="font-bold text-lg">{config.team1.name}</p>
        </div>
        <p className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded-full">VS</p>
        <div className="flex-1">
          <p className="font-bold text-lg">{config.team2.name}</p>
        </div>
      </div>
       <div className="flex justify-between text-sm text-muted-foreground text-center">
         <p className="flex-1">{config.oversPerInnings} Overs Match</p>
         <p className="flex-1">{config.playersPerSide} Players per Side</p>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Button onClick={handleNavigation} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg">
          {isCreator ? 'Resume' : 'View Scorecard'}
        </Button>
        {isCreator && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" className="rounded-lg">
                <Trash2 className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the match.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(match.id!)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </Card>
  );
}

function UpcomingMatchCard({ match, tournamentName }: { match: TournamentMatch, tournamentName: string }) {
  const router = useRouter();

  const matchDate = new Date(match.date || 0);

  return (
    <Card className="p-4 flex flex-col gap-3 rounded-2xl shadow-sm bg-secondary/40">
      <div className="flex justify-between items-center text-center">
        <div className="flex-1">
          <p className="font-bold text-lg">{match.team1}</p>
        </div>
        <p className="text-sm text-muted-foreground bg-primary/20 px-2 py-1 rounded-full">VS</p>
        <div className="flex-1">
          <p className="font-bold text-lg">{match.team2}</p>
        </div>
      </div>
      <div className="text-center text-muted-foreground space-y-1 mt-2">
        <p className="font-semibold text-sm text-foreground">{tournamentName}</p>
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4"/> {matchDate.toLocaleDateString()}</div>
          <div className="flex items-center gap-1.5"><Clock className="h-4 w-4"/> {matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
    </Card>
  );
}

function RecentResultCard({ match, onDelete, currentUserId }: { match: MatchState, onDelete: (matchId: string) => void, currentUserId?: string }) {
    const { config, resultText } = match;
    const router = useRouter();
    const isCreator = match.userId === currentUserId;
    
    return (
        <Card className="p-4 bg-secondary/50 rounded-2xl transition-all hover:bg-secondary/70">
            <div className="flex justify-between items-start">
                <div className="flex-grow space-y-2 cursor-pointer" onClick={() => router.push(`/scorecard/${match.id}`)}>
                    <h3 className="font-semibold text-foreground">{config.team1.name} vs {config.team2.name}</h3>
                    <div className="text-sm text-muted-foreground">
                        <p><span className='font-medium text-foreground'>{resultText}</span></p>
                    </div>
                </div>
                 {isCreator && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Trash2 className="h-5 w-5 text-destructive" />
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this match record.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(match.id!)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                 )}
            </div>
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
          {navItemsRight.map((item) => (
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
        
        const completedQuery = query(collection(db, "matches"), where("matchOver", "==", true));
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
                <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <User className="h-6 w-6" />
                        <span className="font-semibold">{user?.displayName || user?.email || 'User'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <Link href="/tournaments">
                            <Button variant="ghost" size="icon">
                                <Trophy className="h-6 w-6" />
                            </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={logout}>
                            <LogOut className="h-6 w-6" />
                        </Button>
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

    

    
