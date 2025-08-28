
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft } from 'lucide-react';
import withAuth from '@/components/with-auth';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  shortName: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other'], { required_error: 'Gender is required.' }),
  battingStyle: z.enum(['Right-handed', 'Left-handed']).optional(),
  bowlingStyle: z.enum(['Right-arm', 'Left-arm']).optional(),
  isWicketKeeper: z.boolean().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function EditProfilePage() {
  const router = useRouter();
  const { user, userProfile, updateUserProfile, loading } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      shortName: '',
      phoneNumber: '',
      address: '',
      gender: 'Male',
      battingStyle: 'Right-handed',
      bowlingStyle: 'Right-arm',
      isWicketKeeper: false,
    }
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        name: userProfile.name,
        shortName: userProfile.shortName || '',
        phoneNumber: userProfile.phoneNumber || '',
        address: userProfile.address || '',
        gender: userProfile.gender,
        battingStyle: userProfile.battingStyle,
        bowlingStyle: userProfile.bowlingStyle,
        isWicketKeeper: userProfile.isWicketKeeper,
      });
    }
  }, [userProfile, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    try {
      await updateUserProfile(user.uid, data);
      toast({ title: "Profile Updated!", description: "Your profile has been successfully updated." });
      router.push('/profile');
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-secondary/30 font-body">
       <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className='flex flex-col items-center'>
              <h1 className="text-2xl font-bold">Edit Profile</h1>
              <p className="text-sm text-muted-foreground">Update your personal details</p>
          </div>
          <div className="w-10"></div>
      </header>
       <main className="p-4 md:p-8 flex justify-center">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Your Information</CardTitle>
                <CardDescription>Make changes to your profile here. Click save when you're done.</CardDescription>
            </CardHeader>
            <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...form.register('name')} />
                    {form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="shortName">Short Name</Label>
                    <Input id="shortName" {...form.register('shortName')} />
                    </div>
                </div>
                
                <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input id="phoneNumber" type="tel" {...form.register('phoneNumber')} />
                </div>

                <div className="space-y-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <Input id="address" {...form.register('address')} />
                </div>

                <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select onValueChange={(value) => form.setValue('gender', value as 'Male' | 'Female' | 'Other')} value={form.watch('gender')}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                    {form.formState.errors.gender && <p className="text-destructive text-sm">{form.formState.errors.gender.message}</p>}
                </div>
                
                <Card className='p-4 bg-secondary/30'>
                    <CardHeader className="p-2">
                        <CardTitle className="text-lg">Playing Style</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Batting Style</Label>
                                <Select onValueChange={(value) => form.setValue('battingStyle', value as 'Right-handed' | 'Left-handed')} value={form.watch('battingStyle')}>
                                    <SelectTrigger><SelectValue placeholder="Select hand" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Right-handed">Right-handed</SelectItem>
                                        <SelectItem value="Left-handed">Left-handed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Bowling Style</Label>
                                <Select onValueChange={(value) => form.setValue('bowlingStyle', value as 'Right-arm' | 'Left-arm')} value={form.watch('bowlingStyle')}>
                                    <SelectTrigger><SelectValue placeholder="Select arm" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Right-arm">Right-arm</SelectItem>
                                        <SelectItem value="Left-arm">Left-arm</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Are you a wicket-keeper?</Label>
                            <Switch checked={form.watch('isWicketKeeper')} onCheckedChange={(checked) => form.setValue('isWicketKeeper', checked)} />
                        </div>
                    </CardContent>
                </Card>


                <Button type="submit" className="w-full">Save Changes</Button>
            </form>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withAuth(EditProfilePage);
