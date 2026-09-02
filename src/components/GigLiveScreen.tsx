import type { GameState } from '../types';
import { canPlayCard } from '../store/gameStore';
import CardView from './CardView';
import { SkipForward } from 'lucide-react';

interface Props {
  state: GameState;
  onPlayCard: (id: string) => void;
  onEndTurn: () => void;
}

export default function GigLiveScreen({ state, onPlayCard, onEndTurn }: Props) {
  const venue = state.currentVenue!;
  const progress = Math.min(100, Math.round((state.currentGigHype / venue.hypeRequirement) * 100));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <section className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Live at {venue.name}</h2>
          <span className="text-sm text-slate-400">
            Turn {state.currentGigTurn} / {venue.turns}
          </span>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Hype</span>
            <span>
              {state.currentGigHype} / {venue.hypeRequirement}
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-700">
            <div
              className="h-3 rounded-full bg-amber-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
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
        onClick={onEndTurn}
        className="ml-auto flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-400"
      >
        <SkipForward size={16} />
        End Turn
      </button>
    </div>
  );
}
