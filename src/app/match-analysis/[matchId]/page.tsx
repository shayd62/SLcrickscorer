
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { MatchState, Innings, Batsman, Bowler } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart2, ClipboardList, ListOrdered, Trophy, User } from 'lucide-react';
import ScorecardDisplay from '@/components/scorecard-display';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from "firebase/firestore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatOvers = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

function MatchSummary({ match }: { match: MatchState }) {
    const { config, innings1, innings2, resultText, winner } = match;
    const team1 = config.team1;
    const team2 = config.team2;

    const topBatsman = (innings: Innings) => {
        return Object.values(innings.batsmen)
            .sort((a, b) => b.runs - a.runs)[0];
    };

    const topBowler = (innings: Innings) => {
        return Object.values(innings.bowlers)
            .filter(b => b.balls > 0)
            .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded)[0];
    };
    
    const winnerData = winner === 'team1' ? team1 : winner === 'team2' ? team2 : null;
    const tossWinner = config.toss.winner === 'team1' ? team1.name : team2.name;

    const topPerformer = useMemo(() => {
        const allBatsmen = [...Object.values(innings1.batsmen), ...(innings2 ? Object.values(innings2.batsmen) : [])];
        return allBatsmen.sort((a, b) => b.runs - a.runs)[0];
    }, [innings1, innings2]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Match Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 bg-secondary/50 rounded-lg text-center">
                    <p className="font-bold text-lg text-primary">{resultText}</p>
                    {winnerData && <p className="text-sm text-muted-foreground">{winnerData.name} take the win!</p>}
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 border rounded-lg">
                        <p className="font-semibold">Toss</p>
                        <p className="text-muted-foreground">{tossWinner} won and chose to {config.toss.decision}.</p>
                    </div>
                    {topPerformer && (
                         <div className="p-3 border rounded-lg">
                            <p className="font-semibold flex items-center gap-2"><Trophy className="text-yellow-500 h-4 w-4"/>Player of the Match</p>
                            <p className="text-muted-foreground">{topPerformer.name} - {topPerformer.runs} ({topPerformer.balls})</p>
                        </div>
                    )}
                 </div>
                 <div>
                    <h3 className="font-semibold mb-2">{team1.name} Innings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="p-3 border rounded-lg">
                            <p className="font-semibold">Top Scorer</p>
                            <p className="text-muted-foreground">{topBatsman(innings1)?.name || 'N/A'} - {topBatsman(innings1)?.runs || 0} ({topBatsman(innings1)?.balls || 0})</p>
                        </div>
                         <div className="p-3 border rounded-lg">
                            <p className="font-semibold">Top Bowler</p>
                            <p className="text-muted-foreground">{topBowler(config.team2 === team1 ? innings1 : innings2 || innings1)?.name || 'N/A'} - {topBowler(config.team2 === team1 ? innings1 : innings2 || innings1)?.wickets || 0}/{topBowler(config.team2 === team1 ? innings1 : innings2 || innings1)?.runsConceded || 0}</p>
                        </div>
                    </div>
                 </div>
                  {innings2 && (
                    <div>
                        <h3 className="font-semibold mb-2">{team2.name} Innings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                             <div className="p-3 border rounded-lg">
                                <p className="font-semibold">Top Scorer</p>
                                <p className="text-muted-foreground">{topBatsman(innings2)?.name || 'N/A'} - {topBatsman(innings2)?.runs || 0} ({topBatsman(innings2)?.balls || 0})</p>
                            </div>
                             <div className="p-3 border rounded-lg">
                                <p className="font-semibold">Top Bowler</p>
                                <p className="text-muted-foreground">{topBowler(config.team1 === team2 ? innings1 : innings2)?.name || 'N/A'} - {topBowler(config.team1 === team2 ? innings1 : innings2)?.wickets || 0}/{topBowler(config.team1 === team2 ? innings1 : innings2)?.runsConceded || 0}</p>
                            </div>
                        </div>
                    </div>
                  )}
            </CardContent>
        </Card>
    );
}

function calculateBattingPoints(batsman: Batsman): number {
    if (batsman.isOut && batsman.runs === 0 && batsman.balls > 0) {
        return -2;
    }
    let points = batsman.runs;
    points += (batsman.fours || 0) * 4;
    points += (batsman.sixes || 0) * 6;
    points += Math.floor(batsman.runs / 25) * 4;
    return points;
}

function MatchLeaderboard({ match }: { match: MatchState }) {
    const { innings1, innings2 } = match;

    const allBatsmen = useMemo(() => {
        const batsmenMap = new Map<string, Batsman & { points: number }>();

        const addBatsmen = (innings: Innings) => {
            Object.values(innings.batsmen).forEach(b => {
                if (b.balls > 0 || b.isOut) {
                    const existing = batsmenMap.get(b.id);
                    if (existing) {
                        existing.runs += b.runs;
                        existing.balls += b.balls;
                        existing.fours += b.fours;
                        existing.sixes += b.sixes;
                        existing.isOut = existing.isOut || b.isOut;
                    } else {
                        batsmenMap.set(b.id, { ...b, points: 0 });
                    }
                }
            });
        };

        addBatsmen(innings1);
        if (innings2) addBatsmen(innings2);
        
        batsmenMap.forEach(b => {
            b.points = calculateBattingPoints(b);
        });

        return Array.from(batsmenMap.values()).sort((a, b) => b.points - a.points);
    }, [innings1, innings2]);

    const allBowlers = useMemo(() => {
        const bowlersMap = new Map<string, Bowler>();
        
         const addBowlers = (innings: Innings) => {
            Object.values(innings.bowlers).forEach(b => {
                if (b.balls > 0) {
                    if (bowlersMap.has(b.id)) {
                        const existing = bowlersMap.get(b.id)!;
                        existing.runsConceded += b.runsConceded;
                        existing.balls += b.balls;
                        existing.wickets += b.wickets;
                    } else {
                        bowlersMap.set(b.id, { ...b });
                    }
                }
            });
        };
        
        addBowlers(innings1);
        if(innings2) addBowlers(innings2);

        return Array.from(bowlersMap.values()).sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded);
    }, [innings1, innings2]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Top Run Scorers</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Player</TableHead>
                                <TableHead className="text-right">Runs</TableHead>
                                <TableHead className="text-right">Balls</TableHead>
                                <TableHead className="text-right">SR</TableHead>
                                <TableHead className="text-right">Points</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allBatsmen.slice(0, 5).map(b => (
                                <TableRow key={b.id}>
                                    <TableCell className="font-medium">{b.name}</TableCell>
                                    <TableCell className="text-right font-bold">{b.runs}</TableCell>
                                    <TableCell className="text-right">{b.balls}</TableCell>
                                    <TableCell className="text-right">{b.balls > 0 ? (b.runs / b.balls * 100).toFixed(2) : '0.00'}</TableCell>
                                    <TableCell className="text-right font-bold">{b.points}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Top Wicket Takers</CardTitle></CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Player</TableHead>
                                <TableHead className="text-right">W-R</TableHead>
                                <TableHead className="text-right">Overs</TableHead>
                                <TableHead className="text-right">Econ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {allBowlers.slice(0, 5).map(b => (
                                <TableRow key={b.id}>
                                    <TableCell className="font-medium">{b.name}</TableCell>
                                    <TableCell className="text-right font-bold">{b.wickets}-{b.runsConceded}</TableCell>
                                    <TableCell className="text-right">{formatOvers(b.balls)}</TableCell>
                                    <TableCell className="text-right">{b.balls > 0 ? (b.runsConceded / (b.balls / 6)).toFixed(2) : '0.00'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function MatchAnalysisPage() {
  const [match, setMatch] = useState<MatchState | null>(null);
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const matchId = params.matchId as string;
    if (!matchId) return;

    const unsub = onSnapshot(doc(db, "matches", matchId), (doc) => {
        if (doc.exists()) {
            setMatch({ ...doc.data() as MatchState, id: doc.id });
        } else {
            console.log("No such document!");
            router.push('/');
        }
    }, (error) => {
      console.error("Failed to load match from firestore", error);
    });

    return () => unsub();
  }, [params.matchId, router]);

  if (!match) {
    return <div className="flex justify-center items-center min-h-screen">Loading match analysis...</div>;
  }

  const { config, resultText } = match;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-4xl mx-auto">
         <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft />
          </Button>
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold">{config.team1.name} vs {config.team2.name}</h1>
            <p className="text-lg text-primary font-semibold">{resultText}</p>
          </div>
          <div className="w-10"></div>
        </header>
        
        <main className="p-4 md:p-8">
            <Tabs defaultValue="scorecard" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="scorecard"><ClipboardList className="mr-2 h-4 w-4"/>Scorecard</TabsTrigger>
                    <TabsTrigger value="summary"><ListOrdered className="mr-2 h-4 w-4"/>Summary</TabsTrigger>
                    <TabsTrigger value="leaderboard"><BarChart2 className="mr-2 h-4 w-4"/>Leaderboard</TabsTrigger>
                </TabsList>
                <TabsContent value="scorecard" className="mt-4">
                    <ScorecardDisplay match={match} />
                </TabsContent>
                <TabsContent value="summary" className="mt-4">
                    <MatchSummary match={match} />
                </TabsContent>
                <TabsContent value="leaderboard" className="mt-4">
                    <MatchLeaderboard match={match} />
                </TabsContent>
            </Tabs>
        </main>
      </div>
    </div>
  );
}

export default MatchAnalysisPage;
