
'use client';

import MatchSetup from '@/components/match-setup';
import type { MatchConfig } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, Home as HomeIcon, Trophy, Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function BottomNav() {
  const navItems = [
    { name: 'Home', icon: HomeIcon, href: '/matches', active: false },
    { name: 'Scorecard', icon: BarChart3, href: '#', active: false },
    { name: 'My Game', icon: Gamepad2, href: '/my-game', active: false },
    { name: 'Tournament', icon: Trophy, href: '/tournaments', active: false },
  ];
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg md:hidden z-20">
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


function SetupPage() {
  const router = useRouter();

  const handleSetupComplete = (matchId: string) => {
    router.push(`/scoring/${matchId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 text-foreground font-body flex flex-col">
       <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
         <Button variant="ghost" size="icon" onClick={() => router.push('/matches')}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className='flex flex-col items-center'>
            <h1 className="text-2xl font-bold">
              <span className="text-red-500">SL</span>
              <span className="text-green-600">cricscorer</span>
            </h1>
            <p className="text-sm text-muted-foreground">Professional Match Scoring</p>
          </div>
          <div className="w-10"></div>
      </header>
      <main className="flex-grow p-4 md:p-8 flex justify-center items-start overflow-y-auto pb-24">
        <div className="w-full max-w-md">
           <MatchSetup onSetupComplete={handleSetupComplete} />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

export default SetupPage;
