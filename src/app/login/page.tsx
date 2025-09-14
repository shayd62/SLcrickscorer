
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

const emailSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

const phoneSchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits.'),
  password: z.string().min(1, 'Password is required.'),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type PhoneFormValues = z.infer<typeof phoneSchema>;

function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signInWithPhoneAndPassword } = useAuth();
  const { toast } = useToast();
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [showPassword, setShowPassword] = useState(false);

  const emailForm = useForm<EmailFormValues>({ resolver: zodResolver(emailSchema) });
  const phoneForm = useForm<PhoneFormValues>({ resolver: zodResolver(phoneSchema) });

  const onEmailSubmit = async (data: EmailFormValues) => {
    try {
      await signInWithEmail(data.email, data.password);
      toast({ title: "Login Successful!" });
      router.push('/');
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    }
  };

  const onPhoneSubmit = async (data: PhoneFormValues) => {
    try {
      await signInWithPhoneAndPassword(data.phoneNumber, data.password);
      toast({ title: "Login Successful!" });
      router.push('/');
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome Back!</CardTitle>
          <CardDescription>Log in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button variant={loginMethod === 'email' ? 'default' : 'outline'} onClick={() => setLoginMethod('email')} className="w-full">Email</Button>
            <Button variant={loginMethod === 'phone' ? 'default' : 'outline'} onClick={() => setLoginMethod('phone')} className="w-full">Phone</Button>
          </div>

          {loginMethod === 'email' ? (
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...emailForm.register('email')} />
                {emailForm.formState.errors.email && <p className="text-destructive text-sm">{emailForm.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-2 relative">
                <div className="flex justify-between items-center">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" passHref>
                      <span className="text-sm underline cursor-pointer">Forgot Password?</span>
                    </Link>
                </div>
                <Input id="password" type={showPassword ? 'text' : 'password'} {...emailForm.register('password')} />
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-7 h-7 w-7 text-muted-foreground"
                    onClick={() => setShowPassword(prev => !prev)}
                >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {emailForm.formState.errors.password && <p className="text-destructive text-sm">{emailForm.formState.errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full">Log In</Button>
            </form>
          ) : (
            <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input id="phoneNumber" type="tel" {...phoneForm.register('phoneNumber')} placeholder="+1 123 456 7890" />
                {phoneForm.formState.errors.phoneNumber && <p className="text-destructive text-sm">{phoneForm.formState.errors.phoneNumber.message}</p>}
              </div>
               <div className="space-y-2 relative">
                 <div className="flex justify-between items-center">
                    <Label htmlFor="phone-password">Password</Label>
                     <Link href="/forgot-password" passHref>
                      <span className="text-sm underline cursor-pointer">Forgot Password?</span>
                    </Link>
                </div>
                <Input id="phone-password" type={showPassword ? 'text' : 'password'} {...phoneForm.register('password')} />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-7 h-7 w-7 text-muted-foreground"
                    onClick={() => setShowPassword(prev => !prev)}
                >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {phoneForm.formState.errors.password && <p className="text-destructive text-sm">{phoneForm.formState.errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full">Log In</Button>
            </form>
          )}

          <div className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <Link href="/register" className="underline">
              Register here
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
