
'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, Users, ArrowLeft, Trophy } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { Team, UserProfile } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { PlayerSearchDialog } from '@/components/player-search-dialog';


const playerSchema = z.object({
  id: z.string(), // This will be the user's uid
  name: z.string().min(1, "Player name can't be empty"),
});

const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required.'),
  players: z.array(playerSchema).min(2, 'At least 2 players are required.'),
});

type TeamFormValues = z.infer<typeof teamSchema>;


function EditTeamPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isPlayerSearchOpen, setPlayerSearchOpen] = useState(false);
  const [originalTeamName, setOriginalTeamName] = useState('');
  
  const teamId = params.teamId as string;
  
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      players: [],
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (teamId && user) {
        const fetchTeam = async () => {
            const teamDocRef = doc(db, "teams", teamId);
            const docSnap = await getDoc(teamDocRef);
            if (docSnap.exists()) {
                const teamData = docSnap.data() as Team;
                if (teamData.userId && user && teamData.userId !== user.uid) {
                    toast({ title: "Unauthorized", description: "You do not have permission to edit this team.", variant: "destructive" });
                    router.push('/teams');
                    return;
                }
                form.reset(teamData);
                setOriginalTeamName(teamData.name);
            } else {
                toast({ title: "Error", description: "Team not found.", variant: "destructive" });
                router.push('/teams');
            }
        };
        fetchTeam();
    }
  }, [teamId, form, router, toast, user]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "players",
  });

  const onSubmit = async (data: TeamFormValues) => {
    if (!user) {
        toast({ title: "Not Authenticated", description: "You must be logged in to edit a team.", variant: "destructive" });
        return;
    }
    
    const teamDataWithUser = { ...data, userId: user.uid };

    try {
        await setDoc(doc(db, "teams", teamId), teamDataWithUser, { merge: true });
        toast({
            title: "Team Updated!",
            description: `Team "${data.name}" has been updated successfully.`,
        });
        router.push('/teams');
    } catch (e) {
        console.error("Error updating document: ", e);
        toast({ title: "Error", description: "Could not update team.", variant: "destructive" });
    }
  };

  const handlePlayerSelect = (player: UserProfile) => {
    const isAlreadyAdded = fields.some(p => p.id === player.uid);
    if (isAlreadyAdded) {
        toast({ title: "Player already in team", variant: 'destructive' });
        return;
    }
    append({ id: player.uid, name: player.name });
  };
  

  return (
    <div className="min-h-screen bg-gray-50 text-foreground font-body">
       <PlayerSearchDialog open={isPlayerSearchOpen} onOpenChange={setPlayerSearchOpen} onPlayerSelect={handlePlayerSelect} />
       <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm">
         <Button variant="ghost" size="icon" onClick={() => router.push('/teams')}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className='flex flex-col items-center'>
            <h1 className="text-2xl font-bold">Edit Team</h1>
            <p className="text-sm text-muted-foreground">{originalTeamName}</p>
          </div>
           <Link href="/teams/create">
            <Button variant="ghost" size="icon">
                <Plus className="h-6 w-6" />
            </Button>
           </Link>
      </header>
      <main className="p-4 md:p-8 flex justify-center">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                    <Users className="h-6 w-6 text-primary" />
                    Team Details
                </CardTitle>
                <CardDescription>Edit your team's name and players.</CardDescription>
            </CardHeader>
            <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="team-name">Team Name</Label>
                    <Input id="team-name" {...form.register('name')} placeholder="e.g., Royal Challengers" />
                    {form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label>Players</Label>
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                        <Input
                            value={field.name}
                            readOnly
                            placeholder={`Player ${index + 1}`}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                        >
                            <Trash2 className="h-5 w-5 text-gray-500" />
                        </Button>
                        </div>
                    ))}
                     {form.formState.errors.players && <p className="text-destructive text-sm">{form.formState.errors.players.message || form.formState.errors.players.root?.message}</p>}
                </div>

                <Button type="button" variant="outline" onClick={() => setPlayerSearchOpen(true)} className='w-full'>
                    <Plus className="mr-2 h-4 w-4" /> Add Player
                </Button>

                <Button type="submit" className="w-full text-lg py-6">Save Changes</Button>
            </form>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default EditTeamPage;
