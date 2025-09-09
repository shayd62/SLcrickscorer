

export interface Player {
  id: string; // This should be the user's UID
  name: string;
  isOut?: boolean;
}

export interface Team {
  id: string;
  name:string;
  shortName: string;
  players: Player[];
  captainId?: string;
  wicketKeeperId?: string;
  twelfthManId?: string;
  userId?: string;
  logoUrl?: string;
  email?: string;
  city?: string;
  website?: string;
  about?: string;
  isPinProtected?: boolean;
}

export interface Group {
    id: string;
    name: string;
    teamIds: string[];
    userId?: string;
}

export interface PointsPolicy {
  win: number;
  loss: number;
  draw: number;
  bonus?: number;
}

export interface TournamentGroup {
  name: string;
  teams: string[];
}

export interface TournamentMatch {
    id: string;
    groupName: string;
    team1: string;
    team2: string;
    status: 'Upcoming' | 'Live' | 'Completed';
    matchId?: string; // Links to the actual match document in the 'matches' collection
    result?: {
        winner: string;
        loser: string;
        method: string; // e.g. "by 5 wickets"
    }
    date?: string;
    venue?: string;
    overs?: number;
    matchType?: string;
}

export interface Tournament {
  id: string;
  name: string;
  ownerUid?: string;
  status?: 'pending' | 'approved' | 'blocked';
  plan?: 'free' | 'pro' | 'enterprise';
  location?: string;
  description?: string;
  numberOfTeams: string;
  logoUrl?: string;
  coverPhotoUrl?: string;
  startDate: string;
  endDate: string;
  oversPerInnings: number;
  participatingTeams: string[]; // Array of team names
  pointsPolicy: PointsPolicy;
  prize?: string;
  venue?: string;
  ballType?: string;
  pitchType?: string;
  tournamentFormat?: 'ODI' | 'T20' | 'Test' | '100 Ball' | 'Sixes a Side' | 'Limited Overs' | 'Custom';
  userId?: string;
  groups?: TournamentGroup[];
  matches?: TournamentMatch[];
  createdAt?: any;
  ballsPerOver?: number;
  noBall?: { enabled: boolean; reball: boolean; run: number };
  wideBall?: { enabled: boolean; reball: boolean; run: number };
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

export interface BatterLeaderboardStat {
    playerId: string;
    playerName: string;
    teamName: string;
    matches: number;
    runs: number;
    balls: number;
    strikeRate: number;
    points: number;
}

export interface BowlerLeaderboardStat {
    playerId: string;
    playerName: string;
    teamName: string;
    matches: number;
    overs: string;
    wickets: number;
    runsConceded: number;
    economy: number;
    points: number;
}

export interface FielderLeaderboardStat {
    playerId: string;
    playerName: string;
    teamName: string;
    matches: number;
    catches: number;
    runOuts: number;
    stumpings: number;
    points: number;
}

export interface AllRounderLeaderboardStat {
    playerId: string;
    playerName: string;
    teamName: string;
    matches: number;
    runs: number;
    wickets: number;
    points: number;
}


export interface PowerPlay {
  type: string; // e.g., 'P1', 'P2'
  startOver: number;
  endOver: number;
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
  matchFormat?: 'Limited Overs' | 'Test Match' | 'The Hundred' | 'T20' | 'ODI'
  tournamentId?: string;
  tournamentStage?: string;
  venue?: string;
  matchDate?: string;
  ballsPerOver: number;
  powerPlay?: PowerPlay[];
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
  activeTicker?: 'onStrike' | 'nonStrike' | 'bowler' | 'summary' | 'partnership' | 'tourName' | 'battingCard' | 'bowlingCard' | 'target' | 'teamSquad' | 'bowlingTeamSquad' | 'batterCareer' | 'nonStrikerCareer' | null;
  revisedOvers?: number;
  userId?: string;
  startTime?: string;
  endTime?: string;
}

export interface UserProfile {
  id: string; // The document ID, which is the phone number
  uid: string;
  name: string;
  shortName?: string;
  email?: string;
  phoneNumber: string;
  address?: string | null;
  age?: number;
  gender: 'Male' | 'Female' | 'Other';
  battingStyle?: 'Right-handed' | 'Left-handed';
  bowlingStyle?: 'Right-arm' | 'Left-arm';
  isWicketKeeper?: boolean;
  photoURL?: string;
  role?: 'admin' | 'user';
  isPlaceholder?: boolean;
}

// New types for the admin panel
export type AdminRole = "super_admin" | "org_admin" | "scorer" | "viewer";

export interface AdminUser {
  uid: string;
  email: string;
  name: string;
  roles: AdminRole[];
  status: "active" | "suspended";
  createdAt: any; // Firestore timestamp
  lastActivity?: any;
}

export interface Invoice {
    id: string;
    tournamentId: string;
    amount: number;
    currency: string;
    period: { start: any; end: any; };
    status: 'paid' | 'pending' | 'overdue';
}

export interface Log {
    id: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    context?: Record<string, any>;
    createdAt: any;
}

export interface FeatureFlag {
    id: string;
    key: string;
    enabled: boolean;
    description?: string;
}

export interface Feedback {
    id: string;
    feedback: string;
    userId?: string;
    userEmail?: string;
    createdAt: any; // Firestore Timestamp
}
