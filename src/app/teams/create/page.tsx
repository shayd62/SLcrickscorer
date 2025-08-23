

'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, Users, ArrowLeft, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, setDoc } from "firebase/firestore";
import withAuth from '@/components/with-auth';

const playerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Player name can't be empty"),
});

const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required.'),
  players: z.array(playerSchema).min(2, 'At least 2 players are required.'),
});

type TeamFormValues = z.infer<typeof teamSchema>;

function CreateTeamPage() {
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      players: [
        { id: `player-${Date.now()}-0`, name: '' },
        { id: `player-${Date.now()}-1`, name: '' },
      ],
    },
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "players",
  });

  const onSubmit = async (data: TeamFormValues) => {
    const teamKey = `team-${data.name.replace(/\s/g, '-')}`;
    try {
        await setDoc(doc(db, "teams", teamKey), data);
        toast({
            title: "Team Saved!",
            description: `Team "${data.name}" has been saved successfully.`,
        });
        router.push('/teams');
    } catch (e) {
        console.error("Error adding document: ", e);
         toast({
            title: "Error saving team",
            description: "Could not save team to Firestore.",
            variant: "destructive"
        });
    }
  };
  
  const addPlayer = () => {
    append({ id: `player-${Date.now()}-${fields.length}`, name: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-foreground font-body">
       <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm">
         <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className='flex flex-col items-center'>
            <h1 className="text-2xl font-bold">Create a New Team</h1>
            <p className="text-sm text-muted-foreground">Define your squad</p>
          </div>
           <Link href="/teams">
            <Button variant="ghost" size="icon">
                <Trophy className="h-6 w-6" />
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
                <CardDescription>Enter your team's name and add the players.</CardDescription>
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
                            {...form.register(`players.${index}.name`)}
                            placeholder={`Player ${index + 1}`}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 2}
                        >
                            <Trash2 className="h-5 w-5 text-gray-500" />
                        </Button>
                        </div>
                    ))}
                     {form.formState.errors.players && <p className="text-destructive text-sm">{form.formState.errors.players.message || form.formState.errors.players.root?.message}</p>}
                </div>

                <Button type="button" variant="outline" onClick={addPlayer} className='w-full'>
                    <Plus className="mr-2 h-4 w-4" /> Add Player
                </Button>

                <Button type="submit" className="w-full text-lg py-6">Save Team</Button>
            </form>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withAuth(CreateTeamPage);
