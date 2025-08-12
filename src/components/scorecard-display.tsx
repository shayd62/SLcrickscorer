'use client'

import type { MatchState, Innings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

const formatOvers = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

function InningsScorecard({ innings, teamName }: { innings: Innings; teamName: string }) {
  if (!innings) return null;

  const batsmen = Object.values(innings.batsmen).filter(b => b.balls > 0 || b.isOut);
  const bowlers = Object.values(innings.bowlers).filter(b => b.balls > 0);
  const didNotBat = Object.values(innings.batsmen).filter(b => b.balls === 0 && !b.isOut);

  const getDismissalText = (batsman: typeof batsmen[0]) => {
    if (!batsman.isOut || !batsman.outInfo) return 'not out';
    
    const { method, by, fielderId } = batsman.outInfo;
    const bowlerName = innings.bowlers[by]?.name;

    switch (method) {
      case 'Caught':
        const fielderName = innings.bowlers[fielderId!]?.name || bowlingTeamPlayers.find(p => p.id === fielderId)?.name;
        return `c ${fielderName} b ${bowlerName}`;
      case 'Bowled':
        return `b ${bowlerName}`;
      case 'LBW':
        return `lbw b ${bowlerName}`;
      case 'Stumped':
        const stumperName = innings.bowlers[fielderId!]?.name || bowlingTeamPlayers.find(p => p.id === fielderId)?.name;
        return `st ${stumperName} b ${bowlerName}`;
      case 'Run out':
        const runoutFielder = innings.bowlers[fielderId!]?.name || bowlingTeamPlayers.find(p => p.id === fielderId)?.name;
        return `run out (${runoutFielder})`;
      case 'Retired':
        return 'retired hurt';
      default:
        return method;
    }
  };

  const bowlingTeamPlayers = Object.values(innings.bowlers);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-baseline">
          <span>{teamName}</span>
          <span className="text-2xl font-bold">{innings.score}/{innings.wickets} <span className="text-lg text-muted-foreground">({formatOvers(innings.balls)} ov)</span></span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-lg mb-2">Batting</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batsman</TableHead>
                  <TableHead className="text-right">R</TableHead>
                  <TableHead className="text-right">B</TableHead>
                  <TableHead className="text-right">4s</TableHead>
                  <TableHead className="text-right">6s</TableHead>
                  <TableHead className="text-right">SR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batsmen.map(batsman => (
                  <TableRow key={batsman.id}>
                    <TableCell className="font-medium">
                      <p>{batsman.name}</p>
                      <p className="text-xs text-muted-foreground">{getDismissalText(batsman)}</p>
                    </TableCell>
                    <TableCell className="text-right">{batsman.runs}</TableCell>
                    <TableCell className="text-right">{batsman.balls}</TableCell>
                    <TableCell className="text-right">{batsman.fours}</TableCell>
                    <TableCell className="text-right">{batsman.sixes}</TableCell>
                    <TableCell className="text-right">{batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(2) : 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {didNotBat.length > 0 && <p className="text-sm text-muted-foreground mt-2">Did not bat: {didNotBat.map(p => p.name).join(', ')}</p>}
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-2">Bowling</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bowler</TableHead>
                  <TableHead className="text-right">O</TableHead>
                  <TableHead className="text-right">M</TableHead>
                  <TableHead className="text-right">R</TableHead>
                  <TableHead className="text-right">W</TableHead>
                  <TableHead className="text-right">Econ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bowlers.map(bowler => (
                  <TableRow key={bowler.id}>
                    <TableCell className="font-medium">{bowler.name}</TableCell>
                    <TableCell className="text-right">{formatOvers(bowler.balls)}</TableCell>
                    <TableCell className="text-right">{bowler.maidens}</TableCell>
                    <TableCell className="text-right">{bowler.runsConceded}</TableCell>
                    <TableCell className="text-right">{bowler.wickets}</TableCell>
                    <TableCell className="text-right">{bowler.balls > 0 ? ((bowler.runsConceded / bowler.balls) * 6).toFixed(2) : 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ScorecardDisplay({ match }: { match: MatchState }) {
    if (!match) return null;

    const { config, innings1, innings2 } = match;

    const getTeamData = (teamKey: 'team1' | 'team2') => {
        return teamKey === 'team1' ? config.team1 : config.team2;
    }

    const firstInningsBattingTeam = getTeamData(innings1.battingTeam);
    const secondInningsBattingTeam = innings2 ? getTeamData(innings2.battingTeam) : null;

    return (
        <main className="space-y-8">
            <InningsScorecard innings={innings1} teamName={firstInningsBattingTeam.name} />
            {innings2 && <Separator />}
            {innings2 && secondInningsBattingTeam && <InningsScorecard innings={innings2} teamName={secondInningsBattingTeam.name} />}
        </main>
    )
}
