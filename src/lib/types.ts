

export interface Player {
  id: string;
  name: string;
  isOut?: boolean;
}

export interface Team {
  name:string;
  players: Player[];
  captainId?: string;
  wicketKeeperId?: string;
  twelfthManId?: string;
  userId?: string;
}

export interface PointsPolicy {
  win: number;
  loss: number;
  draw: number;
  bonus?: number;
}

export interface Tournament {
  id: string;
  name: string;
  location?: string;
  description?: string;
  numberOfTeams?: string;
  logoUrl?: string;
  startDate: string;
  endDate: string;
  oversPerInnings: number;
  participatingTeams: string[]; // Array of team names
  pointsPolicy: PointsPolicy;
  prize?: string;
  venue?: string;
  ballType?: string;
  pitchType?: string;
  tournamentFormat?: string;
  userId?: string;
}

export interface TournamentPoints {
    teamName: string;
    matchesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    points: number;
    netRunRate: number;
}

export interface MatchConfig {
  team1: Team;
  team2: Team;
  oversPerInnings: number;
  playersPerSide: number;
  toss: {
    winner: 'team1' | 'team2';
    decision: 'bat' | 'bowl';
  };
  opening: {
    strikerId: string;
    nonStrikerId: string;
    bowlerId: string;
  };
  matchType?: string;
  matchFormat?: string;
  tournamentId?: string;
  tournamentStage?: string;
  venue?: string;
  matchDate?: string;
  ballsPerOver: number;
  noBall: {
    enabled: boolean;
    reball: boolean;
    run: number;
  };
  wideBall: {
    enabled: boolean;
    reball: boolean;
    run: number;
  };
}

export interface Batsman extends Player {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  outInfo?: {
    by: string; // bowlerId
    method: string;
    fielderId?: string;
  };
}

export interface Bowler extends Player {
  overs: number;
  balls: number;
  maidens: number;
  runsConceded: number;
  wickets: number;
}

export interface Partnership {
    runs: number;
    balls: number;
    batsman1Id: string;
    batsman2Id: string;
}

export type BallEvent = {
  batsmanId: string;
  bowlerId: string;
  runs: number;
  isExtra: boolean;
  extraType?: 'wd' | 'nb' | 'by' | 'lb';
  isWicket: boolean;
  wicketType?: string;
  fielderId?: string;
  ballInOver: number; // To reconstruct the over
};

export interface Innings {
  battingTeam: 'team1' | 'team2';
  bowlingTeam: 'team1' | 'team2';
  score: number;
  wickets: number;
  overs: number;
  balls: number;
  timeline: BallEvent[]
  batsmen: Record<string, Batsman>;
  bowlers: Record<string, Bowler>;
  currentPartnership: Partnership;
  fallOfWickets: { batsmanId: string; score: number; overs: number; balls: number }[];
}

export interface MatchState {
  config: MatchConfig;
  innings1: Innings;
  innings2?: Innings;
  currentInnings: 'innings1' | 'innings2';
  onStrikeId: string;
  nonStrikeId: string;
  currentBowlerId: string;
  target?: number;
  matchOver: boolean;
  winner?: 'team1' | 'team2' | 'draw';
  resultText: string;
  isBowlerChangeRequired?: boolean;
  isEndOfInnings?: boolean;
  id?: string;
  activeTicker?: 'onStrike' | 'nonStrike' | 'bowler' | 'summary' | 'partnership' | 'tourName' | 'battingCard' | 'bowlingCard' | 'target' | null;
  revisedOvers?: number;
  userId?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  address?: string | null;
  gender: 'Male' | 'Female' | 'Other';
}
