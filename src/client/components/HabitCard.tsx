import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  Timer as TimerIcon,
  Flame,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PlannedBlock } from '../../shared/types.js';
import { getGoogleCalendarUrl } from '../utils/calendar.js';
import { PomodoroTimer } from './PomodoroTimer.js';

interface HabitCardProps {
  block: PlannedBlock;
  streak: number;
  isSampleData?: boolean;
  onUpdateProgress: (habitId: string, delta: number) => void;
  onToggleComplete: (habitId: string) => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  block,
  streak,
  isSampleData,
  onUpdateProgress,
  onToggleComplete,
}) => {
  const [showPomodoro, setShowPomodoro] = useState<boolean>(false);
  const isComplete = block.completed || block.progress >= block.target;
  const gcalUrl = getGoogleCalendarUrl(block);

  const handleCheck = () => {
    if (!isComplete) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
    onToggleComplete(block.habitId);
  };

  const handlePlusOne = () => {
    const nextVal = block.progress + 1;
    if (nextVal >= block.target && !isComplete) {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    }
    onUpdateProgress(block.habitId, 1);
  };

  const handlePomodoroSession = (minutes: number) => {
    const nextVal = block.progress + minutes;
    if (nextVal >= block.target && !isComplete) {
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
    }
    onUpdateProgress(block.habitId, minutes);
  };

  return (
    <div
      className={`relative rounded-3xl p-4 transition-all duration-300 border-2 border-ink ${
        isComplete
          ? 'bg-sage-light/40 shadow-chunky-sm'
          : 'bg-paper-50 hover:bg-white shadow-chunky'
      }`}
    >
      {/* Top Header: Time slot + Streaks & Badges */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-mango-light text-ink border border-mango tabular-nums">
            {block.start} – {block.end}
          </span>
          {block.isSqueezed && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-terracotta-light text-terracotta border border-terracotta">
              Na-squeeze ({block.target} {block.unit || 'm'})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <div
            className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-paper-200 border border-paper-300 text-ink"
            title={isSampleData ? "Sample habit streak" : "Habit streak"}
          >
            <Flame className="w-3.5 h-3.5 text-coral fill-coral" />
            <span className="tabular-nums">{streak}d</span>
            {isSampleData && <span className="text-[9px] text-coral font-bold ml-0.5">(sample)</span>}
          </div>

          <a
            href={gcalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-paper-100 hover:bg-paper-200 text-ink-muted hover:text-ink border border-paper-300 transition-colors"
            title="I-add sa Google Calendar"
          >
            <Calendar className="w-3 h-3 text-ink-muted" />
            <span className="hidden sm:inline">GCal</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Main Title & Gemini Reason */}
      <div className="flex items-start justify-between gap-3 my-1">
        <div>
          <h3
            className={`font-display font-bold text-base tracking-tight ${
              isComplete ? 'line-through text-ink-muted' : 'text-ink'
            }`}
          >
            {block.title}
          </h3>
          <p className="text-xs text-ink-muted mt-0.5 flex items-start gap-1">
            <span className="text-mango select-none">💡</span>
            <span>{block.reason}</span>
          </p>
        </div>
      </div>

      {/* Progress & Type Controls */}
      <div className="mt-3 pt-3 border-t border-paper-200 flex flex-col gap-2">
        {/* Type: CHECK */}
        {block.type === 'check' && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-muted">
              {isComplete ? '✨ Tapos na! Na-singit na.' : 'Tap kapag nagawa na:'}
            </span>
            <button
              onClick={handleCheck}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs border border-ink transition-all active:translate-y-0.5 shadow-chunky-sm ${
                isComplete
                  ? 'bg-sage text-white'
                  : 'bg-paper-100 hover:bg-mango text-ink'
              }`}
            >
              {isComplete ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Done</span>
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4 text-ink-muted" />
                  <span>Mark done</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Type: COUNT */}
        {block.type === 'count' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-ink tabular-nums">
                {block.progress} / {block.target}
              </span>
              <span className="text-xs text-ink-muted">
                {block.unit || 'puzzles'}
              </span>
              {isComplete && (
                <span className="text-[10px] font-bold text-sage bg-sage-light px-2 py-0.5 rounded-md">
                  Target reached! 🎉
                </span>
              )}
            </div>

            <button
              onClick={handlePlusOne}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-mango hover:bg-mango-hover text-ink rounded-xl border border-ink shadow-chunky-sm transition-transform active:translate-y-0.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+1 Tap</span>
            </button>
          </div>
        )}

        {/* Type: TIMER */}
        {block.type === 'timer' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink tabular-nums">
                  {block.progress} / {block.target}
                </span>
                <span className="text-xs text-ink-muted">
                  {block.unit || 'mins'}
                </span>
                {isComplete && (
                  <span className="text-[10px] font-bold text-sage bg-sage-light px-2 py-0.5 rounded-md">
                    Target hit! 🎉
                  </span>
                )}
              </div>

              <button
                onClick={() => setShowPomodoro(!showPomodoro)}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-paper-200 hover:bg-paper-300 text-ink rounded-xl border border-ink shadow-chunky-sm transition-transform active:translate-y-0.5"
              >
                <TimerIcon className="w-3.5 h-3.5 text-terracotta" />
                <span>{showPomodoro ? 'Itago ang Timer' : 'Pomodoro (25/5)'}</span>
                {showPomodoro ? (
                  <ChevronUp className="w-3 h-3 ml-0.5" />
                ) : (
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                )}
              </button>
            </div>

            {/* Built-in Pomodoro dropdown */}
            {showPomodoro && (
              <PomodoroTimer
                habitTitle={block.title}
                onSessionComplete={handlePomodoroSession}
                onClose={() => setShowPomodoro(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
