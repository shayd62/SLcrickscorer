
'use client';

import { useState } from 'react';
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
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  address: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other'], { required_error: 'Gender is required.' }),
  battingStyle: z.enum(['Right-handed', 'Left-handed']).optional(),
  bowlingStyle: z.enum(['Right-arm', 'Left-arm']).optional(),
  isWicketKeeper: z.boolean().optional(),
  photoURL: z.string().url().optional().or(z.literal('')),
}).refine(data => data.email || data.phoneNumber, {
  message: 'Either Email or Phone Number is required.',
  path: ['email'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterPage() {
  const router = useRouter();
  const { signUpWithEmail, createUserProfile } = useAuth();
  const { toast } = useToast();

  const form = useForm<RegisterFormValues>({ 
    resolver: zodResolver(registerSchema),
    defaultValues: {
        isWicketKeeper: false,
    }
  });

  const onSubmit = async (data: RegisterFormValues) => {
    let emailToRegister = data.email;

    if (!emailToRegister) {
      // If no email is provided, create a dummy one from the phone number
      emailToRegister = `${data.phoneNumber}@cricmate.com`;
    }

    try {
      if (!signUpWithEmail) {
        throw new Error('SignUp function is not available.');
      }
      const userCredential = await signUpWithEmail(emailToRegister, data.password);
      const user = userCredential.user;

      const profileData = {
        name: data.name,
        email: data.email, // Store the real email if provided, otherwise it's undefined
        phoneNumber: data.phoneNumber,
        address: data.address,
        gender: data.gender,
        battingStyle: data.battingStyle,
        bowlingStyle: data.bowlingStyle,
        isWicketKeeper: data.isWicketKeeper,
        photoURL: data.photoURL,
      };
      
      await createUserProfile(user.uid, profileData);

      toast({ title: "Registration Successful!", description: "You have been registered successfully." });
      router.push('/');
    } catch (error: any) {
      toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create an Account</CardTitle>
          <CardDescription>Join CricMate today!</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...form.register('name')} />
              {form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input id="phoneNumber" type="tel" {...form.register('phoneNumber')} />
              {form.formState.errors.phoneNumber && <p className="text-destructive text-sm">{form.formState.errors.phoneNumber.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input id="email" type="email" {...form.register('email')} />
              {form.formState.errors.email && <p className="text-destructive text-sm">{form.formState.errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="photoURL">Profile Picture URL (Optional)</Label>
              <Input id="photoURL" {...form.register('photoURL')} />
              {form.formState.errors.photoURL && <p className="text-destructive text-sm">{form.formState.errors.photoURL.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register('password')} />
              {form.formState.errors.password && <p className="text-destructive text-sm">{form.formState.errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address (Optional)</Label>
              <Input id="address" {...form.register('address')} />
            </div>

             <div className="space-y-2">
                <Label>Gender</Label>
                <Select onValueChange={(value) => form.setValue('gender', value as 'Male' | 'Female' | 'Other')}>
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
                            <Select onValueChange={(value) => form.setValue('battingStyle', value as 'Right-handed' | 'Left-handed')}>
                                <SelectTrigger><SelectValue placeholder="Select hand" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Right-handed">Right-handed</SelectItem>
                                    <SelectItem value="Left-handed">Left-handed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Bowling Style</Label>
                            <Select onValueChange={(value) => form.setValue('bowlingStyle', value as 'Right-arm' | 'Left-arm')}>
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
                        <Switch onCheckedChange={(checked) => form.setValue('isWicketKeeper', checked)} />
                    </div>
                </CardContent>
            </Card>


            <Button type="submit" className="w-full">Register</Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Log in here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RegisterPage;
