
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, User, BarChart2, Shield } from 'lucide-react';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { UserProfile, MatchState, Batsman, Bowler } from '@/lib/types';
import { CricketBatIcon, CricketBallIcon } from '@/components/icons';

const formatOvers = (balls: number, ballsPerOver: number = 6) => `${Math.floor(balls / ballsPerOver)}.${balls % ballsPerOver}`;

interface CareerStats {
    matches: number;
    // Batting
    runs: number;
    ballsFaced: number;
    notOuts: number;
    fifties: number;
    hundreds: number;
    bestScore: { runs: number, balls: number, isOut: boolean };
    strikeRate: number;
    battingAverage: number;
    // Bowling
    wickets: number;
    runsConceded: number;
    ballsBowled: number;
    fiveWicketHauls: number;
    bestBowling: { wickets: number, runs: number };
    bowlingAverage: number;
    economy: number;
}

function CareerStatsPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.userId as string;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState<CareerStats | null>(null);
    const [loading, setLoading] = useState(true);

    const calculateStats = useCallback((matches: MatchState[], playerId: string): CareerStats => {
        const career: CareerStats = {
            matches: matches.length,
            runs: 0,
            ballsFaced: 0,
            notOuts: 0,
            fifties: 0,
            hundreds: 0,
            bestScore: { runs: 0, balls: 0, isOut: true },
            strikeRate: 0,
            battingAverage: 0,
            wickets: 0,
            runsConceded: 0,
            ballsBowled: 0,
            fiveWicketHauls: 0,
            bestBowling: { wickets: 0, runs: 0 },
            bowlingAverage: 0,
            economy: 0,
        };

        let dismissals = 0;

        matches.forEach(match => {
            const processInnings = (innings: any) => {
                if (!innings || !innings.batsmen) return;

                // Batting stats
                const batsman: Batsman | undefined = innings.batsmen[playerId];
                if (batsman && (batsman.balls > 0 || batsman.isOut)) {
                    career.runs += batsman.runs;
                    career.ballsFaced += batsman.balls;
                    if (!batsman.isOut) {
                      career.notOuts++;
                    } else {
                      dismissals++;
                    }
                    if (batsman.runs >= 50 && batsman.runs < 100) career.fifties++;
                    if (batsman.runs >= 100) career.hundreds++;
                    if (batsman.runs > career.bestScore.runs || (batsman.runs === career.bestScore.runs && !batsman.isOut)) {
                        career.bestScore = { runs: batsman.runs, balls: batsman.balls, isOut: batsman.isOut };
                    }
                }

                // Bowling stats
                const bowler: Bowler | undefined = innings.bowlers[playerId];
                if (bowler && bowler.balls > 0) {
                    career.wickets += bowler.wickets;
                    career.runsConceded += bowler.runsConceded;
                    career.ballsBowled += bowler.balls;
                    if (bowler.wickets >= 5) career.fiveWicketHauls++;
                    if (bowler.wickets > career.bestBowling.wickets || (bowler.wickets === career.bestBowling.wickets && bowler.runsConceded < career.bestBowling.runs)) {
                        career.bestBowling = { wickets: bowler.wickets, runs: bowler.runsConceded };
                    }
                }
            };
            
            processInnings(match.innings1);
            if (match.innings2) processInnings(match.innings2);
        });
        
        career.battingAverage = dismissals > 0 ? career.runs / dismissals : career.runs;
        career.strikeRate = career.ballsFaced > 0 ? (career.runs / career.ballsFaced) * 100 : 0;
        career.bowlingAverage = career.wickets > 0 ? career.runsConceded / career.wickets : 0;
        career.economy = career.ballsBowled > 0 ? career.runsConceded / (career.ballsBowled / 6) : 0;

        return career;
    }, []);
    
    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch user profile
                const userDocRef = doc(db, 'users', userId);
                const userSnap = await getDoc(userDocRef);
                
                if (userSnap.exists()) {
                    setProfile(userSnap.data() as UserProfile);
                } else {
                    // Fallback to query by UID if ID is not the phone number for some reason
                    const q = query(collection(db, 'users'), where('uid', '==', userId));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        setProfile(querySnapshot.docs[0].data() as UserProfile);
                    }
                }

                // Fetch all matches and filter client-side
                const matchesRef = collection(db, "matches");
                const matchesSnap = await getDocs(matchesRef);
                const allMatches = matchesSnap.docs.map(doc => doc.data() as MatchState);
                
                const playerMatches = allMatches.filter(match => {
                    const playerInTeam1 = match.config.team1.players.some(p => p.id === userId);
                    const playerInTeam2 = match.config.team2.players.some(p => p.id === userId);
                    return playerInTeam1 || playerInTeam2;
                });

                const careerStats = calculateStats(playerMatches, userId);
                setStats(careerStats);

            } catch (error) {
                console.error("Error fetching player data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, calculateStats]);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading player profile...</div>;
    }
    
    if (!profile || !stats) {
        return <div className="flex items-center justify-center min-h-screen">Player not found.</div>;
    }

    return (
        <div className="min-h-screen bg-secondary/30 text-foreground font-body">
             <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div className='flex flex-col items-center'>
                    <h1 className="text-2xl font-bold">Player Profile</h1>
                    <p className="text-sm text-muted-foreground">{profile.name}</p>
                </div>
                <div className="w-10"></div>
            </header>
            <main className="p-4 md:p-8 flex flex-col items-center gap-6">
                <Card className="w-full max-w-2xl shadow-lg">
                    <CardHeader className="items-center text-center">
                        <Image 
                            src={profile.photoURL || `https://picsum.photos/seed/${profile.uid}/100/100`} 
                            alt="Profile Picture" 
                            width={100}
                            height={100}
                            className="rounded-full border-4 border-primary"
                        />
                        <CardTitle className="mt-4">{profile.name}</CardTitle>
                        <CardDescription>Matches Played: {stats.matches}</CardDescription>
                    </CardHeader>
                </Card>
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CricketBatIcon className="h-6 w-6 text-primary" />
                            Batting Career
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <TableRow><TableCell>Runs</TableCell><TableCell className="text-right font-bold">{stats.runs}</TableCell></TableRow>
                                <TableRow><TableCell>Strike Rate</TableCell><TableCell className="text-right">{stats.strikeRate.toFixed(2)}</TableCell></TableRow>
                                <TableRow><TableCell>Average</TableCell><TableCell className="text-right">{stats.battingAverage.toFixed(2)}</TableCell></TableRow>
                                <TableRow><TableCell>50s</TableCell><TableCell className="text-right">{stats.fifties}</TableCell></TableRow>
                                <TableRow><TableCell>100s</TableCell><TableCell className="text-right">{stats.hundreds}</TableCell></TableRow>
                                <TableRow><TableCell>Best Innings</TableCell><TableCell className="text-right">{stats.bestScore.runs}{stats.bestScore.isOut ? '' : '*'}</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <CricketBallIcon className="h-6 w-6 text-primary" />
                            Bowling Career
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableBody>
                                <TableRow><TableCell>Wickets</TableCell><TableCell className="text-right font-bold">{stats.wickets}</TableCell></TableRow>
                                <TableRow><TableCell>Average</TableCell><TableCell className="text-right">{stats.bowlingAverage.toFixed(2)}</TableCell></TableRow>
                                <TableRow><TableCell>Economy</TableCell><TableCell className="text-right">{stats.economy.toFixed(2)}</TableCell></TableRow>
                                <TableRow><TableCell>Best Bowling</TableCell><TableCell className="text-right">{stats.bestBowling.wickets}/{stats.bestBowling.runs}</TableCell></TableRow>
                                <TableRow><TableCell>5-Wicket Hauls</TableCell><TableCell className="text-right">{stats.fiveWicketHauls}</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

export default CareerStatsPage;

    