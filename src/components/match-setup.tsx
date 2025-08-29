
'use client';
import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CricketBallIcon, CricketBatIcon } from '@/components/icons';
import { User, Users, Swords, Trophy, Plus, Trash2, Shield, UserCheck, UserPlus, Settings } from 'lucide-react';
import type { MatchConfig, MatchState, Innings, Player as PlayerType, Team, Tournament, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { PlayerSearchDialog } from './player-search-dialog';
import { useToast } from '@/hooks/use-toast';

const playerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Player name can't be empty"),
});

const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required.'),
  players: z.array(playerSchema).min(2, 'At least 2 players are required.'),
  captainId: z.string().optional(),
  wicketKeeperId: z.string().optional(),
  twelfthManId: z.string().optional(),
});

const setupSchema = z.object({
  team1: teamSchema,
  team2: teamSchema,
  oversPerInnings: z.number().min(1, 'Overs must be at least 1').max(100, 'Overs cannot exceed 100'),
  playersPerSide: z.number().min(2, "At least 2 players required").max(11, 'Maximum 11 players allowed'),
  toss: z.object({
    winner: z.enum(['team1', 'team2']),
    decision: z.enum(['bat', 'bowl']),
  }),
  opening: z.object({
    strikerId: z.string().min(1, 'Please select a striker.'),
    nonStrikerId: z.string().min(1, 'Please select a non-striker.'),
    bowlerId: z.string().min(1, 'Please select an opening bowler.'),
  }).refine(data => data.strikerId !== data.nonStrikerId, {
    message: "Striker and non-striker must be different players.",
    path: ["nonStrikerId"],
  }),
  matchType: z.string().optional(),
  matchFormat: z.string().optional(),
  tournamentId: z.string().optional(),
  tournamentStage: z.string().optional(),
  venue: z.string().optional(),
  ballsPerOver: z.number().min(1).optional(),
  noBall: z.object({ enabled: z.boolean(), reball: z.boolean(), run: z.number() }).optional(),
  wideBall: z.object({ enabled: z.boolean(), reball: z.boolean(), run: z.number() }).optional(),
});

type SetupFormValues = z.infer<typeof setupSchema>;

const ADVANCED_SETTINGS_KEY = 'cricketAdvancedSettings';

const defaultValues: Partial<SetupFormValues> = {
  team1: { name: '', players: Array(11).fill(0).map((_, i) => ({ name: '', id: `t1p${i}` })) },
  team2: { name: '', players: Array(11).fill(0).map((_, i) => ({ name: '', id: `t2p${i}` })) },
  oversPerInnings: 20,
  playersPerSide: 11,
  toss: { winner: 'team1', decision: 'bat' },
  matchFormat: 'T20',
  ballsPerOver: 6,
  noBall: { enabled: true, reball: true, run: 1 },
  wideBall: { enabled: true, reball: true, run: 1 },
};

const createInitialState = (config: MatchConfig, userId?: string | null, matchId?: string): MatchState => {
  const { team1, team2, toss, opening, oversPerInnings } = config;
  
  const battingTeamKey = (toss.winner === 'team1' && toss.decision === 'bat') || (toss.winner === 'team2' && toss.decision === 'bowl') ? 'team1' : 'team2';
  const bowlingTeamKey = battingTeamKey === 'team1' ? 'team2' : 'team1';

  const createInnings = (bTKey: 'team1' | 'team2', boTKey: 'team1' | 'team2'): Innings => {
    const bTeam = bTKey === 'team1' ? team1 : team2;
    const boTeam = boTKey === 'team1' ? team1 : team2;
    return {
      battingTeam: bTKey,
      bowlingTeam: boTKey,
      score: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      timeline: [],
      batsmen: bTeam.players.reduce((acc, p) => ({ ...acc, [p.id]: { ...p, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false } }), {}),
      bowlers: boTeam.players.reduce((acc, p) => ({ ...acc, [p.id]: { ...p, overs: 0, balls: 0, maidens: 0, runsConceded: 0, wickets: 0 } }), {}),
      currentPartnership: {
        batsman1Id: opening.strikerId,
        batsman2Id: opening.nonStrikerId,
        runs: 0,
        balls: 0,
      },
      fallOfWickets: []
    }
  };

  return {
    id: matchId,
    config,
    innings1: createInnings(battingTeamKey, bowlingTeamKey),
    currentInnings: 'innings1',
    onStrikeId: opening.strikerId,
    nonStrikeId: opening.nonStrikerId,
    currentBowlerId: opening.bowlerId,
    matchOver: false,
    resultText: 'Match in progress...',
    userId: userId || undefined,
  };
};

export default function MatchSetup({ onSetupComplete }: { onSetupComplete: (matchId: string) => void; }) {
  const [step, setStep] = useState(1);
  const [savedTeams, setSavedTeams] = useState<Team[]>([]);
  const [playerSearchOpen, setPlayerSearchOpen] = useState(false);
  const [editingTeamKey, setEditingTeamKey] = useState<'team1' | 'team2' | null>(null);
  const { toast } = useToast();

  const router = useRouter();
  const { user } = useAuth();
  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    const fetchTeams = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "teams"));
            const teams = querySnapshot.docs.map(doc => doc.data() as Team);
            setSavedTeams(teams);
        } catch (e) {
            console.error("Failed to parse teams from firestore", e);
        }
    };
    fetchTeams();

    const savedSettings = localStorage.getItem(ADVANCED_SETTINGS_KEY);
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        form.setValue('noBall', settings.noBall);
        form.setValue('wideBall', settings.wideBall);
        form.setValue('ballsPerOver', settings.ballsPerOver);
    }
  }, [form]);

  const { fields: team1Players, append: appendT1, remove: removeT1 } = useFieldArray({ control: form.control, name: "team1.players" });
  const { fields: team2Players, append: appendT2, remove: removeT2 } = useFieldArray({ control: form.control, name: "team2.players" });
  
  const playersPerSide = form.watch('playersPerSide');
  const matchType = form.watch('matchType');
  const matchFormat = form.watch('matchFormat');

  useEffect(() => {
    const adjustPlayers = (
      currentPlayers: {name: string, id: string}[],
      appendFn: (items: { name: string, id: string }[]) => void,
      removeFn: (indices: number | number[]) => void,
      teamPrefix: string
    ) => {
        const currentLength = currentPlayers.length;
        if (playersPerSide < 2 || playersPerSide > 11) return;
        const difference = playersPerSide - currentLength;
        if (difference > 0) {
            appendFn(Array.from({length: difference}, (_, i) => ({ name: '', id: `${teamPrefix}p${currentLength + i}` })));
        } else if (difference < 0) {
            const indicesToRemove = Array.from({ length: Math.abs(difference) }, (_, i) => currentLength - 1 - i);
            removeFn(indicesToRemove);
        }
    };
    
    if (form.formState.isDirty) {
      adjustPlayers(form.getValues('team1.players'), appendT1, removeT1, 't1');
      adjustPlayers(form.getValues('team2.players'), appendT2, removeT2, 't2');
    }
  }, [playersPerSide, form, appendT1, removeT1, appendT2, removeT2]);
  
  useEffect(() => {
    switch (matchFormat) {
      case 'T20':
        form.setValue('oversPerInnings', 20);
        break;
      case 'ODI':
        form.setValue('oversPerInnings', 50);
        break;
      default:
        break;
    }
  }, [matchFormat, form]);


  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);
  
  const handleTeamSelect = (teamName: string, teamKey: 'team1' | 'team2') => {
    const selectedTeam = savedTeams.find(t => t.name === teamName);
    if (selectedTeam) {
      form.setValue(`${teamKey}.name`, selectedTeam.name);
      form.setValue(`${teamKey}.players`, selectedTeam.players.slice(0, playersPerSide));
      form.setValue('playersPerSide', selectedTeam.players.length);
    }
  };
  
  const handleOpenPlayerSearch = (teamKey: 'team1' | 'team2') => {
    setEditingTeamKey(teamKey);
    setPlayerSearchOpen(true);
  };
  
  const handlePlayerSelect = (player: UserProfile) => {
    if (!editingTeamKey) return;
    
    const teamPlayers = form.getValues(`${editingTeamKey}.players`);
    const isAlreadyAdded = teamPlayers.some(p => p.id === player.uid);
    if(isAlreadyAdded) {
        toast({ title: "Player already in team", variant: "destructive" });
        return;
    }
    
    const emptyPlayerIndex = teamPlayers.findIndex(p => !p.name);

    if (emptyPlayerIndex !== -1) {
        form.setValue(`${editingTeamKey}.players.${emptyPlayerIndex}.name`, player.name);
        form.setValue(`${editingTeamKey}.players.${emptyPlayerIndex}.id`, player.uid);
    } else {
        toast({ title: "Team is full", description: "Remove a player to add a new one.", variant: "destructive" });
    }
  };

  const onSubmit = async (data: SetupFormValues) => {
    const finalConfig: MatchConfig = {
      ...data,
      team1: { ...data.team1 },
      team2: { ...data.team2 },
    };
    
    const matchId = `${finalConfig.team1.name.replace(/\s+/g, '-')}-vs-${finalConfig.team2.name.replace(/\s+/g, '-')}-${Date.now()}`;
    const initialState = createInitialState(finalConfig, user?.uid, matchId);
    
    try {
        await setDoc(doc(db, "matches", matchId), initialState);
        onSetupComplete(matchId);
    } catch (e) {
        console.error("Error adding document: ", e);
    }
  };

  const getTeamWithIds = (teamKey: 'team1' | 'team2') => {
    return form.watch(teamKey);
  }

  return (
    <div className="w-full mx-auto">
      <PlayerSearchDialog open={playerSearchOpen} onOpenChange={setPlayerSearchOpen} onPlayerSelect={handlePlayerSelect} />
      <CardHeader className="px-0">
        <CardTitle className="text-center text-xl font-semibold flex items-center justify-center gap-2 text-black">
          <Users className="h-6 w-6 text-primary" />
            {step === 1 && "Match Details"}
            {step === 2 && "Assign Roles"}
            {step === 3 && "Toss"}
            {step === 4 && "Opening Lineup"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <CardContent className="p-0 space-y-6">
          {step === 1 && (
            <div className="space-y-6">
                <div className="space-y-2">
                  <Link href="/advanced-settings">
                    <Button variant="outline" className="w-full">
                      <Settings className="mr-2 h-4 w-4" />
                      Advanced Settings
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Match Format</Label>
                    <Controller
                        control={form.control}
                        name="matchFormat"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select Match Format" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Test">Test</SelectItem>
                              <SelectItem value="ODI">ODI</SelectItem>
                              <SelectItem value="T20">T20</SelectItem>
                              <SelectItem value="100 balls">The Hundred</SelectItem>
                              <SelectItem value="Limited Overs">Limited Overs</SelectItem>
                              <SelectItem value="Custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                  </div>
                  <div className="space-y-2">
                    <Label>Match Type</Label>
                    <Controller
                        control={form.control}
                        name="matchType"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select Match Type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Tournament">Tournament</SelectItem>
                              <SelectItem value="Series">Series</SelectItem>
                              <SelectItem value="Friendly">Friendly</SelectItem>
                              <SelectItem value="Practice">Practice</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 items-end">
                    <div>
                        <Label htmlFor="overs" className="text-black">Total Overs</Label>
                        <Input 
                            id="overs" 
                            type="number" 
                            {...form.register('oversPerInnings', { valueAsNumber: true })}
                            className="w-full mx-auto mt-2 text-center text-lg" 
                            disabled={['ODI', 'T20'].includes(matchFormat || '')}
                        />
                        {form.formState.errors.oversPerInnings && <p className="text-destructive text-sm mt-2">{form.formState.errors.oversPerInnings.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="players" className="text-black">Players per Side</Label>
                        <Input 
                            id="players" 
                            type="number" 
                            {...form.register('playersPerSide', { valueAsNumber: true })}
                            className="w-full mx-auto mt-2 text-center text-lg" 
                        />
                         {form.formState.errors.playersPerSide && <p className="text-destructive text-sm mt-2">{form.formState.errors.playersPerSide.message}</p>}
                    </div>
                </div>
                
                {matchType === 'Tournament' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tournament Name</Label>
                      <Input {...form.register('tournamentId')} placeholder="e.g. Premier League" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tournament Stage</Label>
                       <Controller
                          control={form.control}
                          name="tournamentStage"
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger><SelectValue placeholder="Select Tournament Stage" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Group Match">Group Match</SelectItem>
                                <SelectItem value="Quarter Final">Quarter Final</SelectItem>
                                <SelectItem value="Semi Final">Semi Final</SelectItem>
                                <SelectItem value="Final">Final</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Venue (Optional)</Label>
                  <Input {...form.register('venue')} placeholder="e.g. Colombo Stadium" />
                </div>


              {[ 'team1', 'team2' ].map((teamKey) => {
                const teamIndex = teamKey === 'team1' ? 0 : 1;
                const players = teamKey === 'team1' ? team1Players : team2Players;
                const removeFn = teamKey === 'team1' ? removeT1 : removeT2;

                return (
                  <div key={teamKey} className="space-y-3 pt-4">
                    <h3 className="font-bold text-lg">Team {form.watch(`${teamKey}.name`) || (teamIndex === 0 ? 'A' : 'B')}</h3>
                    
                    {savedTeams.length > 0 && (
                      <Select onValueChange={(val) => handleTeamSelect(val, teamKey as 'team1' | 'team2')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Load a saved team" />
                        </SelectTrigger>
                        <SelectContent>
                          {savedTeams.map(team => <SelectItem key={team.name} value={team.name}>{team.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}

                    <Input {...form.register(`${teamKey}.name` as 'team1.name' | 'team2.name')} placeholder="Enter Team Name" className="bg-white rounded-lg text-black"/>
                    {form.formState.errors[teamKey as 'team1' | 'team2']?.name && <p className="text-destructive text-sm -mt-2 mb-2 px-2">{form.formState.errors[teamKey as 'team1' | 'team2']?.name?.message}</p>}
                    
                    <div className="space-y-2">
                      {players.map((player, index) => (
                        <div key={player.id} className="flex gap-2 items-center">
                          <Input {...form.register(`${teamKey}.players.${index}.name` as `team1.players.${number}.name` | `team2.players.${number}.name`)} placeholder={`Player ${index + 1}`} className="bg-white rounded-lg text-black"/>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeFn(index)} disabled={players.length <= 2}>
                            <Trash2 className="h-5 w-5 text-gray-500"/>
                          </Button>
                        </div>
                      ))}
                    </div>
                     <Button type="button" onClick={() => handleOpenPlayerSearch(teamKey as 'team1' | 'team2')} className="w-full justify-between bg-white text-gray-600 hover:bg-gray-100 rounded-lg shadow-sm border">
                      Add Player from Search
                      <div className="bg-green-500 text-white rounded-md p-1">
                        <Plus className="h-5 w-5" />
                      </div>
                    </Button>
                    {form.formState.errors[teamKey as 'team1' | 'team2']?.players && <p className="text-destructive text-sm px-2">{form.formState.errors[teamKey as 'team1' | 'team2']?.players?.message || form.formState.errors[teamKey as 'team1' | 'team2']?.players?.root?.message}</p>}
                  </div>
                )
              })}
            </div>
          )}

          {step === 2 && (
             <div className="space-y-6">
               {[ 'team1', 'team2' ].map((teamKey) => {
                 const team = getTeamWithIds(teamKey as 'team1' | 'team2');
                 return (
                   <div key={teamKey} className="space-y-4">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Shield className="text-primary h-5 w-5"/>
                        Assign Roles for {team.name}
                      </h3>
                      <div className="space-y-2">
                        <Label>Captain</Label>
                         <Controller
                          control={form.control}
                          name={`${teamKey}.captainId` as 'team1.captainId' | 'team2.captainId'}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger><SelectValue placeholder="Select Captain" /></SelectTrigger>
                              <SelectContent>
                                {team.players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                       <div className="space-y-2">
                        <Label>Wicketkeeper</Label>
                         <Controller
                          control={form.control}
                          name={`${teamKey}.wicketKeeperId` as 'team1.wicketKeeperId' | 'team2.wicketKeeperId'}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger><SelectValue placeholder="Select Wicketkeeper" /></SelectTrigger>
                              <SelectContent>
                                {team.players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                       <div className="space-y-2">
                        <Label>12th Man (Optional)</Label>
                         <Controller
                          control={form.control}
                          name={`${teamKey}.twelfthManId` as 'team1.twelfthManId' | 'team2.twelfthManId'}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger><SelectValue placeholder="Select 12th Man" /></SelectTrigger>
                              <SelectContent>
                                {team.players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                   </div>
                 )
               })}
             </div>
          )}

          {step === 3 && (
             <div className="space-y-8 text-center">
                <Controller
                  control={form.control}
                  name="toss"
                  render={({ field }) => (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2 text-center flex items-center justify-center gap-2"><Trophy className="text-primary h-5 w-5"/> Toss Winner</h3>
                         <RadioGroup onValueChange={(val) => field.onChange({...field.value, winner: val as 'team1' | 'team2'})} defaultValue={field.value.winner} className="bg-secondary p-2 rounded-lg grid grid-cols-2 gap-2">
                            <Label htmlFor="t1" className={cn("p-2 rounded-md text-center", field.value.winner === 'team1' && "bg-background shadow-sm")}>
                              <RadioGroupItem value="team1" id="t1" className="sr-only"/>
                              {form.watch('team1.name') || 'Team A'}
                            </Label>
                             <Label htmlFor="t2" className={cn("p-2 rounded-md text-center", field.value.winner === 'team2' && "bg-background shadow-sm")}>
                              <RadioGroupItem value="team2" id="t2" className="sr-only"/>
                              {form.watch('team2.name') || 'Team B'}
                            </Label>
                        </RadioGroup>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2 text-center flex items-center justify-center gap-2"><Swords className="text-primary h-5 w-5"/> Decision</h3>
                         <RadioGroup onValueChange={(val) => field.onChange({...field.value, decision: val as 'bat' | 'bowl'})} defaultValue={field.value.decision} className="bg-secondary p-2 rounded-lg grid grid-cols-2 gap-2">
                             <Label htmlFor="bat" className={cn("p-2 rounded-md text-center flex items-center justify-center gap-2", field.value.decision === 'bat' && "bg-background shadow-sm")}>
                              <RadioGroupItem value="bat" id="bat" className="sr-only"/>
                              <CricketBatIcon className="h-4 w-4"/> Bat
                            </Label>
                             <Label htmlFor="bowl" className={cn("p-2 rounded-md text-center flex items-center justify-center gap-2", field.value.decision === 'bowl' && "bg-background shadow-sm")}>
                              <RadioGroupItem value="bowl" id="bowl" className="sr-only"/>
                              <CricketBallIcon className="h-4 w-4"/> Bowl
                            </Label>
                        </RadioGroup>
                      </div>
                    </div>
                  )}
                />
             </div>
          )}

          {step === 4 && (() => {
            const tossWinnerKey = form.watch('toss.winner');
            const tossDecision = form.watch('toss.decision');
            const battingTeamKey = (tossWinnerKey === 'team1' && tossDecision === 'bat') || (tossWinnerKey === 'team2' && tossDecision === 'bowl') ? 'team1' : 'team2';
            const bowlingTeamKey = battingTeamKey === 'team1' ? 'team2' : 'team1';
            
            const battingTeam = getTeamWithIds(battingTeamKey);
            const bowlingTeam = getTeamWithIds(bowlingTeamKey);

            const battingPlayers = battingTeam.players;
            const bowlingPlayers = bowlingTeam.players;

            return (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><CricketBatIcon className="text-primary h-5 w-5"/> Batting Team: {battingTeam.name}</h3>
                  <div className="space-y-4">
                    <Controller
                      control={form.control}
                      name="opening.strikerId"
                      render={({ field }) => (
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <SelectTrigger><SelectValue placeholder="Select Striker" /></SelectTrigger>
                           <SelectContent>
                             {battingPlayers.map(p => <SelectItem key={p.id} value={p.id} disabled={p.id === form.watch('opening.nonStrikerId')}>{p.name}</SelectItem>)}
                           </SelectContent>
                         </Select>
                      )}
                    />
                     <Controller
                      control={form.control}
                      name="opening.nonStrikerId"
                      render={({ field }) => (
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <SelectTrigger><SelectValue placeholder="Select Non-Striker" /></SelectTrigger>
                           <SelectContent>
                             {battingPlayers.map(p => <SelectItem key={p.id} value={p.id} disabled={p.id === form.watch('opening.strikerId')}>{p.name}</SelectItem>)}
                           </SelectContent>
                         </Select>
                      )}
                    />
                    {form.formState.errors.opening?.nonStrikerId && <p className="text-destructive text-sm">{form.formState.errors.opening.nonStrikerId.message}</p>}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2"><CricketBallIcon className="text-primary h-5 w-5"/> Bowling Team: {bowlingTeam.name}</h3>
                   <Controller
                      control={form.control}
                      name="opening.bowlerId"
                      render={({ field }) => (
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <SelectTrigger><SelectValue placeholder="Select Opening Bowler" /></SelectTrigger>
                           <SelectContent>
                             {bowlingPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                           </SelectContent>
                         </Select>
                      )}
                    />
                </div>
              </div>
            )
          })()}
        </CardContent>
        <div className="flex flex-col gap-2">
            {step > 1 && <Button type="button" variant="outline" onClick={prevStep}>Back</Button>}
            
            {step < 4 ? (
                <Button 
                    type="button" 
                    className="w-full bg-green-600 hover:bg-green-700 text-lg py-6" 
                    onClick={async () => {
                        const stepFields: (keyof SetupFormValues | 'team1.name' | 'team2.name')[] = [
                          ['team1.name', 'team2.name', 'oversPerInnings', 'playersPerSide'], 
                          ['team1.captainId', 'team1.wicketKeeperId', 'team2.captainId', 'team2.wicketKeeperId'],
                          ['toss'],
                        ][step - 1] as any;
                        
                        const result = await form.trigger(stepFields);
                        if(result) nextStep();
                    }}
                >
                    Next : {step === 1 ? 'Assign Roles' : step === 2 ? 'Toss' : 'Opening Lineup'}
                </Button>
            ) : (
                <Button type="button" onClick={form.handleSubmit(onSubmit)} className="w-full bg-green-600 hover:bg-green-700 text-lg py-6">
                    Start Match
                </Button>
            )}
        </div>
      </form>
    </div>
  );
}
