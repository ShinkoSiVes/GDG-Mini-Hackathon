import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Check, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PomodoroTimerProps {
  habitTitle: string;
  onSessionComplete: (minutes: number) => void;
  onClose: () => void;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  habitTitle,
  onSessionComplete,
  onClose,
}) => {
  const WORK_SECONDS = 25 * 60;
  const BREAK_SECONDS = 5 * 60;

  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [timeLeft, setTimeLeft] = useState<number>(WORK_SECONDS);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (mode === 'work') {
        confetti({ particleCount: 60, spread: 50 });
        onSessionComplete(25);
        setMode('break');
        setTimeLeft(BREAK_SECONDS);
      } else {
        setMode('work');
        setTimeLeft(WORK_SECONDS);
      }
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, onSessionComplete]);

  const toggleRun = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? WORK_SECONDS : BREAK_SECONDS);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercent =
    ((((mode === 'work' ? WORK_SECONDS : BREAK_SECONDS) - timeLeft) /
      (mode === 'work' ? WORK_SECONDS : BREAK_SECONDS)) *
      100);

  return (
    <div className="mt-3 p-3.5 bg-paper-100 rounded-2xl border-2 border-ink shadow-chunky-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-mango animate-ping" />
          <span className="text-xs font-bold text-ink uppercase tracking-wider">
            {mode === 'work' ? '🍅 25m Focus Sprint' : '☕ 5m Quick Break'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-ink-muted hover:text-ink font-semibold"
        >
          Isara
        </button>
      </div>

      {/* Timer display */}
      <div className="flex flex-col items-center justify-center my-2">
        <div className="text-3xl font-extrabold font-mono text-ink tracking-tight">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        {/* Progress line */}
        <div className="w-full bg-paper-300 h-1.5 rounded-full overflow-hidden mt-2">
          <div
            className="bg-mango h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <button
          onClick={toggleRun}
          className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl border border-ink shadow-chunky-sm transition-transform active:translate-y-0.5 ${
            isRunning
              ? 'bg-paper-200 text-ink hover:bg-paper-300'
              : 'bg-mango text-ink hover:bg-mango-hover'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>I-pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-ink" />
              <span>Simulan</span>
            </>
          )}
        </button>

        <button
          onClick={resetTimer}
          className="p-2 bg-paper-200 hover:bg-paper-300 text-ink rounded-xl border border-ink shadow-chunky-sm"
          title="I-reset ang timer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => {
            onSessionComplete(25);
            confetti({ particleCount: 40, spread: 60 });
          }}
          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-2 bg-sage-light hover:bg-sage text-sage hover:text-white rounded-xl border border-sage transition-colors"
          title="I-log agad ang 25 minuto kung natapos na"
        >
          <Check className="w-3.5 h-3.5" />
          <span>+25m Log</span>
        </button>
      </div>
    </div>
  );
};
