import type { GigResult } from '../types';
import { PartyPopper, Frown, ArrowRight } from 'lucide-react';

interface Props {
  result: GigResult;
  onContinue: () => void;
}

export default function GigSummaryScreen({ result, onContinue }: Props) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 p-10 text-center">
      {result.won ? (
        <PartyPopper size={48} className="text-amber-400" />
      ) : (
        <Frown size={48} className="text-rose-400" />
      )}
      <h2 className="text-2xl font-bold text-slate-100">
        {result.won ? 'The crowd went wild!' : 'The crowd was unimpressed.'}
      </h2>
      <p className="text-slate-400">{result.venueName}</p>

      <div className="grid w-full grid-cols-2 gap-3 text-left">
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 p-3">
          <p className="text-[10px] uppercase text-slate-400">Hype Reached</p>
          <p className="text-lg font-bold text-amber-400">
            {result.hypeReached} / {result.hypeRequirement}
          </p>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 p-3">
          <p className="text-[10px] uppercase text-slate-400">Payout</p>
          <p className="text-lg font-bold text-emerald-400">${result.payout}</p>
        </div>
        <div className="col-span-2 rounded-lg border border-slate-700/60 bg-slate-800/60 p-3">
          <p className="text-[10px] uppercase text-slate-400">New Fans</p>
          <p className="text-lg font-bold text-indigo-400">+{result.fansGained}</p>
        </div>
      </div>

      <button
        onClick={onContinue}
        className="flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-400"
      >
        Continue
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
