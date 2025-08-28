
'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, Users, ArrowLeft, Trophy, Search } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { Team, UserProfile } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const playerSchema = z.object({
  id: z.string(), // This will be the user's uid
  name: z.string().min(1, "Player name can't be empty"),
});

const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required.'),
  players: z.array(playerSchema).min(2, 'At least 2 players are required.'),
});

type TeamFormValues = z.infer<typeof teamSchema>;

function PlayerSearchDialog({ onPlayerSelect, onOpenChange, open }: { open: boolean, onOpenChange: (open: boolean) => void, onPlayerSelect: (player: UserProfile) => void }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const { searchUsers } = useAuth();

    const handleSearch = async () => {
        if (searchTerm.trim().length < 3) {
            setSearchResults([]);
            return;
        }
        setLoading(true);
        const results = await searchUsers(searchTerm);
        setSearchResults(results);
        setLoading(false);
    };

    const handlePlayerSelect = (player: UserProfile) => {
        onPlayerSelect(player);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Search for a Player</DialogTitle>
                    <DialogDescription>Search by name or phone number.</DialogDescription>
                </DialogHeader>
                <div className="flex gap-2">
                    <Input 
                        placeholder="Enter name or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Button onClick={handleSearch} disabled={loading}>
                        <Search className="h-4 w-4" />
                    </Button>
                </div>
                <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                    {loading && <p>Searching...</p>}
                    {!loading && searchResults.length === 0 && searchTerm.length > 2 && <p>No players found.</p>}
                    {searchResults.map(player => (
                        <div key={player.uid} className="flex items-center justify-between p-2 border rounded-md">
                            <div>
                                <p className="font-semibold">{player.name}</p>
                                <p className="text-sm text-muted-foreground">{player.phoneNumber}</p>
                            </div>
                            <Button size="sm" onClick={() => handlePlayerSelect(player)}>Add</Button>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function EditTeamPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isPlayerSearchOpen, setPlayerSearchOpen] = useState(false);
  
  const teamId = params.teamId as string;
  const originalTeamName = teamId.replace(/-/g, ' ');

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
        const teamKey = `team-${teamId}`;
        const fetchTeam = async () => {
            const teamDocRef = doc(db, "teams", teamKey);
            const docSnap = await getDoc(teamDocRef);
            if (docSnap.exists()) {
                const teamData = docSnap.data() as Team;
                if (teamData.userId && user && teamData.userId !== user.uid) {
                    toast({ title: "Unauthorized", description: "You do not have permission to edit this team.", variant: "destructive" });
                    router.push('/teams');
                    return;
                }
                form.reset(teamData);
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
    const oldTeamKey = `team-${originalTeamName.replace(/\s/g, '-')}`;
    const newTeamKey = `team-${data.name.replace(/\s/g, '-')}`;
    const teamDataWithUser = { ...data, userId: user.uid };

    try {
        if (oldTeamKey !== newTeamKey) {
            await deleteDoc(doc(db, "teams", oldTeamKey));
        }
        await setDoc(doc(db, "teams", newTeamKey), teamDataWithUser);
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

                <PlayerSearchDialog open={isPlayerSearchOpen} onOpenChange={setPlayerSearchOpen} onPlayerSelect={handlePlayerSelect} />
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
