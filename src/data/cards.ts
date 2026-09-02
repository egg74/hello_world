import type { Card } from '../types';

let uid = 0;
const nextId = (prefix: string) => `${prefix}-${uid++}`;

export const CARD_TEMPLATES: Record<string, Omit<Card, 'id'>> = {
  promoFlyer: {
    name: 'Promo Flyer',
    type: 'prep',
    cost: 10,
    hypeGained: 5,
    description: 'Cheap flyers around town. +5 starting hype.',
  },
  radioInterview: {
    name: 'Radio Interview',
    type: 'prep',
    cost: 25,
    hypeGained: 12,
    description: 'A local radio spot builds buzz. +12 starting hype.',
  },
  hireSoundTech: {
    name: 'Hire Sound Tech',
    type: 'prep',
    cost: 30,
    hypeGained: 8,
    harmonyChange: 5,
    description: 'A pro on the boards. +8 starting hype, +5 band harmony.',
  },
  rehearseSet: {
    name: 'Rehearse Set',
    type: 'prep',
    cost: 5,
    harmonyChange: 10,
    description: 'Tighten up the set list. +10 band harmony.',
  },
  merchTable: {
    name: 'Merch Table',
    type: 'prep',
    cost: 15,
    hypeGained: 4,
    description: 'Set up a merch table by the door. +4 starting hype.',
  },
  killerGuitarSolo: {
    name: 'Killer Guitar Solo',
    type: 'performance',
    cost: 2,
    hypeGained: 15,
    egoChange: 5,
    description: 'Shreds the crowd into a frenzy. +15 hype, +5 ego.',
  },
  crowdSurf: {
    name: 'Crowd Surf',
    type: 'performance',
    cost: 3,
    hypeGained: 20,
    egoChange: 10,
    harmonyChange: -5,
    description: 'Risky, but the crowd loves it. +20 hype, +10 ego, -5 harmony.',
  },
  stageBanter: {
    name: 'Stage Banter',
    type: 'performance',
    cost: 1,
    hypeGained: 6,
    description: 'A quick joke to warm up the room. +6 hype.',
  },
  drumSolo: {
    name: 'Drum Solo',
    type: 'performance',
    cost: 2,
    hypeGained: 12,
    egoChange: 8,
    description: 'The drummer takes center stage. +12 hype, +8 ego.',
  },
  encore: {
    name: 'Encore',
    type: 'performance',
    cost: 4,
    hypeGained: 25,
    cashGained: 20,
    description: 'One more song! +25 hype, +$20 in tips.',
  },
  basslineGroove: {
    name: 'Bassline Groove',
    type: 'performance',
    cost: 1,
    hypeGained: 8,
    description: 'A steady groove keeps the crowd moving. +8 hype.',
  },
  crowdSingAlong: {
    name: 'Crowd Sing-Along',
    type: 'performance',
    cost: 2,
    hypeGained: 14,
    harmonyChange: 5,
    description: 'Everyone joins in, band included. +14 hype, +5 harmony.',
  },
  divaTantrum: {
    name: 'Diva Tantrum',
    type: 'drama',
    cost: 0,
    egoChange: 20,
    harmonyChange: -15,
    description: 'Someone is not happy with the setlist. +20 ego, -15 harmony.',
    isUnplayable: true,
  },
  backstageArgument: {
    name: 'Backstage Argument',
    type: 'drama',
    cost: 0,
    egoChange: 10,
    harmonyChange: -10,
    description: 'Tempers flare before the show. +10 ego, -10 harmony.',
    isUnplayable: true,
  },
  brokenString: {
    name: 'Broken String',
    type: 'drama',
    cost: 0,
    hypeGained: -5,
    harmonyChange: -5,
    description: 'Gear failure mid-set. -5 hype, -5 harmony.',
    isUnplayable: true,
  },
  missedCue: {
    name: 'Missed Cue',
    type: 'drama',
    cost: 0,
    hypeGained: -8,
    description: 'The band misses a transition. -8 hype.',
    isUnplayable: true,
  },
};

const STARTER_DECK_KEYS: (keyof typeof CARD_TEMPLATES)[] = [
  'promoFlyer',
  'promoFlyer',
  'radioInterview',
  'hireSoundTech',
  'rehearseSet',
  'rehearseSet',
  'merchTable',
  'killerGuitarSolo',
  'killerGuitarSolo',
  'crowdSurf',
  'stageBanter',
  'stageBanter',
  'drumSolo',
  'encore',
  'basslineGroove',
  'basslineGroove',
  'crowdSingAlong',
  'divaTantrum',
  'backstageArgument',
  'brokenString',
  'missedCue',
];

export function createStarterDeck(): Card[] {
  return STARTER_DECK_KEYS.map((key) => ({
    id: nextId(key),
    ...CARD_TEMPLATES[key],
  }));
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
