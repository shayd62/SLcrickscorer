
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LogOut, MessageSquare, Settings, User } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export function SettingsSheet() {
    const { logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };
    
    return (
        <Sheet>
            <SheetTrigger asChild>
                <div className={'flex flex-col items-center gap-1 text-muted-foreground'}>
                    <Settings className="h-6 w-6" />
                    <span className="text-xs font-medium">Settings</span>
                </div>
            </SheetTrigger>
            <SheetContent side="bottom">
                <SheetHeader>
                    <SheetTitle>Settings</SheetTitle>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                    <Link href="/profile">
                        <Button variant="outline" className="w-full justify-start">
                            <User className="mr-2 h-4 w-4" /> Profile
                        </Button>
                    </Link>
                     <Link href="/feedback">
                        <Button variant="outline" className="w-full justify-start">
                            <MessageSquare className="mr-2 h-4 w-4" /> Feedback
                        </Button>
                    </Link>
                    <Button variant="destructive" className="w-full justify-start" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" /> Log Out
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
