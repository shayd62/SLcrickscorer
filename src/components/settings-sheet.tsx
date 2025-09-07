
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LogOut, MessageSquare, Settings, User } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

export function SettingsSheet() {
    const { userProfile, logout } = useAuth();
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
                <div className="py-4 space-y-4">
                    {userProfile && (
                        <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-secondary">
                             <Avatar>
                                <AvatarImage src={userProfile.photoURL || undefined} />
                                <AvatarFallback>{userProfile.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-semibold">{userProfile.name}</p>
                                <p className="text-sm text-muted-foreground">{userProfile.email || userProfile.phoneNumber}</p>
                            </div>
                        </div>
                    )}
                    <div className="grid gap-2">
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
                </div>
            </SheetContent>
        </Sheet>
    );
}
