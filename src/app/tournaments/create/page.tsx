
'use client';

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CalendarIcon, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const tournamentSchema = z.object({
  name: z.string().min(3, 'Tournament name must be at least 3 characters.'),
  location: z.string().min(2, 'Location is required.'),
  startDate: z.date({ required_error: "A start date is required."}),
  endDate: z.date({ required_error: "An end date is required."}),
  numberOfTeams: z.string({ required_error: "Please select the number of teams." }),
  description: z.string().optional(),
});

type TournamentFormValues = z.infer<typeof tournamentSchema>;

const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  if (obj !== null && typeof obj === 'object') {
    const newObj: {[key: string]: any} = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
        const value = removeUndefined(obj[key]);
        if (value !== undefined) {
            newObj[key] = value;
        }
      }
    }
    return newObj;
  }
  return obj;
};


export default function CreateTournamentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const form = useForm<TournamentFormValues>({
    resolver: zodResolver(tournamentSchema),
  });

  const onSubmit = async (data: TournamentFormValues) => {
    if (!user) {
        toast({ title: "Not Authenticated", description: "You must be logged in to create a tournament.", variant: "destructive" });
        return;
    }
    const tournamentId = `tourn-${data.name.replace(/\s+/g, '-')}-${Date.now()}`;
    const tournamentData = {
        name: data.name,
        location: data.location,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        numberOfTeams: data.numberOfTeams,
        id: tournamentId,
        userId: user.uid,
        participatingTeams: [],
        pointsPolicy: {
            win: 2,
            loss: 0,
            draw: 1,
            bonus: 0,
        },
        oversPerInnings: 20, // Default value
        ...(data.description && { description: data.description }),
    };

    try {
      const cleanedData = removeUndefined(tournamentData);
      await setDoc(doc(db, "tournaments", tournamentId), cleanedData);
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

  return (
    <div className="min-h-screen bg-gray-50 text-foreground font-body">
      <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className='flex flex-col items-center'>
          <h1 className="text-2xl font-bold">Create Tournament</h1>
          <p className="text-sm text-muted-foreground">Setup your new competition</p>
        </div>
        <div className="w-10"></div>
      </header>
      <main className="p-4 md:p-8 flex justify-center">
        <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Trophy className="h-6 w-6 text-primary" />
              Tournament Details
            </CardTitle>
            <CardDescription>Fill in the details below to create your tournament.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tournament-name">Tournament Name</Label>
                <Input id="tournament-name" {...form.register('name')} placeholder="e.g., Summer Shield 2024" />
                {form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" {...form.register('location')} placeholder="e.g., Metropolis Cricket Ground" />
                {form.formState.errors.location && <p className="text-destructive text-sm">{form.formState.errors.location.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                   <Controller
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
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
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  {form.formState.errors.startDate && <p className="text-destructive text-sm">{form.formState.errors.startDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                   <Controller
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
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
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  {form.formState.errors.endDate && <p className="text-destructive text-sm">{form.formState.errors.endDate.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Number of Teams</Label>
                <Controller
                  control={form.control}
                  name="numberOfTeams"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select number of teams" />
                      </SelectTrigger>
                      <SelectContent>
                        {[4, 6, 8, 10, 12].map(num => (
                          <SelectItem key={num} value={String(num)}>{num} Teams</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.numberOfTeams && <p className="text-destructive text-sm">{form.formState.errors.numberOfTeams.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea id="description" {...form.register('description')} placeholder="Add any additional details about the tournament..." />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" className="rounded-lg">
                  Create Tournament
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
