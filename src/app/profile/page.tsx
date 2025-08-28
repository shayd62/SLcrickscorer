
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, User, Mail, Phone, MapPin, Edit, Shield, GanttChartSquare } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import withAuth from '@/components/with-auth';
import Image from 'next/image';
import { CricketBatIcon, CricketBallIcon } from '@/components/icons';

function ProfilePage() {
    const router = useRouter();
    const { user, userProfile, loading } = useAuth();
    
    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading profile...</div>
    }

    if (!user || !userProfile) {
        // This should ideally not happen if withAuth is working correctly
        return <div className="flex items-center justify-center min-h-screen">User not found.</div>
    }

    return (
        <div className="min-h-screen bg-secondary/30 text-foreground font-body">
            <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div className='flex flex-col items-center'>
                    <h1 className="text-2xl font-bold">My Profile</h1>
                    <p className="text-sm text-muted-foreground">View and manage your details</p>
                </div>
                <Button variant="ghost" size="icon">
                    <Edit className="h-5 w-5" />
                </Button>
            </header>
            <main className="p-4 md:p-8 flex justify-center">
                <Card className="w-full max-w-md shadow-lg">
                    <CardHeader className="items-center text-center">
                        <Image 
                            src={`https://picsum.photos/seed/${user.uid}/100/100`} 
                            alt="Profile Picture" 
                            width={100}
                            height={100}
                            className="rounded-full border-4 border-primary"
                        />
                        <CardTitle className="mt-4">{userProfile.name} ({userProfile.shortName})</CardTitle>
                        <CardDescription>{userProfile.gender}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm">{userProfile.email}</span>
                        </div>
                         <div className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg">
                            <Phone className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm">{userProfile.phoneNumber || 'Not provided'}</span>
                        </div>
                         <div className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm">{userProfile.address || 'Not provided'}</span>
                        </div>
                         <Card>
                            <CardHeader className='p-3'>
                                <CardTitle className='text-base'>Playing Style</CardTitle>
                            </CardHeader>
                            <CardContent className='p-3 pt-0 space-y-3'>
                                <div className="flex items-center gap-4">
                                    <CricketBatIcon className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-sm">{userProfile.battingStyle || 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <CricketBallIcon className="h-5 w-5 text-muted-foreground" />
                                    <span className="text-sm">{userProfile.bowlingStyle || 'Not specified'}</span>
                                </div>
                                {userProfile.isWicketKeeper && (
                                    <div className="flex items-center gap-4">
                                        <GanttChartSquare className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-sm">Wicket Keeper</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}


export default withAuth(ProfilePage);
