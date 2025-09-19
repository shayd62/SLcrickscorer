
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Bell, AlertTriangle, Info, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import type { Notification } from '@/lib/types';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

function NotificationItem({ notification }: { notification: Notification }) {
    const router = useRouter();

    const handleNotificationClick = async () => {
        if (!notification.isRead) {
            await updateDoc(doc(db, 'notifications', notification.id), { isRead: true });
        }
        if (notification.link) {
            router.push(notification.link);
        }
    };

    const getIcon = () => {
        switch (notification.type) {
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case 'match_invite':
                return <Mail className="h-5 w-5 text-blue-500" />;
            case 'info':
            default:
                return <Info className="h-5 w-5 text-green-500" />;
        }
    };

    return (
        <div
            className={cn(
                "flex items-start gap-4 p-3 rounded-lg cursor-pointer transition-colors",
                notification.isRead ? 'bg-secondary/30' : 'bg-primary/10 hover:bg-primary/20'
            )}
            onClick={handleNotificationClick}
        >
            <div className="mt-1">{getIcon()}</div>
            <div className="flex-1">
                <p className="font-semibold">{notification.title}</p>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}
                </p>
            </div>
            {!notification.isRead && <div className="h-2.5 w-2.5 rounded-full bg-primary mt-2"></div>}
        </div>
    );
}

export function NotificationSheet() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.isRead).length);
        });

        return () => unsubscribe();
    }, [user]);

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">{unreadCount}</Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent side="right">
                <SheetHeader>
                    <SheetTitle>Notifications</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-3 h-[calc(100vh-80px)] overflow-y-auto">
                    {notifications.length > 0 ? (
                        notifications.map(n => <NotificationItem key={n.id} notification={n} />)
                    ) : (
                        <div className="text-center text-muted-foreground py-16">
                            <p>You have no new notifications.</p>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
