import { DollarSign, Users, HeartCrack, CalendarDays, Zap, Flame } from 'lucide-react';
import type { GameState } from '../types';

interface Props {
  state: GameState;
}

function Stat({
  icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2 border border-slate-700/50">
      <span className={colorClass}>{icon}</span>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
        <span className={`text-sm font-semibold ${colorClass}`}>{value}</span>
      </div>
    </div>
  );
}

export default function StatusBar({ state }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-950/80 px-4 py-3">
      <Stat icon={<CalendarDays size={16} />} label="Day" value={state.day} colorClass="text-slate-200" />
      <Stat icon={<DollarSign size={16} />} label="Cash" value={`$${state.cash}`} colorClass="text-emerald-400" />
      <Stat icon={<Users size={16} />} label="Fans" value={state.totalFans} colorClass="text-indigo-400" />
      <Stat
        icon={<HeartCrack size={16} />}
        label="Harmony"
        value={`${state.bandHarmony}/100`}
        colorClass={state.bandHarmony < 30 ? 'text-rose-500' : 'text-rose-300'}
      />
      {state.currentPhase === 'GIG_LIVE' && (
        <>
          <Stat icon={<Flame size={16} />} label="Hype" value={state.currentGigHype} colorClass="text-amber-400" />
          <Stat
            icon={<Zap size={16} />}
            label="Energy"
            value={`${state.energy}/${state.maxEnergy}`}
            colorClass="text-indigo-300"
          />
        </>
      )}
    </div>
  );
}
