
'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, ArrowLeft, CalendarIcon, MapPin, Circle, Sun, Trophy, GitBranch } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Team, Tournament } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import withAuth from '@/components/with-auth';

const tournamentSchema = z.object({
  name: z.string().min(1, 'Tournament name is required.'),
  startDate: z.date({ required_error: "A start date is required."}),
  endDate: z.date({ required_error: "An end date is required."}),
  oversPerInnings: z.number().min(1).max(100),
  participatingTeams: z.array(z.string()).min(2, 'At least 2 teams are required.'),
  pointsPolicy: z.object({
    win: z.number().int(),
    loss: z.number().int(),
    draw: z.number().int(),
    bonus: z.number().int().optional(),
  }),
  prize: z.string().optional(),
  venue: z.string().optional(),
  ballType: z.string().optional(),
  pitchType: z.string().optional(),
  tournamentFormat: z.string().optional(),
});

type TournamentFormValues = z.infer<typeof tournamentSchema>;

function CreateTournamentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);

  const form = useForm<TournamentFormValues>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      name: '',
      oversPerInnings: 20,
      participatingTeams: [],
      pointsPolicy: {
        win: 2,
        loss: 0,
        draw: 1,
        bonus: 0,
      },
      prize: '',
      venue: '',
      ballType: '',
      pitchType: '',
      tournamentFormat: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "teams"));
        const teams = querySnapshot.docs.map(doc => doc.data() as Team);
        setAvailableTeams(teams);
      } catch (e) {
        console.error("Failed to load teams from Firestore", e);
      }
    };
    fetchTeams();
  }, []);

  const onSubmit = async (data: TournamentFormValues) => {
    const tournamentId = `tourn-${data.name.replace(/\s/g, '-')}-${Date.now()}`;
    const tournamentData = {
      ...data,
      id: tournamentId,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
    };

    try {
      await setDoc(doc(db, "tournaments", tournamentId), tournamentData);
      toast({
        title: "Tournament Created!",
        description: `The tournament "${data.name}" has been created successfully.`,
      });
      router.push('/tournaments');
    } catch (e) {
      console.error("Error adding document: ", e);
      toast({ title: "Error", description: "Could not create the tournament.", variant: "destructive" });
    }
  };

  const selectedTeams = form.watch('participatingTeams');

  return (
    <div className="min-h-screen bg-gray-50 text-foreground font-body">
      <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
        <Button variant="ghost" size="icon" onClick={() => router.push('/tournaments')}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className='flex flex-col items-center'>
          <h1 className="text-2xl font-bold">Create Tournament</h1>
          <p className="text-sm text-muted-foreground">Setup your new competition</p>
        </div>
        <div className="w-10"></div>
      </header>
      <main className="p-4 md:p-8 flex justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Shield className="h-6 w-6 text-primary" />
              Tournament Details
            </CardTitle>
            <CardDescription>Enter the details for your new tournament.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tournament-name">Tournament Name</Label>
                <Input id="tournament-name" {...form.register('name')} placeholder="e.g., Premier League 2024" />
                {form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Controller
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                    <div className="space-y-2">
                         <Label>Start Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                         {form.formState.errors.startDate && <p className="text-destructive text-sm">{form.formState.errors.startDate.message}</p>}
                    </div>
                    )}
                 />
                 <Controller
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                    <div className="space-y-2">
                         <Label>End Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                         {form.formState.errors.endDate && <p className="text-destructive text-sm">{form.formState.errors.endDate.message}</p>}
                    </div>
                    )}
                 />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="overs">Overs per Innings</Label>
                    <Input id="overs" type="number" {...form.register('oversPerInnings', { valueAsNumber: true })} />
                    {form.formState.errors.oversPerInnings && <p className="text-destructive text-sm">{form.formState.errors.oversPerInnings.message}</p>}
                </div>
                 <Controller
                    control={form.control}
                    name="tournamentFormat"
                    render={({ field }) => (
                        <div className="space-y-2">
                        <Label>Tournament Format</Label>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="League">League</SelectItem>
                            <SelectItem value="Knockout">Knockout</SelectItem>
                            <SelectItem value="Round Robin">Round Robin</SelectItem>
                            </SelectContent>
                        </Select>
                        </div>
                    )}
                />
              </div>

               <div className="space-y-4">
                <Label>Venue, Pitch & Prize</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="venue">Venue</Label>
                        <Input id="venue" {...form.register('venue')} placeholder="e.g. Galle Stadium" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="prize">Prize</Label>
                        <Input id="prize" {...form.register('prize')} placeholder="e.g. $1000" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                        control={form.control}
                        name="ballType"
                        render={({ field }) => (
                            <div className="space-y-2">
                            <Label>Ball Type</Label>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                <SelectValue placeholder="Select ball type" />
                                </SelectTrigger>
                                <SelectContent>
                                <SelectItem value="Leather">Leather</SelectItem>
                                <SelectItem value="Tennis">Tennis</SelectItem>
                                <SelectItem value="Tape Ball">Tape Ball</SelectItem>
                                <SelectItem value="Synthetic">Synthetic</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            </div>
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="pitchType"
                        render={({ field }) => (
                            <div className="space-y-2">
                            <Label>Pitch Type</Label>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                <SelectValue placeholder="Select pitch type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Turf Pitch">Turf Pitch</SelectItem>
                                    <SelectItem value="Mat Pitch">Mat Pitch</SelectItem>
                                    <SelectItem value="Grass Pitch">Grass Pitch</SelectItem>
                                </SelectContent>
                            </Select>
                            </div>
                        )}
                    />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Participating Teams</Label>
                <Card className="max-h-48 overflow-y-auto">
                    <CardContent className="p-4 grid grid-cols-2 gap-4">
                        {availableTeams.map(team => (
                           <div key={team.name} className="flex items-center space-x-2">
                                <Checkbox
                                    id={team.name}
                                    checked={selectedTeams.includes(team.name)}
                                    onCheckedChange={(checked) => {
                                        return checked
                                        ? form.setValue('participatingTeams', [...selectedTeams, team.name])
                                        : form.setValue('participatingTeams', selectedTeams.filter(name => name !== team.name))
                                    }}
                                />
                                <label htmlFor={team.name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {team.name}
                                </label>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                 {form.formState.errors.participatingTeams && <p className="text-destructive text-sm">{form.formState.errors.participatingTeams.message}</p>}
              </div>

               <div className="space-y-4">
                <Label>Points Policy</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="win-points">Win</Label>
                        <Input id="win-points" type="number" {...form.register('pointsPolicy.win', { valueAsNumber: true })} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="loss-points">Loss</Label>
                        <Input id="loss-points" type="number" {...form.register('pointsPolicy.loss', { valueAsNumber: true })} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="draw-points">Draw</Label>
                        <Input id="draw-points" type="number" {...form.register('pointsPolicy.draw', { valueAsNumber: true })} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="bonus-points">Bonus</Label>
                        <Input id="bonus-points" type="number" {...form.register('pointsPolicy.bonus', { valueAsNumber: true })} />
                    </div>
                </div>
                 {form.formState.errors.pointsPolicy && <p className="text-destructive text-sm">Please enter valid points.</p>}
              </div>


              <Button type="submit" className="w-full text-lg py-6">Create Tournament</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withAuth(CreateTournamentPage);
