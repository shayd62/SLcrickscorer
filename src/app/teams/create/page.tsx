
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, Users, ArrowLeft, Camera, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { doc, setDoc, addDoc, collection, updateDoc } from "firebase/firestore";
import { useAuth } from '@/contexts/auth-context';
import type { UserProfile } from '@/lib/types';
import { PlayerSearchDialog } from '@/components/player-search-dialog';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required.'),
  shortName: z.string().max(3, 'Short name must be 3 characters or less.').optional(),
  email: z.string().email('Invalid email address.'),
  city: z.string().min(1, 'City is required.'),
  website: z.string().url('Invalid URL.').optional().or(z.literal('')),
  about: z.string().max(250, 'About must be 250 characters or less.').optional(),
  isPinProtected: z.boolean().default(false),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

type TeamFormValues = z.infer<typeof teamSchema>;

function CreateTeamPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, uploadTeamLogo } = useAuth();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      shortName: '',
      email: '',
      city: '',
      website: '',
      about: '',
      isPinProtected: false,
      logoUrl: '',
    },
    mode: 'onChange',
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const onSubmit = async (data: TeamFormValues) => {
    if (!user) {
        toast({ title: "Not Authenticated", description: "You must be logged in to create a team.", variant: "destructive" });
        return;
    }

    try {
        // Prepare team data, excluding the logo URL for now
        const teamData: any = {
            ...data,
            userId: user.uid,
            players: [],
            logoUrl: '', // Will be updated later if a logo is uploaded
        };

        // Remove undefined fields
        Object.keys(teamData).forEach(key => {
            if (teamData[key] === undefined) {
                delete teamData[key];
            }
        });

        // Add the new team to Firestore to get a document reference
        const teamDocRef = await addDoc(collection(db, "teams"), teamData);
        const teamId = teamDocRef.id;

        // If a logo file was selected, upload it now
        if (logoFile) {
            const logoUrl = await uploadTeamLogo(teamId, logoFile);
            // Update the team document with the new logo URL
            await updateDoc(teamDocRef, { logoUrl: logoUrl, id: teamId });
        } else {
             await updateDoc(teamDocRef, { id: teamId });
        }

        toast({
            title: "Team Created!",
            description: `Team "${data.name}" has been created successfully.`,
        });
        router.push('/teams');

    } catch (e) {
        console.error("Error adding document: ", e);
        toast({
            title: "Error creating team",
            description: "Could not save team to Firestore.",
            variant: "destructive"
        });
    }
  };
  
  const nameValue = form.watch('name');

  return (
    <div className="min-h-screen bg-gray-50 text-foreground font-body">
      <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold">Team</h1>
        <div className="w-10"></div>
      </header>
      <main className="p-4 md:p-8 flex justify-center">
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-md space-y-4">
            <div className="flex flex-col items-center gap-2">
                <div className="relative">
                    <Image 
                        src={logoPreview || '/placeholder-team.png'}
                        alt="Team Logo"
                        width={96}
                        height={96}
                        className="rounded-full border-2 border-dashed"
                    />
                     <label htmlFor="logo-upload" className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full cursor-pointer hover:bg-primary/90">
                        <Camera className="h-4 w-4" />
                        <input id="logo-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                     </label>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {Object.entries({
                            name: { label: 'Name*', placeholder: 'Required', type: 'text'},
                            shortName: { label: 'Short Name', placeholder: 'Max 3. Chars', type: 'text'},
                            email: { label: 'E-Mail*', placeholder: 'Required', type: 'email'},
                            city: { label: 'City*', placeholder: 'e.g. Bogura, Bangladesh', type: 'text'},
                        }).map(([key, { label, placeholder, type }]) => (
                            <div key={key} className="flex items-center justify-between px-4 py-3">
                                <Label htmlFor={key} className="font-medium text-base">{label}</Label>
                                <Input
                                    id={key}
                                    type={type}
                                    {...form.register(key as keyof TeamFormValues)}
                                    className="border-0 text-right w-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                                    placeholder={placeholder}
                                />
                            </div>
                        ))}
                         {Object.entries({
                             admins: { label: 'Admins', value: '0 Selected' },
                             scorers: { label: 'Scorers', value: '0 Selected' },
                         }).map(([key, {label, value}]) => (
                            <div key={key} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-secondary/50">
                                <span className="font-medium text-base">{label}</span>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <span>{value}</span>
                                    <ChevronRight className="h-5 w-5" />
                                </div>
                            </div>
                         ))}
                          <div className="flex items-center justify-between px-4 py-3">
                                <Label htmlFor="website" className="font-medium text-base">Website</Label>
                                <Input
                                    id="website"
                                    type="text"
                                    {...form.register('website')}
                                    className="border-0 text-right w-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                                    placeholder="Optional"
                                />
                            </div>
                            <div className="px-4 py-3">
                                 <Label htmlFor="about" className="font-medium text-base">About</Label>
                                 <Textarea 
                                    id="about" 
                                    {...form.register('about')} 
                                    placeholder="Description your team. Max. 250 Characters"
                                    className="mt-2"
                                 />
                            </div>
                             <div className="flex items-center justify-between px-4 py-3">
                                <div>
                                    <Label htmlFor="pin-protected" className="font-medium text-base">Pin Protected</Label>
                                    <p className="text-sm text-muted-foreground">Other teams need security pin to start a match with this team</p>
                                </div>
                                <Switch id="pin-protected" {...form.register('isPinProtected')} />
                            </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-2">
                {!nameValue && (
                     <div className="text-center bg-yellow-100 text-yellow-800 p-2 rounded-md">
                        Please Enter Name
                    </div>
                )}
                <Button type="submit" className="w-full text-lg py-6 bg-pink-500 hover:bg-pink-600" disabled={!form.formState.isValid}>
                    Save Team
                </Button>
            </div>
        </form>
      </main>
    </div>
  );
}

export default CreateTeamPage;
