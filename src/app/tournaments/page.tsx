
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, ArrowLeft, Shield, Trash2, Pencil, Share2 } from 'lucide-react';
import type { Tournament } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog"
import { useAuth } from '@/contexts/auth-context';

function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchTournaments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, "tournaments"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const tournamentData = querySnapshot.docs.map(doc => ({ ...doc.data() as Tournament, id: doc.id }));
      setTournaments(tournamentData);
    } catch (e) {
      console.error("Failed to load tournaments from Firestore", e);
      toast({ title: "Error", description: "Could not load tournaments.", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchTournaments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDeleteTournament = async (tournamentId: string) => {
    try {
        await deleteDoc(doc(db, "tournaments", tournamentId));
        toast({
            title: "Tournament Deleted!",
            description: `The tournament has been deleted.`,
            variant: 'destructive',
        });
        fetchTournaments();
    } catch (e) {
        console.error("Error deleting tournament:", e);
        toast({ title: "Error", description: "Could not delete the tournament.", variant: "destructive" });
    }
  };

  const handleEditTournament = (tournamentId: string) => {
    router.push(`/tournaments/edit/${tournamentId}`);
  };
  
  const handleShareTournament = (tournamentId: string) => {
    const url = `${window.location.origin}/tournaments/invite/${tournamentId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied!",
      description: "Tournament invite link has been copied to your clipboard.",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground font-body">
      <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
        <Button variant="ghost" size="icon" onClick={() => router.push('/matches')}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className='flex flex-col items-center'>
          <h1 className="text-2xl font-bold">Tournaments</h1>
          <p className="text-sm text-muted-foreground">Manage your competitions</p>
        </div>
        <Link href="/tournaments/create">
            <Button variant="ghost" size="icon">
                <Plus className="h-6 w-6" />
            </Button>
        </Link>
      </header>
      <main className="p-4 md:p-8">
        {loading && <p>Loading tournaments...</p>}
        {!loading && tournaments.length === 0 ? (
          <div className="text-center py-16">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="mt-2 text-lg font-medium">No tournaments found</h2>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new tournament.</p>
            <div className="mt-6">
              <Link href="/tournaments/create">
                <Button>
                  <Plus className="-ml-1 mr-2 h-5 w-5" />
                  Create Tournament
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((tournament) => (
              <Card key={tournament.id} className="flex flex-col rounded-xl shadow-md transition-all hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <Link href={`/tournaments/${tournament.id}`} className="hover:underline">
                        <span>{tournament.name}</span>
                    </Link>
                     <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditTournament(tournament.id)}>
                        <Pencil className="h-5 w-5 text-muted-foreground" />
                      </Button>
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
                              This action cannot be undone. This will permanently delete the tournament "{tournament.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTournament(tournament.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardTitle>
                  <CardDescription>{new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-between">
                    <div>
                        <p className="text-sm font-medium">{(tournament.participatingTeams?.length || 0)} teams participating</p>
                        <ul className="text-sm text-muted-foreground list-disc pl-5 mt-1">
                            {(tournament.participatingTeams || []).slice(0, 3).map(t => <li key={t}>{t}</li>)}
                            {(tournament.participatingTeams?.length || 0) > 3 && <li>...and more</li>}
                        </ul>
                    </div>
                    <Button variant="outline" className="w-full mt-4" onClick={() => handleShareTournament(tournament.id)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share Invite Link
                    </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default TournamentsPage;
