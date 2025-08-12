
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, BarChart3, Trophy, Trash2, Play, Home as HomeIcon, Users, Shield } from 'lucide-react';
import type { MatchState } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CricketBallIcon } from '@/components/icons';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';


function ActiveMatchCard({ match, onDelete }: { match: MatchState, onDelete: (id: string) => void }) {
  const router = useRouter();
  const { config } = match;

  const handleResume = () => {
    router.push(`/scoring/${match.id}`);
  }

  return (
    <Card className="p-4 flex flex-col gap-3 rounded-2xl shadow-sm">
      <div className="flex justify-between items-center text-center">
        <div className="flex-1">
          <p className="font-bold text-lg">{config.team1.name}</p>
        </div>
        <p className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded-full">VS</p>
        <div className="flex-1">
          <p className="font-bold text-lg">{config.team2.name}</p>
        </div>
      </div>
       <div className="flex justify-between text-sm text-muted-foreground text-center">
         <p className="flex-1">{config.oversPerInnings} Overs Match</p>
         <p className="flex-1">{config.playersPerSide} Players per Side</p>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Button onClick={handleResume} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg">
          <Play className="mr-2 h-4 w-4" />
          Resume
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(match.id!)}>
          <Trash2 className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>
    </Card>
  )
}

function RecentResultCard({ match, onDelete }: { match: MatchState, onDelete: (id: string) => void }) {
  const { config, resultText } = match;

  return (
    <Link href={`/scorecard/${match.id}`} className="block">
      <Card className="p-4 bg-secondary/50 rounded-2xl transition-all hover:bg-secondary/70">
          <div className="flex justify-between items-start">
              <div className="flex-grow space-y-2">
                  <h3 className="font-semibold text-foreground">{config.team1.name} vs {config.team2.name}</h3>
                  <div className="text-sm text-muted-foreground">
                      <p><span className='font-medium text-foreground'>{resultText}</span></p>
                  </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(match.id!);
                }}
                className="z-10"
              >
                  <Trash2 className="h-5 w-5 text-muted-foreground" />
              </Button>
          </div>
      </Card>
    </Link>
  )
}

function BottomNav() {
  const navItems = [
    { name: 'Home', icon: HomeIcon, href: '/', active: true },
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


export default function Home() {
  const [activeMatches, setActiveMatches] = useState<MatchState[]>([]);
  const [completedMatches, setCompletedMatches] = useState<MatchState[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "matches"));
      const matches = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MatchState));
      
      const active = matches.filter(m => !m.matchOver);
      const completed = matches.filter(m => m.matchOver);

      setActiveMatches(active);
      setCompletedMatches(completed);
    } catch(e) {
      console.error("Failed to parse matches from firestore", e);
    }
    setLoading(false);
  };
  
  useEffect(() => {
    fetchMatches();
  }, []);

  const handleDeleteMatch = async (matchId: string) => {
    try {
        await deleteDoc(doc(db, "matches", matchId));
        fetchMatches(); // Refetch matches after deletion
    } catch (error) {
        console.error("Error deleting match:", error);
    }
  };
  
  return (
    <div className="min-h-screen bg-secondary/30 text-foreground flex flex-col items-center font-sans">
      <div className="w-full max-w-md mx-auto p-4 pb-24">
        <header className="text-center py-6">
           <h1 className="text-3xl font-bold">
            <span className="text-red-500">SL</span><span className="text-green-600">cricscorer</span>
          </h1>
          <p className="text-muted-foreground">Welcome back, start a new match or resume a previous one.</p>
        </header>
        
        <main className="space-y-4">
          <Link href="/setup">
            <Button size="lg" className="w-full h-16 text-lg rounded-xl shadow-md">
              <Plus className="mr-2 h-6 w-6" />
              Start a New Match
            </Button>
          </Link>

          <div className="grid grid-cols-1 gap-4">
            <Link href="/teams">
              <Button size="lg" variant="outline" className="w-full h-16 text-lg rounded-xl shadow-md bg-card">
                <Users className="mr-2 h-6 w-6" />
                My Teams
              </Button>
            </Link>
          </div>

          <div className="space-y-2 pt-4">
            <h2 className="text-lg font-semibold text-muted-foreground">Active Matches</h2>
             {loading && <p>Loading matches...</p>}
             {!loading && activeMatches.length === 0 && (
                <Card className="p-8 text-center text-muted-foreground rounded-2xl">
                  No active matches. Start one!
                </Card>
             )}
            {activeMatches.map(match => (
              <ActiveMatchCard key={match.id} match={match} onDelete={handleDeleteMatch} />
            ))}
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-muted-foreground">Recent Results</h2>
            {!loading && completedMatches.length === 0 && (
                <Card className="p-8 text-center text-muted-foreground rounded-2xl">
                  No completed matches yet.
                </Card>
            )}
            {completedMatches.map(match => (
              <RecentResultCard key={match.id} match={match} onDelete={handleDeleteMatch}/>
            ))}
          </div>
          
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
