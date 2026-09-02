import { DollarSign, Flame, Guitar, Skull, Zap, Heart } from 'lucide-react';
import type { Card } from '../types';

interface Props {
  card: Card;
  playable: boolean;
  onPlay?: (id: string) => void;
}

const TYPE_STYLES: Record<Card['type'], { border: string; badge: string; icon: React.ReactNode }> = {
  prep: {
    border: 'border-emerald-500/50',
    badge: 'bg-emerald-500/20 text-emerald-300',
    icon: <DollarSign size={12} />,
  },
  performance: {
    border: 'border-indigo-500/50',
    badge: 'bg-indigo-500/20 text-indigo-300',
    icon: <Guitar size={12} />,
  },
  drama: {
    border: 'border-rose-500/50',
    badge: 'bg-rose-500/20 text-rose-300',
    icon: <Skull size={12} />,
  },
};

export default function CardView({ card, playable, onPlay }: Props) {
  const style = TYPE_STYLES[card.type];
  const costIcon = card.type === 'performance' ? <Zap size={12} /> : <DollarSign size={12} />;

  return (
    <div
      className={`flex w-40 shrink-0 flex-col justify-between rounded-xl border ${style.border} bg-slate-800/80 p-3 shadow-lg transition-transform ${
        playable ? 'hover:-translate-y-1' : 'opacity-50'
      }`}
    >
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${style.badge}`}>
            {style.icon}
            {card.type}
          </span>
          {card.cost > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-slate-300">
              {costIcon}
              {card.cost}
            </span>
          )}
        </div>
        <h4 className="text-sm font-bold text-slate-100">{card.name}</h4>
        <p className="mt-1 text-[11px] leading-snug text-slate-400">{card.description}</p>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px]">
        {!!card.hypeGained && (
          <span className={`flex items-center gap-0.5 ${card.hypeGained > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
            <Flame size={12} />
            {card.hypeGained > 0 ? '+' : ''}
            {card.hypeGained}
          </span>
        )}
        {!!card.cashGained && (
          <span className="flex items-center gap-0.5 text-emerald-400">
            <DollarSign size={12} />+{card.cashGained}
          </span>
        )}
        {!!card.harmonyChange && (
          <span className={`flex items-center gap-0.5 ${card.harmonyChange > 0 ? 'text-rose-300' : 'text-rose-500'}`}>
            <Heart size={12} />
            {card.harmonyChange > 0 ? '+' : ''}
            {card.harmonyChange}
          </span>
        )}
      </div>
      <button
        disabled={!playable}
        onClick={() => onPlay?.(card.id)}
        className={`mt-2 rounded-lg py-1 text-xs font-semibold transition-colors ${
          playable
            ? card.type === 'drama'
              ? 'bg-rose-600 text-white hover:bg-rose-500'
              : 'bg-slate-100 text-slate-900 hover:bg-white'
            : 'cursor-not-allowed bg-slate-700 text-slate-400'
        }`}
      >
        {card.type === 'drama' ? 'Resolve' : 'Play'}
      </button>
    </div>
  );
}
