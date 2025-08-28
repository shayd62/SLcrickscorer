
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Radio, BarChart3, Gamepad2, Trophy, Home as HomeIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import withAuth from '@/components/with-auth';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function BottomNav() {
  const navItems = [
    { name: 'Home', icon: HomeIcon, href: '/matches', active: false },
    { name: 'Scorecard', icon: BarChart3, href: '#', active: false },
    { name: 'My Game', icon: Gamepad2, href: '/my-game', active: true },
    { name: 'Matches', icon: Trophy, href: '/matches', active: false },
  ];
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <Link href={item.href} key={item.name}>
            <div
              className={cn(
                'flex flex-col items-center gap-1 text-muted-foreground',
                item.active && 'text-primary'
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </footer>
  );
}


function MyGamePage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-secondary/30 text-foreground flex flex-col items-center font-sans">
            <div className="w-full max-w-md mx-auto p-4 pb-24">
                <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm">
                     <Button variant="ghost" size="icon" onClick={() => router.push('/matches')}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div className='flex flex-col items-center'>
                        <h1 className="text-2xl font-bold">My Game</h1>
                        <p className="text-sm text-muted-foreground">Your personal match center</p>
                    </div>
                    <div className="w-10"></div>
                </header>
                
                <main className="mt-4">
                     <Tabs defaultValue="live" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="live">Live</TabsTrigger>
                            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                            <TabsTrigger value="past">Past</TabsTrigger>
                        </TabsList>
                        <TabsContent value="live" className="mt-4">
                            <Card>
                                <CardContent className="p-6 text-center text-muted-foreground">
                                    <Radio className="mx-auto h-8 w-8 mb-2 animate-pulse text-green-500" />
                                    <p>No live matches involving you right now.</p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="upcoming" className="mt-4">
                             <Card>
                                <CardContent className="p-6 text-center text-muted-foreground">
                                    <p>No upcoming matches found.</p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                         <TabsContent value="past" className="mt-4">
                             <Card>
                                <CardContent className="p-6 text-center text-muted-foreground">
                                   <p>You haven't played any matches yet.</p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </main>
            </div>
            <BottomNav />
        </div>
    );
}

export default withAuth(MyGamePage);
