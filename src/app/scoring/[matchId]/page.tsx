

'use client';

import ScoringScreen from '@/components/scoring-screen';
import type { MatchState } from '@/lib/types';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Home as HomeIcon, BarChart3, Trophy, Link as LinkIcon, RefreshCw, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import ScorecardDisplay from '@/components/scorecard-display';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from "firebase/firestore";


function BottomNav() {
  const navItems = [
    { name: 'Home', icon: HomeIcon, href: '/', active: false },
    { name: 'Scorecard', icon: BarChart3, href: '#', active: true },
    { name: 'Matches', icon: Trophy, href: '#', active: false },
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


export default function ScoringPage() {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const matchId = params.matchId as string;

  useEffect(() => {
    if (!matchId) return;

    const matchDocRef = doc(db, 'matches', matchId);
    const unsubscribe = onSnapshot(matchDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as MatchState;
        if (data.matchOver) {
            // No need to set state if match is over, we will redirect
        }
        setMatchState(data);
      } else {
        console.log("No such document!");
        toast({
          title: "Match not found",
          description: "This match may have been deleted.",
          variant: "destructive"
        });
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [matchId, router, toast]);

  const handleShare = () => {
    const url = `${window.location.origin}/liveview/${matchId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied!",
      description: "Live scoreboard link has been copied to your clipboard.",
    })
  }

  if (!matchState) {
    return (
       <div className="flex items-center justify-center min-h-screen bg-gray-50">
         <p>Loading match...</p>
       </div>
    );
  }

  const { config } = matchState;
  const tossWinner = config.toss.winner === 'team1' ? config.team1.name : config.team2.name;
  const tossDecision = config.toss.decision;

  return (
    <div className="min-h-screen bg-gray-50 text-foreground font-sans flex flex-col">
       <div className="w-full max-w-md mx-auto bg-background flex-grow flex flex-col pb-20 md:pb-0">
        <header className="py-3 px-2 flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="flex-shrink-0">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex-grow text-center overflow-hidden px-2">
            <h1 className="text-xl font-bold flex items-center justify-center gap-2 text-primary whitespace-nowrap">
              <span className="truncate max-w-[calc(50%-2rem)]">{config.team1.name}</span>
              <span className="text-muted-foreground text-base font-normal">vs</span>
              <span className="truncate max-w-[calc(50%-2rem)]">{config.team2.name}</span>
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {tossWinner} won the toss and chose to {tossDecision}
            </p>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
             <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <ClipboardList className="h-5 w-5 text-blue-500" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[90vh] flex flex-col">
                <SheetHeader>
                  <SheetTitle>Full Scorecard</SheetTitle>
                </SheetHeader>
                <div className="flex-grow overflow-y-auto">
                    {matchState && <ScorecardDisplay match={matchState} />}
                </div>
              </SheetContent>
            </Sheet>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <LinkIcon className="h-5 w-5 text-green-500" />
            </Button>
          </div>
        </header>
        
        <main className="flex-grow p-4 flex justify-center items-start">
          <div className="w-full">
            <ScoringScreen key={matchState.config.team1.name} matchState={matchState} />
          </div>
        </main>
      </div>
       <BottomNav />
    </div>
  );
}
