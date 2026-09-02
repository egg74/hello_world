import { RotateCcw, Trophy, Skull } from 'lucide-react';

interface Props {
  reason: string;
  day: number;
  totalFans: number;
  onRestart: () => void;
}

export default function GameOverScreen({ reason, day, totalFans, onRestart }: Props) {
  const victory = reason.startsWith('Victory');

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 p-10 text-center">
      {victory ? (
        <Trophy size={56} className="text-amber-400" />
      ) : (
        <Skull size={56} className="text-rose-500" />
      )}
      <h2 className="text-2xl font-bold text-slate-100">{victory ? 'You Made It Big!' : 'Game Over'}</h2>
      <p className="text-slate-400">{reason}</p>
      <p className="text-sm text-slate-500">
        Survived {day} days &middot; {totalFans} total fans
      </p>
      <button
        onClick={onRestart}
        className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-bold text-slate-900 hover:bg-emerald-400"
      >
        <RotateCcw size={16} />
        Start New Band
      </button>
    </div>
  );
}
