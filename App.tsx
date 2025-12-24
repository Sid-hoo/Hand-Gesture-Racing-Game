
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState } from './types';
import GameCanvas from './components/GameCanvas';
import HandTracker from './components/HandTracker';
import { Trophy, Play, RefreshCw, Hand, Info } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('hand-racer-highscore');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [targetLane, setTargetLane] = useState(1); // 0: Left, 1: Center, 2: Right
  const [handDetected, setHandDetected] = useState(false);

  // Handle hand tracking input
  const onHandMove = useCallback((lane: number) => {
    setTargetLane(lane);
    setHandDetected(true);
  }, []);

  const onHandLost = useCallback(() => {
    setHandDetected(false);
  }, []);

  const startGame = () => {
    setScore(0);
    setGameState(GameState.PLAYING);
    // AudioContext is usually suspended until user interaction
    if ((window as any).audioContext?.state === 'suspended') {
      (window as any).audioContext.resume();
    }
  };

  const gameOver = (finalScore: number) => {
    setGameState(GameState.GAMEOVER);
    const roundedScore = Math.floor(finalScore);
    setScore(roundedScore);
    if (roundedScore > highScore) {
      setHighScore(roundedScore);
      localStorage.setItem('hand-racer-highscore', roundedScore.toString());
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 -z-10" />

      <div className="relative w-full max-w-4xl aspect-[4/3] bg-black shadow-2xl shadow-blue-500/20 rounded-xl overflow-hidden border border-slate-800">
        <GameCanvas 
          gameState={gameState} 
          targetLane={targetLane} 
          onGameOver={gameOver}
          onScoreUpdate={setScore}
        />

        {gameState === GameState.PLAYING && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-700">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Score</p>
              <p className="text-3xl font-black text-white tabular-nums">{Math.floor(score)}</p>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${handDetected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'} animate-pulse`} />
                <span className="text-xs font-bold uppercase text-slate-300">
                  {handDetected ? 'Sensor Active' : 'Searching for Hand...'}
                </span>
              </div>
            </div>
          </div>
        )}

        {gameState === GameState.START && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8 z-20">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-4 italic uppercase tracking-tighter">
              AERO-HAND RACER
            </h1>
            <p className="text-slate-400 mb-8 max-w-md">
              A futuristic high-speed racer controlled entirely by your hand position.
            </p>
            
            <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-sm">
              <div className="flex flex-col items-center gap-2 p-3 bg-slate-900 rounded-lg border border-slate-700">
                <Hand className="w-6 h-6 text-blue-400 -rotate-45" />
                <span className="text-[10px] uppercase font-bold text-slate-500">Left Lane</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 bg-slate-900 rounded-lg border border-slate-700">
                <Hand className="w-6 h-6 text-emerald-400" />
                <span className="text-[10px] uppercase font-bold text-slate-500">Center</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 bg-slate-900 rounded-lg border border-slate-700">
                <Hand className="w-6 h-6 text-blue-400 rotate-45" />
                <span className="text-[10px] uppercase font-bold text-slate-500">Right Lane</span>
              </div>
            </div>

            <button 
              onClick={startGame}
              className="group relative px-10 py-4 bg-white text-black font-black uppercase tracking-widest rounded-full overflow-hidden transition-all hover:scale-110 active:scale-95 flex items-center gap-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Play className="relative z-10 w-5 h-5 fill-current" />
              <span className="relative z-10">Launch Pilot</span>
            </button>
            <div className="mt-6 flex items-center gap-2 text-slate-500 text-xs font-bold uppercase">
              <Trophy className="w-4 h-4 text-amber-500" />
              High Score: {highScore}
            </div>
          </div>
        )}

        {gameState === GameState.GAMEOVER && (
          <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 z-20 animate-in fade-in zoom-in duration-300">
            <h2 className="text-7xl font-black text-white mb-2 italic uppercase">CRASHED!</h2>
            <div className="h-1 w-24 bg-white mb-8" />
            
            <div className="flex gap-12 mb-12">
              <div>
                <p className="text-red-300 text-xs font-bold uppercase tracking-widest mb-1">Final Score</p>
                <p className="text-5xl font-black text-white tabular-nums">{Math.floor(score)}</p>
              </div>
              <div>
                <p className="text-red-300 text-xs font-bold uppercase tracking-widest mb-1">Session High</p>
                <p className="text-5xl font-black text-white/50 tabular-nums">{highScore}</p>
              </div>
            </div>

            <button 
              onClick={startGame}
              className="flex items-center gap-3 px-10 py-4 bg-white text-red-900 font-black uppercase tracking-widest rounded-full transition-all hover:scale-110 active:scale-95 shadow-xl shadow-red-900/50"
            >
              <RefreshCw className="w-6 h-6" />
              Re-Deploy Ship
            </button>
          </div>
        )}

        {gameState === GameState.LOADING && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 z-30">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6" />
            <h3 className="text-blue-400 font-bold tracking-widest uppercase animate-pulse">Syncing Hand Interface...</h3>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-8">
        <div className="relative w-48 aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-800 group">
          <HandTracker 
            onMove={onHandMove} 
            onLost={onHandLost}
            onReady={() => setGameState(GameState.START)}
          />
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-[10px] font-mono text-emerald-400 uppercase tracking-tight flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Neuro-Link: ACTIVE
          </div>
        </div>

        <div className="flex flex-col gap-2 max-w-sm text-slate-500 text-xs leading-relaxed">
          <div className="flex items-center gap-2 text-slate-300 font-bold mb-1">
            <Info className="w-4 h-4" />
            <span>NEURAL CONTROL GUIDE</span>
          </div>
          <p>• Hold your open palm clearly toward the camera.</p>
          <p>• Move hand <strong>Left/Right</strong> to shift lanes.</p>
          <p>• Keep hand <strong>Centered</strong> to hold course.</p>
          <p>• System uses 0.1s latency neuro-link for 1:1 response.</p>
        </div>
      </div>
    </div>
  );
};

export default App;
