
'use client';
import withAuth from "@/components/with-auth";
import { useAuth } from "@/contexts/auth-context";
import type { MatchState } from "@/lib/types";
import { collection, onSnapshot, query, where, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, User, LogOut, Home as HomeIcon, BarChart3, Trophy, Users as UsersIcon, Trash2, Gamepad2, Radio } from "lucide-react";
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

function ActiveMatchCard({ match, onDelete }: { match: MatchState, onDelete: (matchId: string) => void }) {
  const router = useRouter();
  const { config } = match;

  const handleResume = () => {
    router.push(`/scoring/${match.id}`);
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
        <Button onClick={handleResume} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg">
          Resume
        </Button>
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
      </div>
    </Card>
  );
}

function RecentResultCard({ match, onDelete }: { match: MatchState, onDelete: (matchId: string) => void }) {
    const { config, resultText } = match;
    const router = useRouter();
    
    return (
        <Card className="p-4 bg-secondary/50 rounded-2xl transition-all hover:bg-secondary/70">
            <div className="flex justify-between items-start">
                <div className="flex-grow space-y-2 cursor-pointer" onClick={() => router.push(`/scorecard/${match.id}`)}>
                    <h3 className="font-semibold text-foreground">{config.team1.name} vs {config.team2.name}</h3>
                    <div className="text-sm text-muted-foreground">
                        <p><span className='font-medium text-foreground'>{resultText}</span></p>
                    </div>
                </div>
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
            </div>
        </Card>
    );
}

function BottomNav() {
  const navItems = [
    { name: 'Home', icon: HomeIcon, href: '/matches', active: true },
    { name: 'Scorecard', icon: BarChart3, href: '#', active: false },
    { name: 'My Game', icon: Gamepad2, href: '/my-game', active: false },
    { name: 'Matches', icon: Trophy, href: '/tournaments', active: false },
  ];
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
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
    </footer>
  );
}


function HomePage() {
    const { user, logout } = useAuth();
    const [activeMatches, setActiveMatches] = useState<MatchState[]>([]);
    const [completedMatches, setCompletedMatches] = useState<MatchState[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (!user) return;

        setLoading(true);
        const q = query(collection(db, "matches"), where("userId", "==", user.uid));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const matches = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MatchState));
            
            const active = matches.filter(m => !m.matchOver);
            const completed = matches.filter(m => m.matchOver);
            
            setActiveMatches(active);
            setCompletedMatches(completed);
            setLoading(false);
        }, (error) => {
            console.error("Failed to fetch matches:", error);
            setLoading(false);
        });

        return () => unsubscribe();

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

    if (!user) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <p>Loading user...</p>
          </div>
        );
    }
  
    return (
        <div className="min-h-screen bg-secondary/30 text-foreground flex flex-col items-center font-sans">
            <div className="w-full max-w-md mx-auto p-4 pb-24">
                <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <User className="h-6 w-6" />
                        <span className="font-semibold">{user.displayName || user.email || 'User'}</span>
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
                                <ActiveMatchCard key={match.id} match={match} onDelete={handleDeleteMatch} />
                            ))}
                        </TabsContent>
                        <TabsContent value="upcoming" className="mt-4">
                             <Card>
                                <CardContent className="p-6 text-center text-muted-foreground">
                                    <p>No upcoming matches found.</p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                         <TabsContent value="past" className="mt-4 space-y-4">
                             {!loading && completedMatches.length === 0 && (
                                <Card className="p-8 text-center text-muted-foreground rounded-2xl">
                                    No completed matches yet.
                                </Card>
                             )}
                             {completedMatches.map(match => (
                                <RecentResultCard key={match.id} match={match} onDelete={handleDeleteMatch} />
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

    