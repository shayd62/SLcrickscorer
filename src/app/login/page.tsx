
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Chrome } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: 'Success!', description: "You've successfully signed in with Google." });
      router.push('/');
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      toast({
        title: "Google Sign-In Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsSubmitting(true);
    try {
      await signInAnonymously(auth);
      toast({ title: 'Welcome!', description: "You are logged in as a guest." });
      router.push('/');
    } catch (error: any) {
      console.error("Guest Sign-In Error:", error);
      toast({
        title: "Guest Sign-In Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-black">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
             <span className="text-red-500">SL</span><span className="text-green-600">cricscorer</span>
          </CardTitle>
          <CardDescription>Sign in to continue to your matches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleGoogleLogin} 
            disabled={isSubmitting} 
            className="w-full h-12 text-lg bg-white text-black border border-gray-300 hover:bg-gray-100"
          >
            <Chrome className="mr-2 h-5 w-5"/>
            Sign in with Google
          </Button>
          <Button 
            onClick={handleGuestLogin} 
            disabled={isSubmitting} 
            variant="secondary" 
            className="w-full h-12 text-lg"
          >
            Continue as Guest
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
