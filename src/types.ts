export type CardType = 'prep' | 'performance' | 'drama';

export interface Card {
  id: string;
  name: string;
  type: CardType;
  cost: number; // Energy cost in performance, or $ cost in prep. Drama cards cost 0.
  hypeGained?: number;
  cashGained?: number;
  egoChange?: number; // positive = worse (more ego), applied to a random member
  harmonyChange?: number; // positive = better morale for the whole band
  description: string;
  isUnplayable?: boolean;
}

export type BandRole = 'Vocalist' | 'Guitarist' | 'Bassist' | 'Drummer';

export interface BandMember {
  id: string;
  name: string;
  role: BandRole;
  ego: number; // 0 to 100
  morale: number; // 0 to 100
}

export interface Venue {
  id: string;
  name: string;
  hypeRequirement: number;
  capacity: number;
  payoutMultiplier: number;
  turns: number; // Duration of gig, in turns
}

export type GamePhase =
  | 'MANAGEMENT'
  | 'GIG_PREP'
  | 'GIG_LIVE'
  | 'GIG_SUMMARY'
  | 'GAME_OVER';

export interface GigResult {
  won: boolean;
  hypeReached: number;
  hypeRequirement: number;
  payout: number;
  fansGained: number;
  venueName: string;
}

export interface GameState {
  day: number;
  cash: number;
  totalFans: number;
  bandHarmony: number; // 0-100 (Loss at 0)
  currentPhase: GamePhase;

  // Card System
  deck: Card[];
  hand: Card[];
  discardPile: Card[];

  // Active Entities
  members: BandMember[];
  currentVenue: Venue | null;

  // Gig Tracking
  currentGigTurn: number;
  currentGigHype: number;
  energy: number;
  maxEnergy: number;

  // Misc
  lastGigResult: GigResult | null;
  gameOverReason: string | null;
  log: string[];
}
