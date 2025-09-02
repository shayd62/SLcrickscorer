
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import withAuth from '@/components/with-auth';
import { useAuth } from '@/contexts/auth-context';
import { submitFeedback, SubmitFeedbackInput } from '@/ai/flows/submit-feedback';
import { Label } from '@/components/ui/label';

const feedbackSchema = z.object({
  feedback: z.string().min(10, { message: "Feedback must be at least 10 characters." }),
});
type FeedbackFormValues = z.infer<typeof feedbackSchema>;

function FeedbackPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
  });

  const onSubmit = async (data: FeedbackFormValues) => {
    setIsSubmitting(true);
    try {
        const feedbackInput: SubmitFeedbackInput = {
            feedback: data.feedback,
            userId: user?.uid,
            userEmail: userProfile?.email,
        };
        await submitFeedback(feedbackInput);

        toast({
            title: "Feedback Submitted!",
            description: "Thank you for your valuable feedback.",
        });
        router.back();
    } catch (error: any) {
        console.error("Feedback submission error:", error);
        toast({
            title: "Submission Failed",
            description: "Could not submit your feedback. Please try again.",
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
          <h1 className="text-2xl font-bold">Submit Feedback</h1>
          <p className="text-sm text-muted-foreground">We'd love to hear from you</p>
        </div>
        <div className="w-10"></div>
      </header>
      <main className="p-4 md:p-8 flex justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Your Feedback</CardTitle>
            <CardDescription>
              Please share your thoughts, suggestions, or any issues you've encountered.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  {...form.register('feedback')}
                  placeholder="Tell us what you think..."
                  rows={8}
                />
                {form.formState.errors.feedback && (
                  <p className="text-destructive text-sm">{form.formState.errors.feedback.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : <><Send className="mr-2 h-4 w-4" /> Submit Feedback</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default withAuth(FeedbackPage);
