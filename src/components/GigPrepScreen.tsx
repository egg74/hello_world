import type { GameState } from '../types';
import { canPlayCard } from '../store/gameStore';
import CardView from './CardView';
import { Flame, PlayCircle } from 'lucide-react';

interface Props {
  state: GameState;
  onPlayCard: (id: string) => void;
  onStartGig: () => void;
}

export default function GigPrepScreen({ state, onPlayCard, onStartGig }: Props) {
  const venue = state.currentVenue!;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <section className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-4">
        <h2 className="text-lg font-bold text-slate-100">Prepping for {venue.name}</h2>
        <p className="mt-1 text-sm text-slate-400">
          Play prep cards to build starting hype before the show. You need{' '}
          <span className="font-semibold text-amber-400">{venue.hypeRequirement} hype</span> across{' '}
          {venue.turns} turns to win the crowd.
        </p>
        <div className="mt-3 flex items-center gap-2 text-amber-400">
          <Flame size={18} />
          <span className="text-xl font-bold">{state.currentGigHype}</span>
          <span className="text-xs text-slate-500">starting hype</span>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Your Hand</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {state.hand.map((card) => (
            <CardView key={card.id} card={card} playable={canPlayCard(state, card)} onPlay={onPlayCard} />
          ))}
          {state.hand.length === 0 && <p className="text-sm text-slate-500">No cards in hand.</p>}
        </div>
      </section>

      <button
        onClick={onStartGig}
        className="ml-auto flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-400"
      >
        <PlayCircle size={16} />
        Start Gig
      </button>
    </div>
  );
}
