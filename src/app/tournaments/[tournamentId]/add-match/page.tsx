
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarIcon, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tournament, Team, Player, TournamentMatch } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, query, collection, where, getDocs } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';

function ChipButton({ label, isSelected, onClick }: { label: string; isSelected: boolean; onClick: () => void }) {
    return (
        <Button
            type="button"
            variant={isSelected ? 'default' : 'outline'}
            className={cn(
                "rounded-full border-gray-600 hover:bg-gray-700",
                isSelected && "bg-green-500 hover:bg-green-600 border-green-500"
            )}
            onClick={onClick}
        >
            {label}
        </Button>
    )
}

function TeamSelectionDialog({
    open,
    onOpenChange,
    teams,
    onTeamSelect,
    excludeTeamName,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teams: Team[];
    onTeamSelect: (team: Team) => void;
    excludeTeamName?: string;
}) {
    const availableTeams = teams.filter(t => t.name !== excludeTeamName);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-gray-800 text-white border-gray-700">
                <DialogHeader>
                    <DialogTitle>Select a Team</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {availableTeams.map(team => (
                        <div
                            key={team.id}
                            className="flex items-center gap-4 p-2 rounded-md hover:bg-gray-700 cursor-pointer"
                            onClick={() => {
                                onTeamSelect(team);
                                onOpenChange(false);
                            }}
                        >
                            <Image src={team.logoUrl || `https://picsum.photos/seed/${team.id}/40/40`} alt={team.name} width={40} height={40} className="rounded-full" />
                            <span className="font-semibold">{team.name}</span>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}


export default function AddMatchPage() {
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [allTeams, setAllTeams] = useState<Team[]>([]);
    const [team1, setTeam1] = useState<Team | null>(null);
    const [team2, setTeam2] = useState<Team | null>(null);
    
    const [matchRound, setMatchRound] = useState<'League' | 'Quarter Final' | 'Semi Final' | 'Final'>('League');
    const [matchDate, setMatchDate] = useState<Date | undefined>(new Date());
    const [matchTime, setMatchTime] = useState<string>(format(new Date(), 'HH:mm'));

    const [isTeam1DialogOpen, setTeam1DialogOpen] = useState(false);
    const [isTeam2DialogOpen, setTeam2DialogOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const tournamentId = params.tournamentId as string;
    const searchParams = useSearchParams();
    const groupName = searchParams.get('group');

    const fetchTournamentAndTeams = useCallback(async () => {
        if (!tournamentId) return;

        const unsubTournament = onSnapshot(doc(db, "tournaments", tournamentId), (doc) => {
            if (doc.exists()) {
                const tourneyData = { ...doc.data() as Tournament, id: doc.id };
                setTournament(tourneyData);
                
                const teamsToFetch = (tourneyData.qualifiedTeams && tourneyData.qualifiedTeams.length > 0) 
                    ? tourneyData.qualifiedTeams 
                    : tourneyData.participatingTeams;

                if (teamsToFetch && teamsToFetch.length > 0) {
                     const chunks = [];
                    for (let i = 0; i < teamsToFetch.length; i += 30) {
                        chunks.push(teamsToFetch.slice(i, i + 30));
                    }
                    
                    const teamPromises = chunks.map(chunk => getDocs(query(collection(db, "teams"), where("name", "in", chunk))));
                    
                    Promise.all(teamPromises).then(teamSnapshots => {
                        const teamsData: Team[] = [];
                        teamSnapshots.forEach(snapshot => {
                            snapshot.forEach(d => teamsData.push({ ...d.data(), id: d.id } as Team));
                        });
                        setAllTeams(teamsData);
                    });
                }
            } else {
                toast({ title: "Error", description: "Tournament not found.", variant: "destructive" });
                router.push('/tournaments');
            }
            setLoading(false);
        });

        return unsubTournament;
    }, [tournamentId, router, toast]);

    useEffect(() => {
        const unsubscribe = fetchTournamentAndTeams();
        return () => {
            unsubscribe.then(unsub => unsub && unsub());
        }
    }, [fetchTournamentAndTeams]);

    const handleScheduleMatch = async () => {
        if (!team1 || !team2) {
            toast({ title: "Selection Error", description: "Please select both teams.", variant: "destructive" });
            return;
        }
        if (!matchDate || !matchTime) {
            toast({ title: "Date/Time Error", description: "Please set a date and time for the match.", variant: "destructive" });
            return;
        }

        const [hours, minutes] = matchTime.split(':').map(Number);
        const finalMatchDate = new Date(matchDate);
        finalMatchDate.setHours(hours, minutes);

        const newMatch: TournamentMatch = {
            id: `match-${team1.id}-vs-${team2.id}-${Date.now()}`,
            groupName: groupName || '',
            team1: team1.name,
            team2: team2.name,
            status: 'Upcoming',
            date: finalMatchDate.toISOString(),
            venue: tournament?.location || 'TBD',
            matchRound: matchRound,
        };

        try {
            const tournamentRef = doc(db, "tournaments", tournamentId);
            await updateDoc(tournamentRef, {
                matches: arrayUnion(newMatch)
            });
            toast({ title: "Match Scheduled!", description: `${team1.name} vs ${team2.name} has been added.` });
            router.push(`/tournaments/${tournamentId}`);
        } catch (e) {
            console.error("Error scheduling match: ", e);
            toast({ title: "Error", description: "Could not schedule the match.", variant: 'destructive' });
        }
    };
    
    if (loading) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">Loading...</div>;
    }
    
    const displayedTeams = groupName 
      ? allTeams.filter(team => tournament?.groups?.find(g => g.name === groupName)?.teams.includes(team.name))
      : allTeams;

    const handleTeamCheck = (team: Team, teamSlot: 'team1' | 'team2') => {
        if (teamSlot === 'team1') {
            if (team1?.id === team.id) setTeam1(null);
            else if (team2?.id !== team.id) setTeam1(team);
        } else {
            if (team2?.id === team.id) setTeam2(null);
            else if (team1?.id !== team.id) setTeam2(team);
        }
    }


    return (
        <div className="min-h-screen bg-gray-900 text-white font-body">
            <header className="py-4 px-4 md:px-6">
                <div className="relative text-center">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="absolute left-0 top-1/2 -translate-y-1/2 hover:bg-gray-800"><ArrowLeft className="h-6 w-6" /></Button>
                    <h1 className="text-2xl font-bold">Schedule a New Match</h1>
                    <p className="text-sm text-muted-foreground">{groupName ? `Group: ${groupName}` : "Choose teams and set the date and time."}</p>
                </div>
            </header>

            <main className="p-4 md:p-8 flex flex-col items-center gap-8">
                {/* Team Selection */}
                <div className="w-full max-w-2xl grid grid-cols-[1fr,auto,1fr] items-start gap-4">
                    <div className="flex flex-col items-center gap-3">
                        <Image src={team1?.logoUrl || `https://picsum.photos/seed/team1/80/80`} alt={team1?.name || "Team 1"} width={80} height={80} className="rounded-full bg-gray-700" />
                        <span className="font-semibold text-center">{team1?.name || "Team 1"}</span>
                    </div>
                    <span className="text-2xl font-bold self-center pt-8">VS</span>
                    <div className="flex flex-col items-center gap-3">
                        <Image src={team2?.logoUrl || `https://picsum.photos/seed/team2/80/80`} alt={team2?.name || "Team 2"} width={80} height={80} className="rounded-full bg-gray-700" />
                        <span className="font-semibold text-center">{team2?.name || "Team 2"}</span>
                    </div>
                </div>

                {/* Team & Match Details */}
                <div className="w-full max-w-md space-y-6">
                    <div className="space-y-2">
                        <Label className="font-semibold">Select Team</Label>
                        <Accordion type="multiple" className="w-full bg-gray-800 rounded-lg p-2">
                             {(tournament?.groups || []).filter(g => !groupName || g.name === groupName).map(group => (
                                <AccordionItem value={group.name} key={group.name}>
                                    <AccordionTrigger>{group.name}</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-2">
                                            {allTeams.filter(t => group.teams.includes(t.name)).map(team => (
                                                <div key={team.id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700">
                                                    <Checkbox
                                                        id={`team-${team.id}`}
                                                        checked={team1?.id === team.id || team2?.id === team.id}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                if (!team1) handleTeamCheck(team, 'team1');
                                                                else if (!team2) handleTeamCheck(team, 'team2');
                                                            } else {
                                                                if (team1?.id === team.id) setTeam1(null);
                                                                if (team2?.id === team.id) setTeam2(null);
                                                            }
                                                        }}
                                                        disabled={(team1 && team2) ? !(team1.id === team.id || team2.id === team.id) : false}
                                                    />
                                                    <label
                                                        htmlFor={`team-${team.id}`}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                    >
                                                        {team.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-semibold">Match Round</Label>
                        <div className="flex flex-wrap gap-2">
                            <ChipButton label="League" isSelected={matchRound === 'League'} onClick={() => setMatchRound('League')} />
                            <ChipButton label="Quarter Final" isSelected={matchRound === 'Quarter Final'} onClick={() => setMatchRound('Quarter Final')} />
                            <ChipButton label="Semi Final" isSelected={matchRound === 'Semi Final'} onClick={() => setMatchRound('Semi Final')} />
                            <ChipButton label="Final" isSelected={matchRound === 'Final'} onClick={() => setMatchRound('Final')} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal bg-gray-800 border-gray-600", !matchDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {matchDate ? format(matchDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700 text-white">
                                    <Calendar mode="single" selected={matchDate} onSelect={setMatchDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor='time'>Time</Label>
                            <Input id="time" type="time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} className="bg-gray-800 border-gray-600" />
                        </div>
                    </div>
                </div>

                {/* Schedule Button */}
                <div className="w-full max-w-md">
                     <Button onClick={handleScheduleMatch} className="w-full h-12 text-lg bg-primary hover:bg-primary/90">
                        Schedule Match
                     </Button>
                </div>
            </main>
        </div>
    );
}
