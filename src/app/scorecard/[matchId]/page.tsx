'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { MatchState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ScorecardDisplay from '@/components/scorecard-display';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';


export default function ScorecardPage() {
  const [match, setMatch] = useState<MatchState | null>(null);
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const matchId = params.matchId as string;
    if (!matchId) return;

    const fetchMatch = async () => {
        const matchDocRef = doc(db, 'matches', matchId);
        try {
            const docSnap = await getDoc(matchDocRef);
            if (docSnap.exists()) {
                setMatch(docSnap.data() as MatchState);
            } else {
                console.log("No such document!");
                router.push('/');
            }
        } catch (e) {
            console.error("Failed to load match from firestore", e);
        }
    };
    
    fetchMatch();
  }, [params.matchId, router]);

  if (!match) {
    return <div className="flex justify-center items-center min-h-screen">Loading scorecard...</div>;
  }

  const { config, resultText } = match;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <header className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft />
          </Button>
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold">{config.team1.name} vs {config.team2.name}</h1>
            <p className="text-lg text-green-600 font-semibold">{resultText}</p>
          </div>
          <div className="w-10"></div>
        </header>
        
        <ScorecardDisplay match={match} />
      </div>
    </div>
  );
}
