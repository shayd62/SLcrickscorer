
'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';

const notificationSchema = z.object({
  target: z.enum(['all', 'specific']),
  targetIdentifier: z.string().optional(),
  title: z.string().min(1, 'Title is required.'),
  message: z.string().min(1, 'Message is required.'),
  type: z.enum(['info', 'warning', 'match_invite', 'friend_request']),
  link: z.string().url().optional().or(z.literal('')),
}).refine(data => {
    if (data.target === 'specific') {
        return data.targetIdentifier && data.targetIdentifier.length > 0;
    }
    return true;
}, {
    message: 'User Email or ID is required for specific targeting.',
    path: ['targetIdentifier'],
});

type NotificationFormValues = z.infer<typeof notificationSchema>;

export default function AdminNotificationsPage() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<NotificationFormValues>({
        resolver: zodResolver(notificationSchema),
        defaultValues: {
            target: 'all',
            title: '',
            message: '',
            type: 'info',
            link: '',
        }
    });

    const targetValue = form.watch('target');

    const onSubmit = async (data: NotificationFormValues) => {
        setIsSubmitting(true);
        try {
            const usersToNotify: UserProfile[] = [];

            if (data.target === 'all') {
                const usersSnapshot = await getDocs(collection(db, 'users'));
                usersSnapshot.forEach(doc => usersToNotify.push({ id: doc.id, ...doc.data() } as UserProfile));
            } else {
                const identifier = data.targetIdentifier!;
                const isEmail = identifier.includes('@');
                const q = query(collection(db, 'users'), where(isEmail ? 'email' : 'uid', '==', identifier));
                const userSnapshot = await getDocs(q);

                if (userSnapshot.empty) {
                    toast({ title: 'User not found', description: `No user found with identifier: ${identifier}`, variant: 'destructive' });
                    setIsSubmitting(false);
                    return;
                }
                userSnapshot.forEach(doc => usersToNotify.push({ id: doc.id, ...doc.data() } as UserProfile));
            }

            if(usersToNotify.length === 0) {
                 toast({ title: 'No users to notify', description: 'Could not find any users matching the criteria.', variant: 'destructive' });
                 setIsSubmitting(false);
                 return;
            }

            const validUsersToNotify = usersToNotify.filter(user => user && user.uid);

            const notificationPromises = validUsersToNotify.map(user => {
                return addDoc(collection(db, 'notifications'), {
                    userId: user.uid,
                    title: data.title,
                    message: data.message,
                    type: data.type,
                    link: data.link,
                    isRead: false,
                    createdAt: serverTimestamp(),
                });
            });

            await Promise.all(notificationPromises);

            toast({ title: 'Notifications Sent!', description: `Successfully sent notification to ${validUsersToNotify.length} user(s).` });
            form.reset();

        } catch (error: any) {
            console.error("Error sending notification:", error);
            toast({ title: "Error", description: "Failed to send notification.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold">Send Notification</h1>
                <p className="text-gray-500">Send messages to all or specific users.</p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Compose Message</CardTitle>
                        <CardDescription>Craft your notification below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                             <Label>Target Audience</Label>
                             <Controller
                                control={form.control}
                                name="target"
                                render={({ field }) => (
                                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="all" id="r1" />
                                            <Label htmlFor="r1">All Users</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="specific" id="r2" />
                                            <Label htmlFor="r2">Specific User</Label>
                                        </div>
                                    </RadioGroup>
                                )}
                            />
                        </div>
                        
                        {targetValue === 'specific' && (
                            <div className="space-y-2">
                                <Label htmlFor="targetIdentifier">User Email or ID</Label>
                                <Input id="targetIdentifier" {...form.register('targetIdentifier')} placeholder="user@example.com or UID" />
                                {form.formState.errors.targetIdentifier && <p className="text-destructive text-sm">{form.formState.errors.targetIdentifier.message}</p>}
                            </div>
                        )}

                        <div className="space-y-2">
                             <Label htmlFor="title">Title</Label>
                             <Input id="title" {...form.register('title')} placeholder="e.g., Maintenance Alert" />
                             {form.formState.errors.title && <p className="text-destructive text-sm">{form.formState.errors.title.message}</p>}
                        </div>
                        
                        <div className="space-y-2">
                             <Label htmlFor="message">Message</Label>
                             <Textarea id="message" {...form.register('message')} placeholder="Your message here..." />
                             {form.formState.errors.message && <p className="text-destructive text-sm">{form.formState.errors.message.message}</p>}
                        </div>

                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Notification Type</Label>
                                <Controller
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="info">Info</SelectItem>
                                                <SelectItem value="warning">Warning</SelectItem>
                                                <SelectItem value="match_invite">Match Invite</SelectItem>
                                                <SelectItem value="friend_request">Friend Request</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="link">Link (Optional)</Label>
                                <Input id="link" {...form.register('link')} placeholder="https://example.com/some/path" />
                                {form.formState.errors.link && <p className="text-destructive text-sm">{form.formState.errors.link.message}</p>}
                            </div>
                        </div>

                    </CardContent>
                </Card>
                <Button type="submit" className="mt-6" disabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Send Notification'}
                </Button>
            </form>
        </div>
    );
}
