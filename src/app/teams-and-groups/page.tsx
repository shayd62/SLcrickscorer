
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray }_from_ 'react-hook-form';
import { zodResolver } _from_ '@hookform/resolvers/zod';
import *_as_ z _from_ 'zod';
import { Button } _from_ '@/components/ui/button';
import { Input } _from_ '@/components/ui/input';
import { Label } _from_ '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } _from_ '@/components/ui/card';
import { Plus, Trash2, Users, ArrowLeft, Layers } _from_ 'lucide-react';
import { useRouter } _from_ 'next/navigation';
import { useToast } _from_ '@/hooks/use-toast';
import { db } _from_ '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, addDoc } _from_ 'firebase/firestore';
import { useAuth } _from_ '@/contexts/auth-context';
import type { Team, Group } _from_ '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} _from_ "@/components/ui/dialog";

const playerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Player name can't be empty"),
});

const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required.'),
  shortName: z.string().min(1, 'Short name is required.').max(5, 'Short name max 5 chars.'),
  players: z.array(playerSchema).min(2, 'At least 2 players are required.'),
});
type TeamFormValues = z.infer<typeof teamSchema>;

const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required.'),
});
type GroupFormValues = z.infer<typeof groupSchema>;


function AddTeamDialog({ onTeamCreated }: { onTeamCreated: (teamId: string) => void }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    
    const form = useForm<TeamFormValues>({
        resolver: zodResolver(teamSchema),
        defaultValues: {
            name: '',
            shortName: '',
            players: [{ id: `player-${Date.now()}-0`, name: '' }, { id: `player-${Date.now()}-1`, name: '' }],
        },
        mode: 'onChange',
    });

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "players" });

    const onSubmit = async (data: TeamFormValues) => {
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in to create a team.", variant: "destructive" });
            return;
        }
        
        try {
            const newTeamRef = await addDoc(collection(db, "teams"), { ...data, userId: user.uid });
            toast({ title: "Team Created!", description: `Team "${data.name}" has been created.` });
            onTeamCreated(newTeamRef.id);
            setOpen(false);
            form.reset();
        } catch (e) {
            console.error("Error adding document: ", e);
            toast({ title: "Error", description: "Could not create team.", variant: 'destructive' });
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className='w-full'><Plus className="mr-2 h-4 w-4"/> Add Team</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a New Team</DialogTitle>
                    <DialogDescription>Enter the details for your new team below.</DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="team-name">Team Name</Label>
                            <Input id="team-name" {...form.register('name')} placeholder="e.g., Royal Challengers" />
                            {form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="short-name">Short Name</Label>
                            <Input id="short-name" {...form.register('shortName')} placeholder="e.g., RCB" />
                            {form.formState.errors.shortName && <p className="text-destructive text-sm">{form.formState.errors.shortName.message}</p>}
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Players</Label>
                        <div className="max-h-48 overflow-y-auto pr-2">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2 mb-2">
                                <Input {...form.register(`players.${index}.name`)} placeholder={`Player ${index + 1}`} />
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 2}>
                                    <Trash2 className="h-5 w-5 text-gray-500" />
                                </Button>
                            </div>
                        ))}
                        </div>
                        {form.formState.errors.players && <p className="text-destructive text-sm">{form.formState.errors.players.message || form.formState.errors.players.root?.message}</p>}
                    </div>
                     <Button type="button" variant="outline" onClick={() => append({ id: `player-${Date.now()}-${fields.length}`, name: '' })} className='w-full'>
                        <Plus className="mr-2 h-4 w-4" /> Add Player
                    </Button>
                    <DialogFooter>
                         <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="submit">Save Team</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function CreateGroupDialog({ onGroupCreated }: { onGroupCreated: (groupId: string) => void }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    const form = useForm<GroupFormValues>({
        resolver: zodResolver(groupSchema),
        defaultValues: { name: '' },
    });

    const onSubmit = async (data: GroupFormValues) => {
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in to create a group.", variant: "destructive" });
            return;
        }

        try {
            const newGroupRef = await addDoc(collection(db, "groups"), { ...data, teamIds: [], userId: user.uid });
            toast({ title: "Group Created!", description: `Group "${data.name}" has been created.` });
            onGroupCreated(newGroupRef.id);
            setOpen(false);
            form.reset();
        } catch (e) {
            console.error("Error adding document: ", e);
            toast({ title: "Error", description: "Could not create group.", variant: 'destructive' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full"><Plus className="mr-2 h-4 w-4"/> Create Group</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a New Group</DialogTitle>
                    <DialogDescription>Enter a name for your new group.</DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="group-name">Group Name</Label>
                        <Input id="group-name" {...form.register('name')} placeholder="e.g., Group A" />
                        {form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="submit">Save Group</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


export default function TeamsAndGroupsPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        
        const teamsUnsub = onSnapshot(collection(db, "teams"), (snapshot) => {
            const loadedTeams = snapshot.docs.map(doc => ({ ...doc.data() as Omit<Team, 'id'>, id: doc.id }));
            setTeams(loadedTeams);
        });

        const groupsUnsub = onSnapshot(collection(db, "groups"), (snapshot) => {
            const loadedGroups = snapshot.docs.map(doc => ({ ...doc.data() as Omit<Group, 'id'>, id: doc.id }));
            setGroups(loadedGroups);
        });

        setLoading(false);

        return () => {
            teamsUnsub();
            groupsUnsub();
        };

    }, [user]);

    const handleTeamCreated = (teamId: string) => {
        // Here you could open another dialog to assign the new team to a group.
        // For now, we just show a toast.
        toast({ title: "Next Step: Assign Team", description: "You can now assign this team to a group." });
    };
    
    const handleGroupCreated = (groupId: string) => {
        // The real-time listener will update the UI automatically.
    };

    return (
        <div className="min-h-screen bg-gray-50 text-foreground font-body">
            <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
                <Button variant="ghost" size="icon" onClick={() => router.push('/matches')}><ArrowLeft className="h-6 w-6" /></Button>
                <div className='flex flex-col items-center'>
                    <h1 className="text-2xl font-bold">Teams & Groups</h1>
                    <p className="text-sm text-muted-foreground">Manage your teams and tournament groups</p>
                </div>
                <div className="w-10"></div>
            </header>

            <main className="grid md:grid-cols-3 gap-8 p-4 md:p-8">
                {/* Left Column: Teams */}
                <div className="md:col-span-1 space-y-4">
                    <Card>
                         <CardHeader>
                            <CardTitle className='flex items-center justify-between'>
                                <span>All Teams</span>
                                <Users className="h-5 w-5 text-muted-foreground" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="space-y-2">
                                <AddTeamDialog onTeamCreated={handleTeamCreated} />
                                <CreateGroupDialog onGroupCreated={handleGroupCreated} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <Input placeholder="Search teams..." className="mb-4" />
                             <div className="space-y-2 max-h-96 overflow-y-auto">
                                {loading ? <p>Loading teams...</p> : teams.map(team => (
                                    <div key={team.id} className="p-3 bg-secondary/50 rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">{team.name}</p>
                                            <p className="text-xs text-muted-foreground">{team.players.length} players</p>
                                        </div>
                                    </div>
                                ))}
                                {!loading && teams.length === 0 && <p className="text-center text-muted-foreground py-4">No teams created yet.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Groups */}
                <div className="md:col-span-2">
                     <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? <p>Loading groups...</p> : groups.map(group => {
                            const assignedTeams = teams.filter(t => group.teamIds.includes(t.id));
                            return (
                                <Card key={group.id} className="min-h-[200px]">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <span>{group.name}</span>
                                            <span className="text-sm font-normal bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                                                {group.teamIds.length}
                                            </span>
                                        </CardTitle>
                                        <CardDescription>Drag teams here or use the dropdown to assign.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {assignedTeams.length > 0 ? assignedTeams.map(team => (
                                            <div key={team.id} className="p-2 bg-secondary rounded-md text-sm font-medium">
                                                {team.name}
                                            </div>
                                        )) : (
                                            <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                                                <p>No teams assigned.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                        {!loading && groups.length === 0 && (
                            <div className="md:col-span-2 lg:col-span-3 text-center text-muted-foreground py-16">
                                <Layers className="mx-auto h-12 w-12 text-gray-400" />
                                <h2 className="mt-2 text-lg font-medium">No groups found</h2>
                                <p className="mt-1 text-sm text-gray-500">Get started by creating a new group.</p>
                            </div>
                        )}
                     </div>
                </div>
            </main>
        </div>
    );
}

