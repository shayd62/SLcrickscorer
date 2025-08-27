
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';


function MatchDetailsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const team1Name = searchParams.get('team1Name') || 'Team A';
    const team2Name = searchParams.get('team2Name') || 'Team B';
    const matchDateStr = searchParams.get('date');
    const venue = searchParams.get('venue') || 'TBD';
    
    const [formattedDate, setFormattedDate] = useState<string | null>(null);

    useEffect(() => {
        if (matchDateStr) {
            const date = new Date(decodeURIComponent(matchDateStr));
            setFormattedDate(date.toLocaleString());
        } else {
            setFormattedDate('Date not set');
        }
    }, [matchDateStr]);

    return (
        <div className="min-h-screen bg-gray-50 text-foreground font-body">
            <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
                <div className='flex flex-col items-center'>
                    <h1 className="text-2xl font-bold">Match Details</h1>
                </div>
                <div className="w-10"></div>
            </header>
            <main className="p-4 md:p-8 flex justify-center">
                <Card className="w-full max-w-2xl shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-center text-2xl font-bold">{team1Name} vs {team2Name}</CardTitle>
                        <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-4 pt-2">
                             <div className='flex items-center gap-1.5'>
                                <Calendar className="h-4 w-4"/>
                                <span>{formattedDate || 'Loading date...'}</span>
                             </div>
                             <div className='flex items-center gap-1.5'>
                                <MapPin className="h-4 w-4"/>
                                <span>{venue}</span>
                             </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Separator />
                        <div className="w-full max-w-lg flex justify-around items-center">
                            <div className="flex flex-col items-center gap-2">
                                <Image src="https://picsum.photos/100/100" alt="Team 1 Logo" width={60} height={60} className="rounded-full" data-ai-hint="cricket team" />
                                <span className="font-semibold">{team1Name}</span>
                                <Button variant="outline" size="sm">Select Squad</Button>
                            </div>
                            <span className="text-2xl font-bold text-muted-foreground">VS</span>
                             <div className="flex flex-col items-center gap-2">
                                <Image src="https://picsum.photos/100/100" alt="Team 2 Logo" width={60} height={60} className="rounded-full" data-ai-hint="cricket team" />
                                <span className="font-semibold">{team2Name}</span>
                                <Button variant="outline" size="sm">Select Squad</Button>
                            </div>
                        </div>

                         <div className="flex justify-center gap-4 pt-6">
                            <Button size="lg" variant="secondary" className="w-40">Schedule Match</Button>
                            <Button size="lg" className="w-40">Start Now</Button>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}


export default function MatchDetailsPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading details...</div>}>
            <MatchDetailsContent />
        </Suspense>
    )
}

