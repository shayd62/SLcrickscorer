

'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Shield, ArrowLeft, CalendarIcon, Plus, Upload } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Team, Tournament } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import Image from 'next/image';

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
    bonus: z.number().optional(),
  }),
  prize: z.string().optional(),
  venue: z.string().optional(),
  ballType: z.string().optional(),
  pitchType: z.string().optional(),
  tournamentFormat: z.enum(['Round Robin', 'Knockout', 'League']).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  coverPhotoUrl: z.string().url().optional().or(z.literal('')),
  numberOfTeams: z.string({ required_error: "Please select the number of teams." }),
});

type TournamentFormValues = z.infer<typeof tournamentSchema>;

function EditTournamentPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
  const tournamentId = params.tournamentId as string;
  const { user, uploadTournamentImage } = useAuth();
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

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
      tournamentFormat: undefined,
      logoUrl: '',
      coverPhotoUrl: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (!user) return;
    const fetchTeams = async () => {
      try {
        const q = query(collection(db, "teams"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const teams = querySnapshot.docs.map(doc => doc.data() as Team);
        setAvailableTeams(teams);
      } catch (e) {
        console.error("Failed to load teams from Firestore", e);
      }
    };
    fetchTeams();
  }, [user]);

  useEffect(() => {
    if (tournamentId && user) {
        const fetchTournament = async () => {
            const tournamentDocRef = doc(db, "tournaments", tournamentId);
            const docSnap = await getDoc(tournamentDocRef);
            if (docSnap.exists()) {
                const tournamentData = docSnap.data() as Tournament;
                if (tournamentData.userId !== user.uid) {
                    toast({ title: "Unauthorized", description: "You cannot edit this tournament.", variant: "destructive" });
                    router.push('/tournaments');
                    return;
                }
                form.reset({
                    ...tournamentData,
                    startDate: new Date(tournamentData.startDate),
                    endDate: new Date(tournamentData.endDate),
                    numberOfTeams: tournamentData.numberOfTeams, // Ensure this is set
                });
                if(tournamentData.logoUrl) setLogoPreview(tournamentData.logoUrl);
                if(tournamentData.coverPhotoUrl) setCoverPreview(tournamentData.coverPhotoUrl);
            } else {
                toast({ title: "Error", description: "Tournament not found.", variant: "destructive" });
                router.push('/tournaments');
            }
        };
        fetchTournament();
    }
  }, [tournamentId, form, router, toast, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              if (type === 'logo') {
                  setLogoFile(file);
                  setLogoPreview(reader.result as string);
              } else {
                  setCoverFile(file);
                  setCoverPreview(reader.result as string);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const onSubmit = async (data: TournamentFormValues) => {
    if (!user) return;

    let { logoUrl, coverPhotoUrl } = data;

    try {
        if(logoFile) {
            logoUrl = await uploadTournamentImage(tournamentId, logoFile, 'logo');
        }
        if(coverFile) {
            coverPhotoUrl = await uploadTournamentImage(tournamentId, coverFile, 'cover');
        }

        const tournamentRef = doc(db, "tournaments", tournamentId);
        
        const tournamentData = {
          ...data,
          startDate: data.startDate.toISOString(),
          endDate: data.endDate.toISOString(),
          logoUrl,
          coverPhotoUrl,
        };

        // Clean the object by removing keys with undefined values
        const cleanedData: {[key: string]: any} = {};
        for (const key in tournamentData) {
            if ((tournamentData as any)[key] !== undefined && (tournamentData as any)[key] !== '') {
                cleanedData[key] = (tournamentData as any)[key];
            }
        }
        
        await updateDoc(tournamentRef, cleanedData);

        toast({
            title: "Tournament Updated!",
            description: `The tournament "${data.name}" has been updated successfully.`,
        });
        router.push(`/tournaments/${tournamentId}`);

    } catch (e) {
      console.error("Error updating document: ", e);
      toast({ title: "Error", description: "Could not update the tournament.", variant: "destructive" });
    }
  };

  const selectedTeams = form.watch('participatingTeams');
  const tournamentName = form.watch('name');

  return (
    <div className="min-h-screen bg-gray-50 text-foreground font-body">
      <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
        <Button variant="ghost" size="icon" onClick={() => router.push('/tournaments')}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className='flex flex-col items-center'>
          <h1 className="text-2xl font-bold">Edit Tournament</h1>
          <p className="text-sm text-muted-foreground truncate max-w-xs">{tournamentName}</p>
        </div>
        <Link href="/teams/create" title="Add New Team">
            <Button variant="ghost" size="icon">
                <Plus className="h-6 w-6" />
            </Button>
        </Link>
      </header>
      <main className="p-4 md:p-8 flex justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Shield className="h-6 w-6 text-primary" />
              Tournament Details
            </CardTitle>
            <CardDescription>Update the details for your tournament.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tournament-name">Tournament Name</Label>
                <Input id="tournament-name" {...form.register('name')} placeholder="e.g., Premier League 2024" />
                {form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}
              </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Logo</Label>
                        {logoPreview && <Image src={logoPreview} alt="Logo preview" width={80} height={80} className="rounded-full mx-auto" />}
                        <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
                    </div>
                     <div className="space-y-2">
                        <Label>Cover Photo</Label>
                        {coverPreview && <Image src={coverPreview} alt="Cover preview" width={300} height={100} className="rounded-md mx-auto w-full aspect-[3/1] object-cover" />}
                        <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} />
                    </div>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Number of Teams</Label>
                    <Controller
                      control={form.control}
                      name="numberOfTeams"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select number of teams" />
                          </SelectTrigger>
                          <SelectContent>
                            {[4, 6, 8, 10, 12, 16, 20].map(num => (
                              <SelectItem key={num} value={String(num)}>{num} Teams</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.numberOfTeams && <p className="text-destructive text-sm">{form.formState.errors.numberOfTeams.message}</p>}
                  </div>
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
                            <Select onValueChange={field.onChange} value={field.value}>
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
                            <Select onValueChange={field.onChange} value={field.value}>
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


              <Button type="submit" className="w-full text-lg py-6">Save Changes</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default EditTournamentPage;

    