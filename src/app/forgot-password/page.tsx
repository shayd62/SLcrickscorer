
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Mail, MessageSquare, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

const forgotPasswordSchema = z.object({
  emailOrPhone: z.string().min(1, 'Please enter your email or phone number.'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

type RecoveryMethod = 'email' | 'sms' | 'whatsapp';

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<RecoveryMethod>('email');

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      // The sendPasswordReset function now handles both email and phone
      await sendPasswordReset(data.emailOrPhone);
      setIsSubmitted(true); // Show success message regardless of whether user exists
    } catch (error: any) {
      // We generally don't want to show specific errors here for security reasons
      // but for debugging, you might log it or show a generic error.
      // For the user, we will always show the same success message.
      console.error("Password reset error:", error);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (isSubmitted) {
      return (
        <div className="text-center">
          <p className="mb-4">
            If an account exists for the provided details, you will receive recovery instructions. Please check your inbox or messages.
          </p>
          <Link href="/login" passHref>
            <Button variant="outline">Back to Login</Button>
          </Link>
        </div>
      );
    }

    switch (recoveryMethod) {
      case 'email':
        return (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailOrPhone">Email or Phone Number</Label>
              <Input
                id="emailOrPhone"
                type="text"
                {...form.register('emailOrPhone')}
                placeholder="you@example.com or +11234567890"
              />
              {form.formState.errors.emailOrPhone && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.emailOrPhone.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        );
      case 'sms':
      case 'whatsapp':
        return (
          <div className="space-y-4 text-center">
            <Label htmlFor="phone">{recoveryMethod === 'sms' ? 'Phone Number (SMS)' : 'WhatsApp Number'}</Label>
            <Input id="phone" type="tel" placeholder="+1 123 456 7890" disabled />
            <p className="text-xs text-muted-foreground pt-2">
              This feature is coming soon. Please use email recovery for now.
            </p>
            <Button className="w-full" disabled>
              Send Recovery Code
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>
            {isSubmitted
              ? 'Request Sent!'
              : 'Choose a recovery method below.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSubmitted && (
             <div className="grid grid-cols-3 gap-2 mb-6">
                <Button variant={recoveryMethod === 'email' ? 'default' : 'outline'} onClick={() => setRecoveryMethod('email')}><Mail /></Button>
                <Button variant={recoveryMethod === 'sms' ? 'default' : 'outline'} onClick={() => setRecoveryMethod('sms')}><Phone /></Button>
                <Button variant={recoveryMethod === 'whatsapp' ? 'default' : 'outline'} onClick={() => setRecoveryMethod('whatsapp')}><MessageSquare /></Button>
            </div>
          )}
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}

    