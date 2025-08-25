

'use client';

import { useReducer, useState, useEffect, useMemo, useCallback } from 'react';
import type { MatchState, Innings, BallEvent, Player, MatchConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TargetIcon, CricketBatIcon, CricketBallIcon } from './icons';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Undo, RefreshCw, ArrowRight, ArrowLeftRight, Settings2, Home, X, ArrowLeft } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Input } from './ui/input';
import ScorecardDisplay from './scorecard-display';


type Action =
  | { type: 'BALL_EVENT'; payload: { runs: number; isExtra: boolean; extraType?: 'wd' | 'nb' | 'by' | 'lb'; } }
  | { type: 'WICKET'; payload: { dismissalType: string; newBatsmanId: string; fielderId?: string; } }
  | { type: 'SWAP_STRIKER' }
  | { type: 'CHANGE_BOWLER'; payload: { newBowlerId: string } }
  | { type: 'TRIGGER_BOWLER_CHANGE' }
  | { type: 'SETUP_NEXT_INNINGS'; payload: { strikerId: string, nonStrikerId: string, bowlerId: string, revisedTarget?: number, revisedOvers?: number } }
  | { type: 'TOGGLE_TICKER'; payload: { ticker: 'onStrike' | 'nonStrike' | 'bowler' | 'summary' | 'partnership' | 'tourName' | 'battingCard' | 'bowlingCard' | 'target' } }
  | { type: 'RETIRE_BATSMAN'; payload: { retiringBatsmanId: string, newBatsmanId: string } }
  | { type: 'END_INNINGS_MANUALLY' }
  | { type: 'RESET_STATE'; payload: MatchState };

const formatOvers = (balls: number, ballsPerOver: number = 6) => `${Math.floor(balls / ballsPerOver)}.${balls % ballsPerOver}`;

const createInnings = (battingTeamKey: 'team1' | 'team2', bowlingTeamKey: 'team1' | 'team2', config: MatchState['config'], opening: { strikerId: string, nonStrikerId: string }): Innings => {
  const battingTeam = battingTeamKey === 'team1' ? config.team1 : config.team2;
  const bowlingTeam = bowlingTeamKey === 'team1' ? config.team1 : config.team2;
  return {
    battingTeam: battingTeamKey,
    bowlingTeam: bowlingTeamKey,
    score: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    timeline: [],
    batsmen: battingTeam.players.reduce((acc, p) => ({ ...acc, [p.id]: { ...p, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false } }), {}),
    bowlers: bowlingTeam.players.reduce((acc, p) => ({ ...acc, [p.id]: { ...p, overs: 0, balls: 0, maidens: 0, runsConceded: 0, wickets: 0 } }), {}),
    currentPartnership: {
      batsman1Id: opening.strikerId,
      batsman2Id: opening.nonStrikerId,
      runs: 0,
      balls: 0,
    },
    fallOfWickets: [],
  }
};


const matchReducer = (state: MatchState, action: Action): MatchState => {
  if (state.matchOver && action.type !== 'RESET_STATE') return state;
  
  const newState = JSON.parse(JSON.stringify(state));
  const { config } = newState;
  const { ballsPerOver, noBall, wideBall } = config;
  
  if (action.type === 'SETUP_NEXT_INNINGS') {
    const { innings1, config } = newState;
    const { revisedTarget, revisedOvers } = action.payload;
    const battingTeamKey = innings1.bowlingTeam;
    const bowlingTeamKey = innings1.battingTeam;
    
    newState.innings2 = createInnings(battingTeamKey, bowlingTeamKey, config, action.payload);
    newState.currentInnings = 'innings2';
    
    newState.onStrikeId = action.payload.strikerId;
    newState.nonStrikeId = action.payload.nonStrikerId;
    newState.currentBowlerId = action.payload.bowlerId;
    
    newState.target = revisedTarget || (innings1.score + 1);
    if(revisedOvers) {
      newState.revisedOvers = revisedOvers;
    }
    newState.isBowlerChangeRequired = false;
    newState.isEndOfInnings = false;
    
    return newState;
  }
    
  if(action.type === 'RESET_STATE') {
      return action.payload;
  }

  if (action.type === 'TOGGLE_TICKER') {
    if (newState.activeTicker === action.payload.ticker) {
      newState.activeTicker = null;
    } else {
      newState.activeTicker = action.payload.ticker;
    }
    return newState;
  }

  const currentInnings: Innings = newState.currentInnings === 'innings1' ? newState.innings1 : newState.innings2;
  
  const onStrikeBatsman = currentInnings.batsmen[state.onStrikeId];
  const currentBowler = currentInnings.bowlers[newState.currentBowlerId];
  const battingTeamConfig = currentInnings.battingTeam === 'team1' ? newState.config.team1 : newState.config.team2;
  const bowlingTeamConfig = currentInnings.bowlingTeam === 'team1' ? newState.config.team1 : newState.config.team2;

  const checkForMatchEnd = () => {
    const { innings1, innings2, target, config, revisedOvers } = newState;
    if (!innings1) return;

    if (newState.currentInnings === 'innings1') {
        const isAllOut = currentInnings.wickets === battingTeamConfig.players.length - 1;
        const isOversFinished = currentInnings.balls === config.oversPerInnings * ballsPerOver;
        if(isAllOut || isOversFinished) {
            newState.isEndOfInnings = true;
        }
        return;
    }
    
    if (newState.currentInnings !== 'innings2' || !innings2 || !target) return;
    
    const oversForInnings2 = revisedOvers || config.oversPerInnings;
    const isAllOut = innings2.wickets === battingTeamConfig.players.length - 1;
    const isOversFinished = innings2.balls === oversForInnings2 * ballsPerOver;
    const isTargetChased = innings2.score >= target;
    
    if (isTargetChased) {
        newState.matchOver = true;
        const wicketsRemaining = battingTeamConfig.players.length - 1 - innings2.wickets;
        newState.resultText = `${battingTeamConfig.name} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}.`;
        newState.winner = innings2.battingTeam;
        return;
    }
    
    if (isAllOut || isOversFinished) {
        newState.matchOver = true;
        if (innings2.score < target - 1) {
            const runsDiff = target - 1 - innings2.score;
            newState.resultText = `${bowlingTeamConfig.name} won by ${runsDiff} run${runsDiff !== 1 ? 's' : ''}.`;
            newState.winner = innings1.battingTeam;
        } else if (innings2.score === target - 1) {
            newState.resultText = "Match Tied.";
            newState.winner = 'draw';
        }
    }
}


  const checkForInningsEnd = (innings: Innings) => {
    const isAllOut = innings.wickets === battingTeamConfig.players.length - 1;
    const oversForCurrentInnings = (newState.currentInnings === 'innings2' && newState.revisedOvers) ? newState.revisedOvers : newState.config.oversPerInnings;
    const isOversFinished = innings.balls === oversForCurrentInnings * ballsPerOver;
    
    if (isAllOut || isOversFinished) {
        if (newState.currentInnings === 'innings1') {
            newState.isEndOfInnings = true;
        } else {
            checkForMatchEnd();
        }
    }
  }


  switch (action.type) {
    case 'BALL_EVENT': {
      const { runs, isExtra, extraType } = action.payload;
      const isLegalBall = !((extraType === 'wd' && wideBall.reball) || (extraType === 'nb' && noBall.reball));
      
      let eventRuns = runs;
      if (extraType === 'wd') eventRuns += wideBall.run;
      if (extraType === 'nb') eventRuns += noBall.run;
      
      currentInnings.score += eventRuns;
      currentBowler.runsConceded += eventRuns;

      const ballEvent: BallEvent = {
        ...action.payload,
        bowlerId: newState.currentBowlerId,
        isWicket: false,
        ballInOver: 0,
        batsmanId: state.onStrikeId
      };

      if (isLegalBall) {
        currentInnings.balls += 1;
        if(currentInnings.currentPartnership) currentInnings.currentPartnership.balls += 1;
        currentBowler.balls += 1;
        ballEvent.ballInOver = (currentInnings.balls -1) % ballsPerOver;
      }
      currentInnings.timeline.push(ballEvent);
      
      const runsFromBat = (!isExtra || extraType === 'nb') ? runs : 0;
      if (onStrikeBatsman && runsFromBat > 0) {
        onStrikeBatsman.runs += runsFromBat;
        if(currentInnings.currentPartnership) currentInnings.currentPartnership.runs += runsFromBat;
        if (runsFromBat === 4) onStrikeBatsman.fours = (onStrikeBatsman.fours || 0) + 1;
        if (runsFromBat === 6) onStrikeBatsman.sixes = (onStrikeBatsman.sixes || 0) + 1;
      }

      if(onStrikeBatsman && isLegalBall) {
        onStrikeBatsman.balls += 1;
      }
      
      if (runsFromBat > 0 && runsFromBat % 2 !== 0) {
        const temp = newState.onStrikeId;
        newState.onStrikeId = newState.nonStrikeId;
        newState.nonStrikeId = temp;
      }
      
      if (isLegalBall && currentInnings.balls % ballsPerOver === 0 && currentInnings.balls > 0) {
         const temp = newState.onStrikeId;
         newState.onStrikeId = newState.nonStrikeId;
         newState.nonStrikeId = temp;
         const oversForCurrentInnings = (newState.currentInnings === 'innings2' && newState.revisedOvers) ? newState.revisedOvers : newState.config.oversPerInnings;
         if (currentInnings.balls !== oversForCurrentInnings * ballsPerOver) {
           newState.isBowlerChangeRequired = true;
         }
      }
      
      checkForInningsEnd(currentInnings);
      if (newState.currentInnings === 'innings2') {
        checkForMatchEnd();
      }
      return newState;
    }
    case 'WICKET': {
      const { dismissalType, newBatsmanId, fielderId } = action.payload;
      
      currentInnings.balls += 1;
      currentBowler.balls += 1;
      onStrikeBatsman.balls += 1;
      if (currentInnings.currentPartnership) {
        currentInnings.currentPartnership.balls += 1;
      }
      
      currentInnings.wickets += 1;
      if(dismissalType !== 'Run out') {
        currentBowler.wickets += 1;
      }
      
      onStrikeBatsman.isOut = true;
      onStrikeBatsman.outInfo = {
        by: newState.currentBowlerId,
        method: dismissalType,
        fielderId: fielderId || '',
      };

      currentInnings.fallOfWickets.push({
        batsmanId: state.onStrikeId,
        score: currentInnings.score,
        overs: Math.floor(currentInnings.balls / ballsPerOver),
        balls: currentInnings.balls % ballsPerOver,
      });

      currentInnings.timeline.push({ runs: 0, isExtra: false, isWicket: true, wicketType: dismissalType, fielderId: fielderId || '', ballInOver: (currentInnings.balls - 1) % ballsPerOver, bowlerId: newState.currentBowlerId, batsmanId: state.onStrikeId });

      const isLastWicket = currentInnings.wickets === battingTeamConfig.players.length - 1;
      
      if (isLastWicket) {
          newState.onStrikeId = '';
          currentInnings.currentPartnership = { batsman1Id: '', batsman2Id: '', runs: 0, balls: 0 };
      } else {
           const remainingBatsmanId = newState.nonStrikeId;
           newState.onStrikeId = newBatsmanId;
           currentInnings.currentPartnership = {
              batsman1Id: remainingBatsmanId,
              batsman2Id: newBatsmanId,
              runs: 0,
              balls: 0,
            };
      }
      
      const oversForCurrentInnings = (newState.currentInnings === 'innings2' && newState.revisedOvers) ? newState.revisedOvers : newState.config.oversPerInnings;
       if (currentInnings.balls % ballsPerOver === 0 && currentInnings.balls > 0 && !isLastWicket) {
         const temp = newState.onStrikeId;
         newState.onStrikeId = newState.nonStrikeId;
         newState.nonStrikeId = temp;
         if (currentInnings.balls !== oversForCurrentInnings * ballsPerOver) {
          newState.isBowlerChangeRequired = true;
         }
      }
      
      checkForInningsEnd(currentInnings);
      if (newState.currentInnings === 'innings2') {
        checkForMatchEnd();
      }
      return newState;
    }
    case 'RETIRE_BATSMAN': {
      const { retiringBatsmanId, newBatsmanId } = action.payload;
      const retiringBatsman = currentInnings.batsmen[retiringBatsmanId];

      retiringBatsman.isOut = true;
      retiringBatsman.outInfo = {
        method: 'Retired',
        by: '', // No bowler involved
      };
      
      const isRetiringOnStrike = newState.onStrikeId === retiringBatsmanId;
      const otherBatsmanId = isRetiringOnStrike ? newState.nonStrikeId : newState.onStrikeId;

      if (isRetiringOnStrike) {
        newState.onStrikeId = newBatsmanId;
      } else {
        newState.nonStrikeId = newBatsmanId;
      }
      
      currentInnings.currentPartnership = {
        batsman1Id: otherBatsmanId,
        batsman2Id: newBatsmanId,
        runs: 0,
        balls: 0,
      }

      return newState;
    }
    case 'SWAP_STRIKER': {
      const temp = newState.onStrikeId;
      newState.onStrikeId = newState.nonStrikeId;
      newState.nonStrikeId = temp;
      return newState;
    }
    case 'TRIGGER_BOWLER_CHANGE': {
      newState.isBowlerChangeRequired = true;
      return newState;
    }
    case 'CHANGE_BOWLER': {
      newState.currentBowlerId = action.payload.newBowlerId;
      newState.isBowlerChangeRequired = false;
      return newState;
    }
    case 'END_INNINGS_MANUALLY': {
      if (newState.currentInnings === 'innings1') {
        newState.isEndOfInnings = true;
      } else {
        // Force match end for 2nd innings
        newState.matchOver = true;
        if (currentInnings.score < newState.target -1) {
            const runsDiff = newState.target - currentInnings.score - 1;
            newState.resultText = `${bowlingTeamConfig.name} won by ${runsDiff} run${runsDiff !== 1 ? 's' : ''}.`;
            newState.winner = currentInnings.bowlingTeam;
        } else if (currentInnings.score === newState.target - 1) {
            newState.resultText = "Match Tied.";
            newState.winner = 'draw';
        } else {
            // This case might not be logically reachable with manual end if target already chased
            const wicketsRemaining = battingTeamConfig.players.length - 1 - currentInnings.wickets;
            newState.resultText = `${battingTeamConfig.name} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}.`;
            newState.winner = currentInnings.battingTeam;
        }
      }
      return newState;
    }
    default:
      return state;
  }
};


function ScoreButton({ runs, className, onClick }: { runs: number | string, className?: string, onClick: () => void }) {
  return (
    <Button
      variant="outline"
      className={cn("h-16 w-full text-2xl font-bold border-2 rounded-xl shadow-md", className)}
      onClick={onClick}
    >
      {runs}
    </Button>
  );
}

function BallEventDisplay({ event }: { event: BallEvent }) {
    let text = "";
    let isWicket = event.isWicket;
    let extraClass = "";

    if (isWicket) {
        text = "W";
    } else if (event.isExtra) {
        let runText = event.runs > 0 ? event.runs : '';
        if (event.extraType === 'wd') text = `${runText}wd`;
        else if (event.extraType === 'nb') text = `${runText}nb`;
        else if (event.extraType === 'by') text = `${runText}b`;
        else if (event.extraType === 'lb') text = `${runText}lb`;
        extraClass = "bg-gray-200 text-gray-800";
    } else {
        text = event.runs.toString();
        if (event.runs === 4) extraClass = "bg-blue-500 text-white";
        else if (event.runs === 6) extraClass = "bg-pink-500 text-white";
        else extraClass = "bg-gray-200 text-gray-800";
    }

    return (
        <div className={cn("min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold", extraClass, isWicket && "bg-red-500 text-white")}>
            {text}
        </div>
    );
}

function ChangeBowlerDialog({ open, onBowlerSelect, bowlingTeam, currentBowlerId }: { open: boolean, onBowlerSelect: (bowlerId: string) => void, bowlingTeam: { name: string, players: Player[]}, currentBowlerId: string }) {
  const [selectedBowler, setSelectedBowler] = useState('');

  const availableBowlers = bowlingTeam.players.filter(p => p.id !== currentBowlerId);

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Over Complete!</DialogTitle>
          <DialogDescription>Select the next bowler.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Label htmlFor="bowler-select">Choose a bowler for the next over</Label>
          <Select onValueChange={setSelectedBowler} value={selectedBowler}>
            <SelectTrigger id="bowler-select">
              <SelectValue placeholder="Select a bowler" />
            </SelectTrigger>
            <SelectContent>
              {availableBowlers.map(bowler => (
                <SelectItem key={bowler.id} value={bowler.id}>{bowler.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => onBowlerSelect(selectedBowler)} disabled={!selectedBowler}>Confirm Bowler</Button>
      </DialogContent>
    </Dialog>
  )
}

function ExtrasDialog({ onExtraSelect, onOpenChange, open }: { open: boolean; onOpenChange: (open: boolean) => void; onExtraSelect: (type: 'wd' | 'nb' | 'by' | 'lb', runs: number) => void; }) {
  const [extraType, setExtraType] = useState<'wd' | 'nb' | 'by' | 'lb' | null>(null);

  const handleExtraTypeSelect = (type: 'wd' | 'nb' | 'by' | 'lb') => {
    setExtraType(type);
  };
  
  const handleRunsSelect = (runs: number) => {
    if (extraType) {
      onExtraSelect(extraType, runs);
      handleClose();
    }
  };
  
  const handleClose = () => {
    setExtraType(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Extras</DialogTitle>
          <DialogDescription>
            {!extraType ? 'Select the type of extra.' : 'Select runs scored in addition to the extra.'}
          </DialogDescription>
        </DialogHeader>
        
        {!extraType ? (
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button variant="outline" className="h-16 text-lg" onClick={() => handleExtraTypeSelect('wd')}>Wide (wd)</Button>
            <Button variant="outline" className="h-16 text-lg" onClick={() => handleExtraTypeSelect('nb')}>No Ball (nb)</Button>
            <Button variant="outline" className="h-16 text-lg" onClick={() => handleExtraTypeSelect('by')}>Byes (b)</Button>
            <Button variant="outline" className="h-16 text-lg" onClick={() => handleExtraTypeSelect('lb')}>Leg Byes (lb)</Button>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-center mb-4 text-lg font-semibold">
              Runs for {extraType.toUpperCase()}{' '}
              ({extraType === 'wd' || extraType === 'nb' ? 'plus 1 for the extra' : 'no automatic run for extra'})
            </p>
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3, 4, 6].map(runs => (
                <Button key={runs} variant="outline" className="h-14 text-xl" onClick={() => handleRunsSelect(runs)}>{runs}</Button>
              ))}
            </div>
          </div>
        )}
        
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WicketDialog({ open, onOpenChange, onWicketConfirm, battingTeam, bowlingTeam, onStrikeBatsmanId, currentInnings }: { open: boolean, onOpenChange: (open: boolean) => void, onWicketConfirm: (payload: { dismissalType: string, newBatsmanId: string, fielderId?: string }) => void, battingTeam: { name: string, players: (Player & {isOut?: boolean})[]}, bowlingTeam: { name: string, players: Player[]}, onStrikeBatsmanId: string, currentInnings: Innings | undefined }) {
  const [dismissalType, setDismissalType] = useState('');
  const [newBatsmanId, setNewBatsmanId] = useState('');
  const [fielderId, setFielderId] = useState<string | undefined>();

  const availableBatsmen = useMemo(() => {
    if (!currentInnings) return [];
    return battingTeam.players.filter(p => !currentInnings.batsmen[p.id]?.isOut);
  }, [battingTeam, currentInnings]);

  const dismissalTypes = ['Bowled', 'Caught', 'LBW', 'Run out', 'Stumped', 'Hit wicket', 'Obstructing the field', 'Handled the ball', 'Timed out'];
  const fielderNeededDismissals = ['Caught', 'Run out', 'Stumped'];

  const handleConfirm = () => {
    if (dismissalType && (newBatsmanId || availableBatsmen.length <= 1)) {
      onWicketConfirm({ dismissalType, newBatsmanId: newBatsmanId, fielderId });
      onOpenChange(false);
      setDismissalType('');
      setNewBatsmanId('');
      setFielderId(undefined);
    }
  };
  
  const isLastWicket = availableBatsmen.length <= 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wicket Details</DialogTitle>
          <DialogDescription>Select the dismissal type and the next batsman.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Dismissal Type</Label>
            <Select onValueChange={setDismissalType}>
              <SelectTrigger>
                <SelectValue placeholder="Select dismissal type" />
              </SelectTrigger>
              <SelectContent>
                {dismissalTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {fielderNeededDismissals.includes(dismissalType) && (
            <div>
              <Label>Fielder</Label>
              <Select onValueChange={setFielderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fielder" />
                </SelectTrigger>
                <SelectContent>
                  {bowlingTeam.players.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isLastWicket && (
            <div>
                <Label>Next Batsman</Label>
                <Select onValueChange={setNewBatsmanId}>
                <SelectTrigger>
                    <SelectValue placeholder="Select next batsman" />
                </SelectTrigger>
                <SelectContent>
                    {availableBatsmen.filter(p => p.id !== onStrikeBatsmanId).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
                </Select>
            </div>
          )}
          {isLastWicket && <p className='text-sm text-center text-destructive font-semibold'>This is the last wicket!</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <Button onClick={handleConfirm} disabled={!dismissalType || (!newBatsmanId && !isLastWicket)}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RetireBatsmanDialog({
    open,
    onOpenChange,
    onConfirm,
    onStrikeBatsman,
    nonStrikeBatsman,
    battingTeam,
    currentInnings
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (payload: { retiringBatsmanId: string, newBatsmanId: string }) => void;
    onStrikeBatsman?: Player;
    nonStrikeBatsman?: Player;
    battingTeam: { name: string, players: (Player & { isOut?: boolean })[] };
    currentInnings?: Innings;
}) {
    const [retiringBatsmanId, setRetiringBatsmanId] = useState('');
    const [newBatsmanId, setNewBatsmanId] = useState('');

    const currentBatsmen = [onStrikeBatsman, nonStrikeBatsman].filter(Boolean) as Player[];

    const availableBatsmen = useMemo(() => {
        if (!currentInnings) return [];
        const outOrCurrentIds = [...Object.values(currentInnings.batsmen).filter(b => b.isOut).map(b => b.id), onStrikeBatsman?.id, nonStrikeBatsman?.id];
        return battingTeam.players.filter(p => !outOrCurrentIds.includes(p.id));
    }, [battingTeam, currentInnings, onStrikeBatsman, nonStrikeBatsman]);

    const handleConfirm = () => {
        if (retiringBatsmanId && newBatsmanId) {
            onConfirm({ retiringBatsmanId, newBatsmanId });
            onOpenChange(false);
            setRetiringBatsmanId('');
            setNewBatsmanId('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Retire Batsman</DialogTitle>
                    <DialogDescription>Select the batsman to retire and their replacement.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label>Retiring Batsman</Label>
                        <Select onValueChange={setRetiringBatsmanId} value={retiringBatsmanId}>
                            <SelectTrigger><SelectValue placeholder="Select retiring batsman" /></SelectTrigger>
                            <SelectContent>
                                {currentBatsmen.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>New Batsman</Label>
                        <Select onValueChange={setNewBatsmanId} value={newBatsmanId}>
                            <SelectTrigger><SelectValue placeholder="Select new batsman" /></SelectTrigger>
                            <SelectContent>
                                {availableBatsmen.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                    <Button onClick={handleConfirm} disabled={!retiringBatsmanId || !newBatsmanId}>Confirm</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function NextInningsSetupDialog({ 
  open, 
  onConfirm,
  battingTeam,
  bowlingTeam
}: { 
  open: boolean; 
  onConfirm: (payload: { strikerId: string, nonStrikerId: string, bowlerId: string, revisedTarget?: number, revisedOvers?: number }) => void;
  battingTeam: { name: string; players: Player[] };
  bowlingTeam: { name: string; players: Player[] };
}) {
    const [strikerId, setStrikerId] = useState('');
    const [nonStrikerId, setNonStrikerId] = useState('');
    const [bowlerId, setBowlerId] = useState('');
    const [revisedOvers, setRevisedOvers] = useState('');
    const [revisedTarget, setRevisedTarget] = useState('');
    const [error, setError] = useState('');

    const handleConfirm = () => {
        if (strikerId === nonStrikerId) {
            setError('Striker and Non-striker must be different players.');
            return;
        }
        if (strikerId && nonStrikerId && bowlerId) {
            setError('');
            onConfirm({ 
                strikerId, 
                nonStrikerId, 
                bowlerId,
                revisedTarget: revisedTarget ? parseInt(revisedTarget, 10) : undefined,
                revisedOvers: revisedOvers ? parseInt(revisedOvers, 10) : undefined
            });
        }
    };
    
    useEffect(() => {
      if (strikerId && nonStrikerId && strikerId === nonStrikerId) {
        setError('Striker and Non-striker must be different players.');
      } else {
        setError('');
      }
    }, [strikerId, nonStrikerId]);

    const availableBatsmen = battingTeam.players;
    const availableBowlers = bowlingTeam.players;

    return (
        <Dialog open={open}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Innings Over</DialogTitle>
                    <DialogDescription>Select the opening batsmen and bowler for the second innings. You can also revise the target and overs if needed (e.g., DLS method).</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Striker</Label>
                    <Select onValueChange={setStrikerId}>
                      <SelectTrigger><SelectValue placeholder="Select Striker" /></SelectTrigger>
                      <SelectContent>
                        {availableBatsmen.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Non-Striker</Label>
                    <Select onValueChange={setNonStrikerId}>
                      <SelectTrigger><SelectValue placeholder="Select Non-Striker" /></SelectTrigger>
                      <SelectContent>
                        {availableBatsmen.map(p => <SelectItem key={p.id} value={p.id} disabled={p.id === strikerId}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {error && <p className="text-destructive text-sm">{error}</p>}
                  <div>
                    <Label>Opening Bowler</Label>
                    <Select onValueChange={setBowlerId}>
                      <SelectTrigger><SelectValue placeholder="Select Opening Bowler" /></SelectTrigger>
                      <SelectContent>
                        {availableBowlers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="revised-overs">Revised Overs (Optional)</Label>
                        <Input id="revised-overs" type="number" placeholder="e.g. 15" value={revisedOvers} onChange={e => setRevisedOvers(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="revised-target">Revised Target (Optional)</Label>
                        <Input id="revised-target" type="number" placeholder="e.g. 120" value={revisedTarget} onChange={e => setRevisedTarget(e.target.value)} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleConfirm} disabled={!strikerId || !nonStrikerId || !bowlerId || !!error} className="w-full">
                        Start Next Innings <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function MatchOverDialog({ open, onOpenChange, onGoHome, match }: { open: boolean; onOpenChange: (open: boolean) => void; onGoHome: () => void; match: MatchState; }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Match Over</DialogTitle>
                    <DialogDescription>
                        {match.resultText}
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-4">
                    <ScorecardDisplay match={match} />
                </div>
                <DialogFooter className="sm:justify-between gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Scoring
                    </Button>
                    <Button onClick={onGoHome}>
                        <Home className="mr-2 h-4 w-4" /> Go to Home
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EventAnimation({ type, onAnimationEnd }: { type: 'four' | 'six' | 'wicket', onAnimationEnd: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onAnimationEnd, 2000); // Animation duration
    return () => clearTimeout(timer);
  }, [onAnimationEnd]);

  const getAnimationContent = () => {
    switch(type) {
      case 'four':
        return { text: 'FOUR!', style: {
          WebkitTextStroke: '2px black',
          textShadow: '0 0 15px rgba(52, 211, 153, 0.8)',
          color: '#34D399'
        }};
      case 'six':
        return { text: 'SIX!', style: {
          WebkitTextStroke: '2px black',
          textShadow: '0 0 15px rgba(244, 63, 94, 0.8)',
          color: '#F43F5E'
        }};
      case 'wicket':
        return { text: 'OUT!', style: {
          WebkitTextStroke: '2px #7f1d1d',
          textShadow: '0 0 20px rgba(239, 68, 68, 1)',
          color: '#DC2626'
        }};
    }
  }

  const { text, style } = getAnimationContent();

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="boundary-animation-text text-8xl font-extrabold"
        style={style}
      >
        {text}
      </div>
    </div>
  );
}

export default function ScoringScreen({ matchState: initialMatchState }: { matchState: MatchState }) {
  const [history, setHistory] = useState<MatchState[]>([]);
  const [currentStateIndex, setCurrentStateIndex] = useState(-1);
  const [state, dispatch] = useReducer(matchReducer, initialMatchState);

  const [extraDialogOpen, setExtraDialogOpen] = useState(false);
  const [wicketDialogOpen, setWicketDialogOpen] = useState(false);
  const [retireDialogOpen, setRetireDialogOpen] = useState(false);
  const [matchOverDialogOpen, setMatchOverDialogOpen] = useState(false);
  const [eventAnimation, setEventAnimation] = useState<'four' | 'six' | 'wicket' | null>(null);

  const router = useRouter();

  const handleUndo = () => {
    if (currentStateIndex > 0) {
      const newIndex = currentStateIndex - 1;
      setCurrentStateIndex(newIndex);
      dispatch({ type: 'RESET_STATE', payload: history[newIndex] });
    }
  };
  
   useEffect(() => {
    // This effect synchronizes the local state with the props from Firestore.
    // It's crucial for handling page reloads and real-time updates correctly.
    dispatch({ type: 'RESET_STATE', payload: initialMatchState });
    
    // Check if the new state from props is different from the last state in our history
    const lastHistoryState = history[history.length - 1];
    if (!lastHistoryState || JSON.stringify(lastHistoryState) !== JSON.stringify(initialMatchState)) {
      setHistory(prev => [...prev, initialMatchState]);
      setCurrentStateIndex(prev => prev + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMatchState]);

  const persistState = useCallback(async (stateToSave: MatchState) => {
    if (initialMatchState?.id) {
      try {
        const stateWithId = { ...stateToSave, id: initialMatchState.id };
        await setDoc(doc(db, "matches", stateWithId.id), stateWithId);
      } catch (error) {
        console.error("Failed to save match state to Firestore:", error);
      }
    }
  }, [initialMatchState?.id]);

  const updateState = (action: Action) => {
    const newState = matchReducer(state, action);
    const newHistory = history.slice(0, currentStateIndex + 1);
    newHistory.push(newState);
    
    setHistory(newHistory);
    setCurrentStateIndex(newHistory.length - 1);
    
    dispatch(action);
    persistState(newState); // Persist every change
  };
  
   useEffect(() => {
    if (state.matchOver && !matchOverDialogOpen) {
      setMatchOverDialogOpen(true);
    }
  }, [state.matchOver, matchOverDialogOpen]);

  const handleScore = (runs: number) => {
    if (runs === 4) setEventAnimation('four');
    if (runs === 6) setEventAnimation('six');
    updateState({ type: 'BALL_EVENT', payload: { runs, isExtra: false } });
  };
  
  const handleExtra = (type: 'wd' | 'nb' | 'by' | 'lb', runs: number) => {
    updateState({ type: 'BALL_EVENT', payload: { runs, isExtra: true, extraType: type } });
  }

  const handleWicket = (payload: { dismissalType: string; newBatsmanId: string; fielderId?: string }) => {
    setEventAnimation('wicket');
    updateState({ type: 'WICKET', payload });
  }
  
  const handleRetire = (payload: { retiringBatsmanId: string; newBatsmanId: string; }) => {
    updateState({ type: 'RETIRE_BATSMAN', payload });
  };

  const handleBowlerChange = (newBowlerId: string) => {
    updateState({ type: 'CHANGE_BOWLER', payload: { newBowlerId } });
  }
  
  const handleSetupNextInnings = (payload: { strikerId: string, nonStrikerId: string, bowlerId: string, revisedTarget?: number, revisedOvers?: number }) => {
    updateState({ type: 'SETUP_NEXT_INNINGS', payload });
  };
  
  const handleGoHome = () => {
    router.push('/matches');
  }


  const currentInnings = state.currentInnings === 'innings1' ? state.innings1 : state.innings2!;
  const battingTeam = currentInnings.battingTeam === 'team1' ? state.config.team1 : state.config.team2;
  const bowlingTeam = currentInnings.bowlingTeam === 'team1' ? state.config.team1 : state.config.team2;
  
  const nextInningsBattingTeam = state.innings1?.bowlingTeam === 'team1' ? state.config.team1 : state.config.team2;
  const nextInningsBowlingTeam = state.innings1?.battingTeam === 'team1' ? state.config.team1 : state.config.team2;


  const onStrikeBatsman = currentInnings.batsmen[state.onStrikeId];
  const nonStrikeBatsman = currentInnings.batsmen[state.nonStrikeId];
  const currentBowler = currentInnings.bowlers[state.currentBowlerId];
  
  const battingTeamWithStatus = {
    ...battingTeam,
    players: battingTeam.players.map(p => ({
      ...p,
      isOut: currentInnings.batsmen[p.id]?.isOut || false,
    }))
  }
  const oversForInnings = state.currentInnings === 'innings2' && state.revisedOvers ? state.revisedOvers : state.config.oversPerInnings;

  const runsNeeded = state.target ? state.target - currentInnings.score : 0;
  const ballsRemaining = (oversForInnings * state.config.ballsPerOver) - currentInnings.balls;

  return (
    <div className="space-y-4 relative">
      {eventAnimation && <EventAnimation type={eventAnimation} onAnimationEnd={() => setEventAnimation(null)} />}
      <ExtrasDialog open={extraDialogOpen} onOpenChange={setExtraDialogOpen} onExtraSelect={handleExtra} />
      <WicketDialog 
        open={wicketDialogOpen} 
        onOpenChange={setWicketDialogOpen} 
        onWicketConfirm={handleWicket}
        battingTeam={battingTeamWithStatus}
        bowlingTeam={bowlingTeam}
        onStrikeBatsmanId={state.onStrikeId}
        currentInnings={currentInnings}
      />
      <RetireBatsmanDialog
          open={retireDialogOpen}
          onOpenChange={setRetireDialogOpen}
          onConfirm={handleRetire}
          onStrikeBatsman={onStrikeBatsman}
          nonStrikeBatsman={nonStrikeBatsman}
          battingTeam={battingTeamWithStatus}
          currentInnings={currentInnings}
      />
      <ChangeBowlerDialog 
        open={state.isBowlerChangeRequired || false}
        onBowlerSelect={handleBowlerChange}
        bowlingTeam={bowlingTeam}
        currentBowlerId={state.currentBowlerId}
      />
      {nextInningsBattingTeam && nextInningsBowlingTeam && (
          <NextInningsSetupDialog
            open={state.isEndOfInnings || false}
            onConfirm={handleSetupNextInnings}
            battingTeam={nextInningsBattingTeam}
            bowlingTeam={nextInningsBowlingTeam}
          />
      )}
      <MatchOverDialog
        open={matchOverDialogOpen}
        onOpenChange={setMatchOverDialogOpen}
        match={state}
        onGoHome={handleGoHome}
      />

      <Card className="rounded-2xl shadow-lg border-none">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <p className="text-sm text-muted-foreground font-medium mb-1">{battingTeam.name}</p>
              <p className="text-4xl font-bold tracking-tighter">{currentInnings.score}/{currentInnings.wickets}</p>
              <p className="text-sm text-muted-foreground">Overs {formatOvers(currentInnings.balls, state.config.ballsPerOver)} ({oversForInnings})</p>
              {state.target &&
                <div className="flex flex-col items-start mt-1">
                  <div className="flex items-center gap-1.5">
                    <TargetIcon className="w-4 h-4 text-red-500" />
                    <p className="text-sm font-medium text-red-500">Target: {state.target}</p>
                  </div>
                  {state.matchOver ? (
                    <p className="text-sm font-bold text-green-600 ml-1 mt-1">{state.resultText}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground ml-1">
                      Need {runsNeeded} runs in {ballsRemaining} balls
                    </p>
                  )}
                </div>
              }
            </div>
            <div className="text-right text-sm space-y-1">
              <div className="flex justify-end items-center gap-2">
                <div className='text-right'>
                    <p className="font-semibold">{onStrikeBatsman?.name}</p>
                    <p>{onStrikeBatsman?.runs} ({onStrikeBatsman?.balls})</p>
                </div>
                <CricketBatIcon className='w-5 h-5 text-primary' />
              </div>

               <div className="flex justify-end items-center gap-2">
                <div className='text-right'>
                    <p className="font-semibold">{nonStrikeBatsman?.name}</p>
                    <p>{nonStrikeBatsman?.runs} ({nonStrikeBatsman?.balls})</p>
                </div>
                <CricketBatIcon className='w-5 h-5 text-muted-foreground/70' />
              </div>

              <div className="border-t my-2"></div>
              
              <div className="flex justify-end items-center gap-2">
                 <div className='text-right'>
                    <p className="font-semibold">{currentBowler?.name}</p>
                    <p>{currentBowler?.wickets}/{currentBowler?.runsConceded} ({formatOvers(currentBowler?.balls, state.config.ballsPerOver)})</p>
                </div>
                <CricketBallIcon className='w-5 h-5 text-destructive' />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 my-3"></div>
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <p className="text-sm font-medium">Last Ten Balls:</p>
            <div className="flex gap-1.5">
               {currentInnings.timeline.slice(-10).map((event, i) => (
                <BallEventDisplay key={i} event={event} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">Runs</h3>
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3, 4, 5, 6].map(runs => (
              <ScoreButton key={runs} runs={runs} onClick={() => handleScore(runs)} />
            ))}
          </div>
        </div>

        <div>
           <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">+ Extras</h3>
           <Button variant="outline" className="w-full h-12 rounded-xl border-2" onClick={() => setExtraDialogOpen(true)}>
             Add Extra
           </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
            <Button className="h-14 text-lg bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md" onClick={() => setWicketDialogOpen(true)}>
                Wicket
            </Button>
            <Button className="h-14 text-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl shadow-md" onClick={handleUndo} disabled={currentStateIndex <= 0}>
                <Undo className="mr-2 h-5 w-5" /> 
                Undo
            </Button>
        </div>

        <div className="space-y-3">
           <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1 flex items-center gap-2"><Settings2 className='w-4 h-4'/>Management</h3>
           <div className="grid grid-cols-3 gap-3">
              <Button variant="outline" className="h-10 rounded-lg text-xs shadow-sm" onClick={() => updateState({ type: 'TRIGGER_BOWLER_CHANGE' })}>
                <RefreshCw className="mr-1 h-4 w-4" /> 
                Change Bowler
              </Button>
              <Button variant="outline" className="h-10 rounded-lg text-xs shadow-sm" onClick={() => updateState({ type: 'SWAP_STRIKER'})}>
                <ArrowLeftRight className="mr-1 h-4 w-4" /> 
                Swap Batter
              </Button>
              <Button variant="outline" className="h-10 rounded-lg text-xs shadow-sm" onClick={() => setRetireDialogOpen(true)}>
                Retire Batter
              </Button>
              <Button 
                  variant="outline" 
                  className="h-10 rounded-lg text-xs shadow-sm col-span-1"
                  onClick={() => updateState({ type: 'END_INNINGS_MANUALLY' })}
                  >
                  End Innings
              </Button>
           </div>
        </div>

        <div className="space-y-3">
           <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">Ticker Action</h3>
           <div className="grid grid-cols-3 gap-3">
                <Button 
                  variant={state.activeTicker === 'onStrike' ? 'default' : 'destructive'}
                  className="h-10 rounded-lg text-xs shadow-sm"
                  onClick={() => updateState({type: 'TOGGLE_TICKER', payload: {ticker: 'onStrike'}})}>
                  Batter 1
                </Button>
                 <Button 
                  variant={state.activeTicker === 'nonStrike' ? 'default' : 'destructive'} 
                  className="h-10 rounded-lg text-xs shadow-sm"
                  onClick={() => updateState({type: 'TOGGLE_TICKER', payload: {ticker: 'nonStrike'}})}>
                  Batter 2
                </Button>
                <Button 
                    variant={state.activeTicker === 'bowler' ? 'default' : 'destructive'}
                    className="h-10 rounded-lg text-xs shadow-sm"
                    onClick={() => updateState({type: 'TOGGLE_TICKER', payload: {ticker: 'bowler'}})}>
                    Bowler
                </Button>
                 <Button
                    variant={state.activeTicker === 'battingCard' ? 'default' : 'destructive'}
                    className="h-10 rounded-lg text-xs shadow-sm"
                    onClick={() => updateState({type: 'TOGGLE_TICKER', payload: {ticker: 'battingCard'}})}>
                    Batting
                </Button>
                <Button 
                    variant={state.activeTicker === 'bowlingCard' ? 'default' : 'destructive'}
                    className="h-10 rounded-lg text-xs shadow-sm"
                    onClick={() => updateState({type: 'TOGGLE_TICKER', payload: {ticker: 'bowlingCard'}})}>
                    Bowling
                </Button>
                <Button 
                    variant={state.activeTicker === 'target' ? 'default' : 'destructive'}
                    className="h-10 rounded-lg text-xs shadow-sm"
                    onClick={() => updateState({type: 'TOGGLE_TICKER', payload: {ticker: 'target'}})}>
                    Target
                </Button>
                <Button
                    variant={state.activeTicker === 'partnership' ? 'default' : 'destructive'}
                    className="h-10 rounded-lg text-xs shadow-sm"
                    onClick={() => updateState({type: 'TOGGLE_TICKER', payload: {ticker: 'partnership'}})}>
                    Partnership
                </Button>
                <Button
                    variant={state.activeTicker === 'summary' ? 'default' : 'destructive'}
                    className="h-10 rounded-lg text-xs shadow-sm"
                    onClick={() => updateState({type: 'TOGGLE_TICKER', payload: {ticker: 'summary'}})}>
                    Summary
                </Button>
                <Button
                    variant={state.activeTicker === 'tourName' ? 'default' : 'destructive'}
                    className="h-10 rounded-lg text-xs shadow-sm"
                    onClick={() => updateState({type: 'TOGGLE_TICKER', payload: {ticker: 'tourName'}})}>
                    Tour Name
                </Button>
           </div>
        </div>
      </div>
    </div>
  );
}
