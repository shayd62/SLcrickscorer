
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
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import withAuth from '@/components/with-auth';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters.'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match.",
  path: ['confirmPassword'],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

function ChangePasswordPage() {
  const router = useRouter();
  const { changeUserPassword } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await changeUserPassword(data.currentPassword, data.newPassword);
      toast({
        title: "Password Changed!",
        description: "Your password has been updated successfully.",
      });
      router.push('/profile');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 text-foreground font-body">
      <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className='flex flex-col items-center'>
          <h1 className="text-2xl font-bold">Change Password</h1>
          <p className="text-sm text-muted-foreground">Update your account security</p>
        </div>
        <div className="w-10"></div>
      </header>
      <main className="p-4 md:p-8 flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Update Your Password</CardTitle>
            <CardDescription>
              Enter your current password and a new password below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type={showCurrentPassword ? 'text' : 'password'} {...form.register('currentPassword')} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-7 h-7 w-7 text-muted-foreground" onClick={() => setShowCurrentPassword(p => !p)}>
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {form.formState.errors.currentPassword && <p className="text-destructive text-sm">{form.formState.errors.currentPassword.message}</p>}
              </div>
              <div className="space-y-2 relative">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type={showNewPassword ? 'text' : 'password'} {...form.register('newPassword')} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-7 h-7 w-7 text-muted-foreground" onClick={() => setShowNewPassword(p => !p)}>
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {form.formState.errors.newPassword && <p className="text-destructive text-sm">{form.formState.errors.newPassword.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type={showNewPassword ? 'text' : 'password'} {...form.register('confirmPassword')} />
                {form.formState.errors.confirmPassword && <p className="text-destructive text-sm">{form.formState.errors.confirmPassword.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withAuth(ChangePasswordPage);
