import type { GameState, Venue } from '../types';
import { VENUES } from '../data/venues';
import BandMemberCard from './BandMemberCard';
import { Moon, Ticket } from 'lucide-react';

interface Props {
  state: GameState;
  onBookGig: (venue: Venue) => void;
  onRest: () => void;
}

export default function ManagementScreen({ state, onBookGig, onRest }: Props) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-100">The Band</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {state.members.map((m) => (
            <BandMemberCard key={m.id} member={m} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Book a Gig</h2>
          <button
            onClick={onRest}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            <Moon size={14} />
            Rest Day (+10 Harmony)
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {VENUES.map((venue) => (
            <div
              key={venue.id}
              className="flex flex-col justify-between rounded-xl border border-slate-700/60 bg-slate-800/60 p-4"
            >
              <div>
                <h3 className="font-bold text-slate-100">{venue.name}</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Requires {venue.hypeRequirement} hype &middot; Capacity {venue.capacity} &middot; {venue.turns} turns
                </p>
                <p className="mt-1 text-xs text-slate-500">Payout multiplier x{venue.payoutMultiplier}</p>
              </div>
              <button
                onClick={() => onBookGig(venue)}
                className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 py-1.5 text-xs font-bold text-slate-900 hover:bg-emerald-400"
              >
                <Ticket size={14} />
                Book Gig
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-slate-100">Tour Log</h2>
        <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
          {state.log.map((entry, i) => (
            <div key={i} className="border-b border-slate-800/60 py-1 last:border-none">
              {entry}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
