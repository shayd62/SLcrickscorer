
'use client';

import { useState, useEffect } from 'react';
import type { Team } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Trash2, Users, ArrowLeft, Plus, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const loadTeams = async () => {
    if (!user) return;
     try {
      const q = query(collection(db, "teams"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const savedTeams = querySnapshot.docs.map(doc => ({ ...doc.data() as Omit<Team, 'id'>, id: doc.id }));
      setTeams(savedTeams);
    } catch (e) {
      console.error("Failed to load teams from firestore", e);
    }
  }
  
  useEffect(() => {
    if (user) {
      loadTeams();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    try {
        await deleteDoc(doc(db, "teams", teamId));
        toast({
            title: "Team Deleted!",
            description: `Team "${teamName}" has been deleted.`,
            variant: 'destructive',
        });
        loadTeams();
    } catch (e) {
        console.error("Error deleting team:", e);
        toast({ title: "Error", description: "Could not delete team.", variant: "destructive" });
    }
  };
  
  const handleEditTeam = (teamId: string) => {
    router.push(`/teams/edit/${teamId}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground font-body">
      <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={() => router.push('/matches')}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className='flex flex-col items-center'>
          <h1 className="text-2xl font-bold">My Teams</h1>
          <p className="text-sm text-muted-foreground">View and manage your saved teams</p>
        </div>
        <Link href="/teams/create">
            <Button variant="ghost" size="icon">
                <Plus className="h-6 w-6" />
            </Button>
        </Link>
      </header>
      <main className="p-4 md:p-8">
        {teams.length === 0 ? (
          <div className="text-center py-16">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="mt-2 text-lg font-medium text-gray-900">No teams found</h2>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new team.</p>
            <div className="mt-6">
              <Button onClick={() => router.push('/teams/create')}>
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Create Team
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card key={team.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{team.name}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditTeam(team.id)}>
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
                              This action cannot be undone. This will permanently delete the team "{team.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTeam(team.id, team.name)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-1 text-sm text-muted-foreground h-48 overflow-y-auto">
                    {team.players.map((p, i) => <li key={p.id || `${team.name}-player-${i}`}>{p.name}</li>)}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


export default TeamsPage;
