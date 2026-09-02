import { useGameStore } from './store/gameStore';
import StatusBar from './components/StatusBar';
import ManagementScreen from './components/ManagementScreen';
import GigPrepScreen from './components/GigPrepScreen';
import GigLiveScreen from './components/GigLiveScreen';
import GigSummaryScreen from './components/GigSummaryScreen';
import GameOverScreen from './components/GameOverScreen';
import { Guitar } from 'lucide-react';

export default function App() {
  const state = useGameStore();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="flex items-center gap-2 border-b border-slate-800 bg-slate-950 px-4 py-3">
        <Guitar className="text-amber-400" size={22} />
        <h1 className="text-lg font-black tracking-tight">Backstage Pass</h1>
      </header>

      {state.currentPhase !== 'GAME_OVER' && <StatusBar state={state} />}

      {state.currentPhase === 'MANAGEMENT' && (
        <ManagementScreen state={state} onBookGig={state.bookGig} onRest={state.restDay} />
      )}

      {state.currentPhase === 'GIG_PREP' && (
        <GigPrepScreen state={state} onPlayCard={state.playCard} onStartGig={state.startGig} />
      )}

      {state.currentPhase === 'GIG_LIVE' && (
        <GigLiveScreen state={state} onPlayCard={state.playCard} onEndTurn={state.endGigTurn} />
      )}

      {state.currentPhase === 'GIG_SUMMARY' && state.lastGigResult && (
        <GigSummaryScreen result={state.lastGigResult} onContinue={state.continueFromSummary} />
      )}

      {state.currentPhase === 'GAME_OVER' && (
        <GameOverScreen
          reason={state.gameOverReason ?? 'The band called it quits.'}
          day={state.day}
          totalFans={state.totalFans}
          onRestart={state.startNewGame}
        />
      )}
    </div>
  );
}
