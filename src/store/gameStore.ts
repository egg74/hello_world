import { create } from 'zustand';
import type { BandMember, Card, GameState, Venue } from '../types';
import { createStarterDeck, shuffle } from '../data/cards';
import { STARTER_MEMBERS } from '../data/members';

export const HAND_SIZE = 4;
export const STARTING_CASH = 100;
export const STARTING_ENERGY = 4;
export const FAME_GOAL = 5000;

interface GameActions {
  startNewGame: () => void;
  bookGig: (venue: Venue) => void;
  startGig: () => void;
  playCard: (cardId: string) => void;
  endGigTurn: () => void;
  restDay: () => void;
  continueFromSummary: () => void;
}

export type GameStore = GameState & GameActions;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildInitialState(): GameState {
  return {
    day: 1,
    cash: STARTING_CASH,
    totalFans: 0,
    bandHarmony: 75,
    currentPhase: 'MANAGEMENT',
    deck: shuffle(createStarterDeck()),
    hand: [],
    discardPile: [],
    members: STARTER_MEMBERS.map((m) => ({ ...m })),
    currentVenue: null,
    currentGigTurn: 0,
    currentGigHype: 0,
    energy: STARTING_ENERGY,
    maxEnergy: STARTING_ENERGY,
    lastGigResult: null,
    gameOverReason: null,
    log: ['Welcome to Backstage Pass. Book your first gig!'],
  };
}

function draw(state: GameState, count: number): Pick<GameState, 'deck' | 'hand' | 'discardPile'> {
  let deck = [...state.deck];
  let discardPile = [...state.discardPile];
  const hand = [...state.hand];

  for (let i = 0; i < count; i++) {
    if (deck.length === 0) {
      if (discardPile.length === 0) break;
      deck = shuffle(discardPile);
      discardPile = [];
    }
    const card = deck.shift();
    if (card) hand.push(card);
  }

  return { deck, hand, discardPile };
}

function applyCardEffects(state: GameState, card: Card): Partial<GameState> {
  const patch: Partial<GameState> = {};

  if (card.hypeGained) {
    patch.currentGigHype = Math.max(0, state.currentGigHype + card.hypeGained);
  }
  if (card.cashGained) {
    patch.cash = state.cash + card.cashGained;
  }
  if (card.harmonyChange) {
    patch.bandHarmony = clamp(state.bandHarmony + card.harmonyChange, 0, 100);
  }
  if (card.egoChange) {
    const members = [...state.members];
    const idx = Math.floor(Math.random() * members.length);
    const target = members[idx];
    const newEgo = clamp(target.ego + card.egoChange, 0, 100);
    const moraleDelta = card.egoChange > 0 ? -Math.round(card.egoChange / 2) : Math.round(-card.egoChange / 2);
    members[idx] = {
      ...target,
      ego: newEgo,
      morale: clamp(target.morale + moraleDelta, 0, 100),
    };
    patch.members = members;
  }

  return patch;
}

function checkGameOver(state: GameState): Partial<GameState> {
  const harmony = state.bandHarmony;
  if (harmony <= 0) {
    return {
      currentPhase: 'GAME_OVER',
      gameOverReason: 'The band broke up. Band harmony hit rock bottom.',
    };
  }
  if (state.totalFans >= FAME_GOAL) {
    return {
      currentPhase: 'GAME_OVER',
      gameOverReason: `Victory! Your band reached ${FAME_GOAL.toLocaleString()} fans and made it big.`,
    };
  }
  return {};
}

export function canPlayCard(state: GameState, card: Card): boolean {
  if (state.currentPhase === 'GIG_PREP') {
    if (card.type === 'drama') return true;
    if (card.type !== 'prep') return false;
    return state.cash >= card.cost;
  }
  if (state.currentPhase === 'GIG_LIVE') {
    if (card.type === 'drama') return true;
    if (card.type !== 'performance') return false;
    return state.energy >= card.cost;
  }
  return false;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...buildInitialState(),

  startNewGame: () => set(buildInitialState()),

  bookGig: (venue: Venue) => {
    const state = get();
    if (state.currentPhase !== 'MANAGEMENT') return;
    const { deck, hand, discardPile } = draw(state, HAND_SIZE);
    set({
      currentVenue: venue,
      currentPhase: 'GIG_PREP',
      currentGigHype: 0,
      deck,
      hand,
      discardPile,
      log: [`Booked a gig at ${venue.name}.`, ...state.log],
    });
  },

  startGig: () => {
    const state = get();
    if (state.currentPhase !== 'GIG_PREP' || !state.currentVenue) return;
    const discardedPrepHand = [...state.discardPile, ...state.hand];
    const { deck, hand, discardPile } = draw({ ...state, hand: [], discardPile: discardedPrepHand }, HAND_SIZE);
    set({
      currentPhase: 'GIG_LIVE',
      currentGigTurn: 1,
      energy: state.maxEnergy,
      deck,
      hand,
      discardPile,
      log: [`The show begins at ${state.currentVenue.name}!`, ...state.log],
    });
  },

  playCard: (cardId: string) => {
    const state = get();
    const card = state.hand.find((c) => c.id === cardId);
    if (!card) return;
    if (!canPlayCard(state, card)) return;

    const hand = state.hand.filter((c) => c.id !== cardId);
    const discardPile = [...state.discardPile, card];

    let costPatch: Partial<GameState> = {};
    if (state.currentPhase === 'GIG_PREP' && card.type === 'prep') {
      costPatch = { cash: state.cash - card.cost };
    } else if (state.currentPhase === 'GIG_LIVE' && card.type === 'performance') {
      costPatch = { energy: state.energy - card.cost };
    }

    const afterCost: GameState = { ...state, ...costPatch, hand, discardPile };
    const effectPatch = applyCardEffects(afterCost, card);
    const afterEffects: GameState = { ...afterCost, ...effectPatch };
    const overPatch = checkGameOver(afterEffects);

    set({
      ...costPatch,
      ...effectPatch,
      hand,
      discardPile,
      log: [`Played ${card.name}.`, ...state.log].slice(0, 30),
      ...overPatch,
    });
  },

  endGigTurn: () => {
    const state = get();
    if (state.currentPhase !== 'GIG_LIVE' || !state.currentVenue) return;

    const discardPile = [...state.discardPile, ...state.hand];
    const nextTurn = state.currentGigTurn + 1;

    if (nextTurn > state.currentVenue.turns) {
      finishGig({ ...state, hand: [], discardPile });
      return;
    }

    const { deck, hand, discardPile: newDiscard } = draw(
      { ...state, hand: [], discardPile },
      HAND_SIZE,
    );

    set({
      deck,
      hand,
      discardPile: newDiscard,
      currentGigTurn: nextTurn,
      energy: state.maxEnergy,
      log: [`Turn ${nextTurn} of ${state.currentVenue.turns} at ${state.currentVenue.name}.`, ...state.log],
    });
  },

  restDay: () => {
    const state = get();
    if (state.currentPhase !== 'MANAGEMENT') return;
    const members: BandMember[] = state.members.map((m) => ({
      ...m,
      ego: clamp(m.ego - 5, 0, 100),
      morale: clamp(m.morale + 5, 0, 100),
    }));
    set({
      day: state.day + 1,
      bandHarmony: clamp(state.bandHarmony + 10, 0, 100),
      members,
      log: [`Day ${state.day}: the band rested up.`, ...state.log],
    });
  },

  continueFromSummary: () => {
    const state = get();
    if (state.currentPhase !== 'GIG_SUMMARY') return;
    const combinedDeck = shuffle([...state.deck, ...state.hand, ...state.discardPile]);
    set({
      currentPhase: 'MANAGEMENT',
      currentVenue: null,
      currentGigHype: 0,
      currentGigTurn: 0,
      deck: combinedDeck,
      hand: [],
      discardPile: [],
      day: state.day + 1,
    });
  },
}));

function finishGig(state: GameState) {
  const venue = state.currentVenue!;
  const won = state.currentGigHype >= venue.hypeRequirement;
  const performanceRatio = clamp(state.currentGigHype / venue.hypeRequirement, 0, 2);

  const payout = Math.round(venue.capacity * venue.payoutMultiplier * (won ? performanceRatio * 0.5 : 0.1));
  const fansGained = Math.round(venue.capacity * (won ? performanceRatio * 0.3 : 0.05));

  const avgEgo = state.members.reduce((sum, m) => sum + m.ego, 0) / state.members.length;
  const harmonyDelta = avgEgo > 60 ? -10 : avgEgo < 40 ? 5 : -2;

  const members = state.members.map((m) => ({
    ...m,
    ego: clamp(m.ego - 10, 0, 100),
  }));

  const cash = state.cash + payout;
  const totalFans = state.totalFans + fansGained;
  const bandHarmony = clamp(state.bandHarmony + harmonyDelta, 0, 100);

  const patched: GameState = {
    ...state,
    cash,
    totalFans,
    bandHarmony,
    members,
    currentPhase: 'GIG_SUMMARY',
    lastGigResult: {
      won,
      hypeReached: state.currentGigHype,
      hypeRequirement: venue.hypeRequirement,
      payout,
      fansGained,
      venueName: venue.name,
    },
    log: [
      won ? `Nailed the gig at ${venue.name}!` : `Rough night at ${venue.name}.`,
      ...state.log,
    ],
  };

  const overPatch = checkGameOver(patched);
  useGameStore.setState({ ...patched, ...overPatch });
}
