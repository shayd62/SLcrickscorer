

'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { MatchState, Batsman, Bowler, BallEvent, Innings, Partnership } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from "firebase/firestore";
import { cn } from '@/lib/utils';
import Image from 'next/image';

const formatOvers = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

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
      <div className="boundary-animation-text text-8xl md:text-9xl font-extrabold"
        style={style}
      >
        {text}
      </div>
    </div>
  );
}


function BatterTicker({ batter, timeline }: { batter: Batsman, timeline: BallEvent[] }) {
    const strikeRate = batter.balls > 0 ? ((batter.runs / batter.balls) * 100).toFixed(0) : '0';

    const batterEvents = useMemo(() => {
        return timeline.filter(event => event.batsmanId === batter.id && !event.isExtra);
    }, [timeline, batter.id]);

    const dotBalls = useMemo(() => batterEvents.filter(e => e.runs === 0).length, [batterEvents]);
    const singles = useMemo(() => batterEvents.filter(e => e.runs === 1).length, [batterEvents]);

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[700px] h-auto bg-gradient-to-r from-yellow-200 via-green-200 to-cyan-200 rounded-lg shadow-lg p-3 text-black">
            <div className="bg-green-300/80 rounded-md p-2 flex justify-between items-center">
                <p className="font-bold text-lg">{batter.name}</p>
                <p className="font-bold text-xl">{batter.runs} ({batter.balls})</p>
            </div>
            <div className="grid grid-cols-6 gap-2 mt-3 text-center">
                <div>
                    <p className="text-xs text-gray-800">BALLS</p>
                    <p className="font-semibold text-base">{batter.balls}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-800">DOT BALLS</p>
                    <p className="font-semibold text-base">{dotBalls}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-800">SINGLES</p>
                    <p className="font-semibold text-base">{singles}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-800">FOURS</p>
                    <p className="font-semibold text-base">{batter.fours}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-800">SIXES</p>
                    <p className="font-semibold text-base">{batter.sixes}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-800">S/RATE</p>
                    <p className="font-semibold text-base">{strikeRate}</p>
                </div>
            </div>
        </div>
    );
}

function BowlerTicker({ bowler, timeline }: { bowler: Bowler; timeline: BallEvent[] }) {
    const economy = bowler.balls > 0 ? ((bowler.runsConceded / (bowler.balls / 6))).toFixed(2) : '0.00';
    
    const dotBalls = useMemo(() => {
        const overEvents = timeline.filter(event => event.bowlerId === bowler.id);
        return overEvents.reduce((count, event) => {
            if (!event.isExtra && event.runs === 0) {
                return count + 1;
            }
            return count;
        }, 0);
    }, [timeline, bowler.id]);

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[600px] h-auto bg-gradient-to-r from-yellow-300 via-green-300 to-cyan-400 rounded-lg shadow-lg p-3 flex flex-col text-black">
      <div className="flex justify-between items-center w-full">
        <p className="font-bold text-lg">{bowler.name}</p>
        <div className="bg-cyan-100/80 rounded-lg px-3 py-1">
          <p className="font-bold text-lg">{bowler.wickets}/{bowler.runsConceded} ({formatOvers(bowler.balls)})</p>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2 mt-3 text-center">
        <div>
          <p className="text-xs text-gray-800">OVERS</p>
          <p className="font-semibold text-base">{formatOvers(bowler.balls)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-800">RUNS</p>
          <p className="font-semibold text-base">{bowler.runsConceded}</p>
        </div>
        <div>
          <p className="text-xs text-gray-800">DOT BALLS</p>
          <p className="font-semibold text-base">{dotBalls}</p>
        </div>
        <div>
          <p className="text-xs text-gray-800">WICKETS</p>
          <p className="font-semibold text-base">{bowler.wickets}</p>
        </div>
        <div>
          <p className="text-xs text-gray-800">ECONOMY</p>
          <p className="font-semibold text-base">{economy}</p>
        </div>
      </div>
    </div>
  );
}

function MatchSummaryTicker({ match }: { match: MatchState }) {
    const { config, innings1, innings2, target } = match;

    const getTeamName = (key: 'team1' | 'team2') => config[key].name;

    const getInningsData = (innings: Innings) => {
        const topBatsmen = Object.values(innings.batsmen)
            .sort((a, b) => b.runs - a.runs)
            .slice(0, 3);
        const topBowlers = Object.values(innings.bowlers)
            .filter(b => b.balls > 0)
            .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded)
            .slice(0, 3);
        return { topBatsmen, topBowlers };
    };

    const innings1Data = getInningsData(innings1);
    const innings2Data = innings2 ? getInningsData(innings2) : null;
    
    const oversForInnings2 = match.revisedOvers || config.oversPerInnings;
    const runsNeeded = target && innings2 ? target - innings2.score : 0;
    const ballsRemaining = innings2 ? oversForInnings2 * 6 - innings2.balls : 0;
    
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="w-[800px] bg-sky-200 text-black font-sans rounded-lg shadow-2xl overflow-hidden">
              <div className="bg-blue-900 text-white p-3 text-center">
                  <h2 className="text-xl font-bold uppercase">{config.tournamentId || 'Friendly Match'}</h2>
                  <p className="text-sm uppercase">Match Summary</p>
              </div>

              {/* Innings 1 */}
              <div className="bg-blue-100 p-3">
                  <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold uppercase">{getTeamName(innings1.battingTeam)}</h3>
                      <div className="text-right">
                          <p className="text-xs">{formatOvers(innings1.balls)} OVERS</p>
                          <p className="text-2xl font-bold">{innings1.score}-{innings1.wickets}</p>
                      </div>
                  </div>
              </div>
              <div className="bg-blue-800 text-white p-3 grid grid-cols-2 gap-x-4">
                  <div>
                      {innings1Data.topBatsmen.map(b => (
                          <div key={b.id} className="flex justify-between text-sm py-0.5">
                              <span>{b.name.toUpperCase()}</span>
                              <span>{b.runs} ({b.balls})</span>
                          </div>
                      ))}
                  </div>
                  <div>
                      {innings1Data.topBowlers.map(b => (
                          <div key={b.id} className="flex justify-between text-sm py-0.5">
                              <span>{b.name.toUpperCase()}</span>
                              <span>{b.wickets}-{b.runsConceded} ({formatOvers(b.balls)})</span>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Innings 2 */}
              {innings2 && innings2Data && (
                  <>
                      <div className="bg-blue-100 p-3 mt-1">
                          <div className="flex justify-between items-center">
                              <h3 className="text-lg font-bold uppercase">{getTeamName(innings2.battingTeam)}</h3>
                              <div className="text-right">
                                  <p className="text-xs">{formatOvers(innings2.balls)} OVERS</p>
                                  <p className="text-2xl font-bold">{innings2.score}-{innings2.wickets}</p>
                              </div>
                          </div>
                      </div>
                      <div className="bg-blue-800 text-white p-3 grid grid-cols-2 gap-x-4">
                           <div>
                              {innings2Data.topBatsmen.map(b => (
                                  <div key={b.id} className="flex justify-between text-sm py-0.5">
                                      <span>{b.name.toUpperCase()}</span>
                                      <span>{b.runs} ({b.balls})</span>
                                  </div>
                              ))}
                          </div>
                          <div>
                              {innings2Data.topBowlers.map(b => (
                                  <div key={b.id} className="flex justify-between text-sm py-0.5">
                                      <span>{b.name.toUpperCase()}</span>
                                      <span>{b.wickets}-{b.runsConceded} ({formatOvers(b.balls)})</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </>
              )}

              {target && !match.matchOver && (
                  <div className="bg-sky-200 text-center p-3 text-lg font-semibold">
                      Required {runsNeeded} runs in {ballsRemaining} balls
                  </div>
              )}
               {match.matchOver && (
                  <div className="bg-sky-200 text-center p-3 text-lg font-semibold text-green-600">
                      {match.resultText}
                  </div>
              )}
          </div>
      </div>
  );
}

function PartnershipTicker({ partnership, batsman1, batsman2 }: { partnership: Partnership, batsman1: Batsman, batsman2: Batsman }) {
  if (!partnership || !batsman1 || !batsman2) return null;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[600px] h-auto bg-gradient-to-r from-yellow-200 to-cyan-300 rounded-lg shadow-lg p-4 text-black text-center">
        <div className="grid grid-cols-3 items-center">
            <div className="text-left">
                <p className="font-bold text-sm">{batsman1.name}</p>
                <p className="text-lg">{batsman1.runs} ({batsman1.balls})</p>
            </div>
            <div>
                <p className="font-bold text-sm">PARTNERSHIP</p>
                <p className="text-2xl font-bold">{partnership.runs} ({partnership.balls})</p>
            </div>
            <div className="text-right">
                <p className="font-bold text-sm">{batsman2.name}</p>
                <p className="text-lg">{batsman2.runs} ({batsman2.balls})</p>
            </div>
        </div>
    </div>
  );
}

function TourNameTicker({ tournamentName, venueName }: { tournamentName?: string; venueName?: string }) {
  if (!tournamentName && !venueName) return null;

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[600px] h-auto bg-gradient-to-r from-yellow-300 to-cyan-400 rounded-lg shadow-lg p-4 text-black text-center">
      <p className="text-lg font-bold uppercase">{tournamentName || 'Friendly Match'}</p>
      {venueName && <p className="text-sm uppercase">{venueName}</p>}
    </div>
  );
}

function BattingCardTicker({ match }: { match: MatchState }) {
  const currentInningsData = match.currentInnings === 'innings1' ? match.innings1 : match.innings2;
  if (!currentInningsData) return null;

  const battingTeamConfig = currentInningsData.battingTeam === 'team1' ? match.config.team1 : match.config.team2;
  const battingTeamPlayers = battingTeamConfig.players.map(p => {
    const batsmanData = currentInningsData.batsmen[p.id];
    return {
      ...p,
      runs: batsmanData?.runs || 0,
      balls: batsmanData?.balls || 0,
      isOut: batsmanData?.isOut || false,
    };
  });

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[600px] bg-white rounded-lg shadow-lg text-black font-sans">
      <div className="relative bg-blue-900 text-white text-center text-2xl font-bold py-2">
        <div className="absolute -top-2 left-0 w-full h-full bg-blue-900 transform -skew-y-2"></div>
        <p className="relative">{battingTeamConfig.name}</p>
      </div>
      <div className="p-2">
        <div className="bg-cyan-300 rounded-t-md">
           {battingTeamPlayers.map(player => (
              <div key={player.id} className="flex justify-between px-4 py-1 border-b border-white/50">
                <span className={cn("font-bold", player.id === match.onStrikeId && "text-blue-800")}>{player.name}{player.id === match.onStrikeId ? '*' : ''}</span>
                <div className="flex gap-4">
                  <span>{player.runs}</span>
                  <span>{player.balls}</span>
                </div>
              </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BowlingCardTicker({ match }: { match: MatchState }) {
  const currentInningsData = match.currentInnings === 'innings1' ? match.innings1 : match.innings2;
  if (!currentInningsData) return null;

  const bowlingTeamConfig = currentInningsData.bowlingTeam === 'team1' ? match.config.team1 : match.config.team2;
  const bowlersWithStats = Object.values(currentInningsData.bowlers).filter(b => b.balls > 0);

  const getDotBalls = (bowlerId: string) => {
    return currentInningsData.timeline.filter(event => event.bowlerId === bowlerId && event.runs === 0 && !event.isExtra).length;
  }
  
  const getEconomy = (bowler: Bowler) => {
    return bowler.balls > 0 ? (bowler.runsConceded / (bowler.balls / 6)).toFixed(2) : '0.00';
  }

  const fallOfWickets = currentInningsData.fallOfWickets || [];

  const extras = useMemo(() => {
    return currentInningsData.timeline.reduce((acc, event) => {
      if (event.isExtra) {
        if(event.extraType === 'wd') acc += match.config.wideBall.run;
        if(event.extraType === 'nb') acc += match.config.noBall.run;
      }
      return acc;
    }, 0);
  }, [currentInningsData.timeline, match.config]);
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/90 p-4 font-sans">
      <div className="w-[800px] h-[500px] bg-[#0f172a] text-white rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4">
          <h1 className="text-3xl font-bold uppercase">{bowlingTeamConfig.name}</h1>
          <p className="text-sm uppercase text-gray-400">
            {match.config.tournamentId || 'Friendly Match'}
            {match.config.matchNumber && `, Match ${match.config.matchNumber}`}
          </p>
        </div>

        {/* Bowling Table */}
        <div className="flex-grow px-4">
          <div className="bg-[#1f2937] p-2 grid grid-cols-6 gap-2 text-center font-bold text-sm text-cyan-400">
            <div className="col-span-1 text-left"></div>
            <div>Overs</div>
            <div>Dots</div>
            <div>Runs</div>
            <div>Wkts</div>
            <div>Econ</div>
          </div>
          <div className="divide-y divide-gray-700">
            {bowlersWithStats.map(bowler => (
              <div key={bowler.id} className="p-2 grid grid-cols-6 gap-2 text-center items-center">
                <div className="text-left font-semibold text-base uppercase">{bowler.name}</div>
                <div>{formatOvers(bowler.balls)}</div>
                <div>{getDotBalls(bowler.id)}</div>
                <div>{bowler.runsConceded}</div>
                <div>{bowler.wickets}</div>
                <div>{getEconomy(bowler)}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Fall of Wickets */}
        <div className="px-4 py-2">
            <div className="grid grid-cols-10 gap-x-1 text-center">
              <div className="font-bold text-sm text-green-400 col-span-1 self-center">Wkts</div>
              {fallOfWickets.map((_, index) => (
                <div key={index} className="bg-green-700/50 text-white font-semibold py-1 rounded-sm">{index + 1}</div>
              ))}
            </div>
             <div className="grid grid-cols-10 gap-x-1 text-center mt-0.5">
              <div className="font-bold text-sm text-red-400 col-span-1 self-center">Runs</div>
              {fallOfWickets.map((wicket, index) => (
                <div key={index} className="bg-red-700/50 text-white font-semibold py-1 rounded-sm">{wicket.score}</div>
              ))}
            </div>
        </div>

        {/* Footer */}
        <div className="bg-red-600 p-3 mt-auto grid grid-cols-3 items-center text-center">
          <div className="font-bold text-lg">EXTRAS {extras}</div>
          <div className="font-bold text-lg">OVERS {formatOvers(currentInningsData.balls)}</div>
          <div className="font-bold text-3xl">TOTAL {currentInningsData.score}-{currentInningsData.wickets}</div>
        </div>
      </div>
    </div>
  );
}

function TargetTicker({ match }: { match: MatchState }) {
  if (match.currentInnings !== 'innings2' || !match.target) return null;

  const runsNeeded = match.target - match.innings2.score;
  const oversForInnings2 = match.revisedOvers || match.config.oversPerInnings;
  const ballsRemaining = oversForInnings2 * 6 - match.innings2.balls;
  
  if (runsNeeded <= 0 || ballsRemaining <= 0 || match.matchOver) return null;
  
  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[600px] h-auto bg-gradient-to-r from-lime-300 to-cyan-400 rounded-lg shadow-lg p-4 text-black text-center">
        <div className="flex justify-around items-center text-xl font-bold uppercase">
           <span className="text-gray-800">Need</span>
           <span className="text-3xl">{runsNeeded}</span>
           <span className="text-gray-800">Runs From</span>
           <span className="text-3xl">{ballsRemaining}</span>
           <span className="text-gray-800">Balls</span>
        </div>
    </div>
  );
}


export default function LiveViewPage() {
  const [match, setMatch] = useState<MatchState | null>(null);
  const [eventAnimation, setEventAnimation] = useState<'four' | 'six' | 'wicket' | null>(null);
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;
  const lastTimelineLength = useRef(0);
  const searchParams = useSearchParams();
  const isObs = searchParams.get('obs') === 'true';

  useEffect(() => {
    if (!matchId) return;

    const unsub = onSnapshot(doc(db, "matches", matchId), (doc) => {
        if (doc.exists()) {
            const newMatchData = { ...doc.data() as MatchState, id: doc.id };
            setMatch(newMatchData);

            const currentInnings = newMatchData.currentInnings === 'innings1' ? newMatchData.innings1 : newMatchData.innings2;
            if (currentInnings && currentInnings.timeline.length > lastTimelineLength.current) {
                const lastEvent = currentInnings.timeline[currentInnings.timeline.length - 1];
                if(lastEvent) {
                    if (lastEvent.isWicket) {
                        setEventAnimation('wicket');
                    } else if (lastEvent.runs === 4 && !lastEvent.isExtra) {
                        setEventAnimation('four');
                    } else if (lastEvent.runs === 6 && !lastEvent.isExtra) {
                        setEventAnimation('six');
                    }
                }
            }
             if (currentInnings) {
                lastTimelineLength.current = currentInnings.timeline.length;
            }

        } else {
            console.error("Match not found");
        }
    });

    return () => unsub();
  }, [matchId]);
  
  const activeTickerContent = useMemo(() => {
    if (!match) return null;
    const { activeTicker, onStrikeId, nonStrikeId, currentBowlerId, currentInnings, innings1, innings2, config } = match;
    const currentInningsData = currentInnings === 'innings1' ? innings1 : innings2!;
    if (!currentInningsData) return null;

    const onStrikeBatsman = currentInningsData.batsmen[onStrikeId];
    const nonStrikeBatsman = currentInningsData.batsmen[nonStrikeId];
    const currentBowler = currentInningsData.bowlers[currentBowlerId];

    if (activeTicker === 'onStrike' && onStrikeBatsman) return <BatterTicker batter={onStrikeBatsman} timeline={currentInningsData.timeline} />;
    if (activeTicker === 'nonStrike' && nonStrikeBatsman) return <BatterTicker batter={nonStrikeBatsman} timeline={currentInningsData.timeline} />;
    if (activeTicker === 'bowler' && currentBowler) return <BowlerTicker bowler={currentBowler} timeline={currentInningsData.timeline} />;
    if (activeTicker === 'summary') return <MatchSummaryTicker match={match} />;
    if (activeTicker === 'partnership' && currentInningsData.currentPartnership) {
        const pShip = currentInningsData.currentPartnership;
        const b1 = currentInningsData.batsmen[pShip.batsman1Id];
        const b2 = currentInningsData.batsmen[pShip.batsman2Id];
        return <PartnershipTicker partnership={pShip} batsman1={b1} batsman2={b2} />;
    }
    if (activeTicker === 'tourName') return <TourNameTicker tournamentName={config.tournamentId} venueName={config.venue} />;
    if (activeTicker === 'battingCard') return <BattingCardTicker match={match} />;
    if (activeTicker === 'bowlingCard') return <BowlingCardTicker match={match} />;
    if (activeTicker === 'target') return <TargetTicker match={match} />;
    return null;
  }, [match]);

  if (!match) {
    // For OBS, we don't want to show any loading text, just a blank screen.
    return null;
  }
  
  const { config, resultText, target, innings1, activeTicker } = match;
  const currentInnings = match.currentInnings === 'innings1' ? match.innings1 : match.innings2!;
  const battingTeam = currentInnings.battingTeam === 'team1' ? config.team1 : config.team2;
  const bowlingTeam = currentInnings.bowlingTeam === 'team1' ? config.team1 : config.team2;
  
  const onStrikeBatsman = currentInnings.batsmen[match.onStrikeId];
  const nonStrikeBatsman = currentInnings.batsmen[match.nonStrikeId];
  const currentBowler = currentInnings.bowlers[match.currentBowlerId];
  
  const oversForInnings = match.currentInnings === 'innings2' && match.revisedOvers ? match.revisedOvers : config.oversPerInnings;
  const runsNeeded = target ? target - currentInnings.score : 0;
  const ballsRemaining = oversForInnings * 6 - currentInnings.balls;
  
  const currentRunRate = currentInnings.balls > 0 ? (currentInnings.score / currentInnings.balls * 6).toFixed(2) : '0.00';
  const requiredRunRate = ballsRemaining > 0 && target ? (runsNeeded / ballsRemaining * 6).toFixed(2) : '0.00';
  
  const thisOverEvents = currentInnings.timeline.slice(- (currentInnings.balls % 6 === 0 && currentInnings.balls > 0 ? 6 : currentInnings.balls % 6) );

  const Ticker = () => (
    <div className="fixed bottom-0 left-0 right-0">
        <div className={cn("w-full shadow-2xl text-white", isObs ? "bg-transparent" : "bg-gray-800")}>
              <div className="grid grid-cols-5 text-sm">
                  {/* Batting Team */}
                  <div className="col-span-1 bg-red-500/90 p-2 flex flex-col items-center justify-center text-center">
                    <p className="font-bold truncate">{battingTeam.name}</p>
                    <div className="text-xs mt-1 space-y-0.5">
                      <p>CRR: {currentRunRate}</p>
                      {target && !match.matchOver && (
                        <>
                          <p>RRR: {requiredRunRate}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Batsmen */}
                  <div className="col-span-1 bg-green-500/80 p-2 flex flex-col justify-center">
                      <div className="flex justify-between">
                          <p className="font-semibold truncate">{onStrikeBatsman?.name}*</p>
                          <p>{onStrikeBatsman?.runs} ({onStrikeBatsman?.balls})</p>
                      </div>
                      <div className="flex justify-between text-gray-200">
                          <p className="truncate">{nonStrikeBatsman?.name}</p>
                          <p>{nonStrikeBatsman?.runs} ({nonStrikeBatsman?.balls})</p>
                      </div>
                  </div>

                  {/* Score */}
                  <div className="col-span-1 bg-cyan-600/90 p-2 text-center flex flex-col justify-center">
                      <p className="text-xl font-bold">{currentInnings.score}/{currentInnings.wickets}</p>
                      <p className="text-xs">({formatOvers(currentInnings.balls)} / {oversForInnings})</p>
                      {target && !match.matchOver && (
                          <p className="text-xs mt-1">Need {runsNeeded} in {ballsRemaining} balls</p>
                      )}
                  </div>

                  {/* Bowler */}
                  <div className="col-span-1 bg-blue-500/80 p-2 flex flex-col justify-center">
                    <div className="flex justify-between font-semibold">
                          <p className="truncate">{currentBowler?.name}</p>
                          <p>{currentBowler?.wickets}/{currentBowler?.runsConceded}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs">This Over:</p>
                          <div className="flex gap-1.5 flex-wrap">
                              {thisOverEvents.map((event, i) => {
                                  let text = event.runs.toString();
                                  if(event.isWicket) text = "W";
                                  else if(event.isExtra) text = `${event.runs}${event.extraType?.charAt(0)}`;
                                  return <span key={i} className={`flex items-center justify-center text-xs font-bold ${event.isWicket ? 'text-red-400' : ''}`}>{text}</span>
                              })}
                          </div>
                      </div>
                      <p className="text-xs mt-0.5">({formatOvers(currentBowler?.balls || 0)})</p>
                  </div>

                  {/* Bowling Team */}
                  <div className="col-span-1 bg-red-500/90 p-2 flex flex-col items-center justify-center text-center">
                      <p className="font-bold truncate">{bowlingTeam.name}</p>
                      {target && <p className="text-xs mt-1">Target {target}</p>}
                  </div>
              </div>
              {match.matchOver && (
                  <div className="bg-gray-900/80 text-center p-2 text-lg font-semibold text-green-400">
                      {resultText}
                  </div>
              )}
        </div>
    </div>
  );

  if (isObs) {
    return (
      <div className="relative w-full h-screen bg-transparent">
        {eventAnimation && <EventAnimation type={eventAnimation} onAnimationEnd={() => setEventAnimation(null)} />}
        {activeTickerContent || <Ticker />}
      </div>
    );
  }

  // Default view for non-OBS users
  return (
    <div className="min-h-screen font-sans flex flex-col justify-end">
       {eventAnimation && <EventAnimation type={eventAnimation} onAnimationEnd={() => setEventAnimation(null)} />}
       {activeTickerContent || <Ticker />}
    </div>
  );
}
