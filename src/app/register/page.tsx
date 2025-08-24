
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

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  address: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other'], { required_error: 'Gender is required.' }),
}).refine(data => data.email || data.phoneNumber, {
  message: 'Either Email or Phone Number is required.',
  path: ['email'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterPage() {
  const router = useRouter();
  const { signUpWithEmail, createUserProfile } = useAuth();
  const { toast } = useToast();

  const form = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormValues) => {
    if (!data.email) {
      // For now, we only support email sign up through this form.
      // Phone sign up requires a different flow (OTP verification).
      toast({ title: "Phone sign-up not implemented", description: "Please register with an email for now.", variant: "destructive" });
      return;
    }

    try {
      if (!signUpWithEmail) {
        throw new Error('SignUp function is not available.');
      }
      const userCredential = await signUpWithEmail(data.email, data.password);
      const user = userCredential.user;

      const profileData = {
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
        address: data.address,
        gender: data.gender,
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
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register('name')} />
              {form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
              {form.formState.errors.email && <p className="text-destructive text-sm">{form.formState.errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input id="phoneNumber" type="tel" {...form.register('phoneNumber')} />
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
