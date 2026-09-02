import type { BandMember } from '../types';
import { Mic2, Guitar, Music4, Drum } from 'lucide-react';

const ROLE_ICON: Record<BandMember['role'], React.ReactNode> = {
  Vocalist: <Mic2 size={16} />,
  Guitarist: <Guitar size={16} />,
  Bassist: <Music4 size={16} />,
  Drummer: <Drum size={16} />,
};

function Bar({ value, colorClass }: { value: number; colorClass: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-700">
      <div className={`h-1.5 rounded-full ${colorClass}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export default function BandMemberCard({ member }: { member: BandMember }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-700/50 bg-slate-800/60 p-3">
      <div className="flex items-center gap-2">
        <span className="text-indigo-300">{ROLE_ICON[member.role]}</span>
        <span className="text-sm font-semibold text-slate-100">{member.name}</span>
        <span className="ml-auto text-[10px] uppercase text-slate-400">{member.role}</span>
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>Ego</span>
          <span>{member.ego}</span>
        </div>
        <Bar value={member.ego} colorClass="bg-rose-500" />
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>Morale</span>
          <span>{member.morale}</span>
        </div>
        <Bar value={member.morale} colorClass="bg-indigo-400" />
      </div>
    </div>
  );
}
