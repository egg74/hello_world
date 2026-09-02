import type { Venue } from '../types';

export const VENUES: Venue[] = [
  {
    id: 'dive-bar',
    name: 'The Dive Bar',
    hypeRequirement: 30,
    capacity: 50,
    payoutMultiplier: 1,
    turns: 3,
  },
  {
    id: 'underground-club',
    name: 'Underground Club',
    hypeRequirement: 60,
    capacity: 150,
    payoutMultiplier: 1.5,
    turns: 4,
  },
  {
    id: 'music-hall',
    name: 'Music Hall',
    hypeRequirement: 100,
    capacity: 400,
    payoutMultiplier: 2,
    turns: 5,
  },
  {
    id: 'festival-stage',
    name: 'Festival Stage',
    hypeRequirement: 160,
    capacity: 1000,
    payoutMultiplier: 3,
    turns: 6,
  },
];
