
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, Users, ArrowLeft, Trophy, MapPin } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { Team, UserProfile } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
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


function EditTeamPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  
  const teamId = params.teamId as string;
  
  useEffect(() => {
    if (teamId && user) {
        const fetchTeam = async () => {
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
            } else {
                toast({ title: "Error", description: "Team not found.", variant: "destructive" });
                router.push('/teams');
            }
        };
        fetchTeam();
    }
  }, [teamId, router, toast, user]);

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

  if (!team) {
    return <div className="flex justify-center items-center h-screen">Loading team...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground font-body">
       <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm">
         <Button variant="ghost" size="icon" onClick={() => router.push('/teams')}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className='flex flex-col items-center'>
            <h1 className="text-xl font-bold">{team.name}</h1>
          </div>
          <div className="w-10"></div>
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
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="matches">Matches</TabsTrigger>
                <TabsTrigger value="players">Players</TabsTrigger>
            </TabsList>
            <TabsContent value="matches" className="mt-4">
                <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                        No matches played yet.
                    </CardContent>
                </Card>
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
            </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default EditTeamPage;
