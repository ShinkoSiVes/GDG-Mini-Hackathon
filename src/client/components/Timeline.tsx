import React from 'react';
import { Sun, Moon, BookOpen, AlertCircle, Sparkles } from 'lucide-react';
import { FixedBlock, Habit, PlannedBlock } from '../../shared/types.js';
import { HabitCard } from './HabitCard.js';

interface TimelineProps {
  wakeTime: string;
  sleepTime: string;
  fixedBlocks: FixedBlock[];
  habits: Habit[];
  plan: PlannedBlock[];
  isReshuffling: boolean;
  onUpdateProgress: (habitId: string, delta: number) => void;
  onToggleComplete: (habitId: string) => void;
}

type TimelineItem =
  | { type: 'wake'; time: string }
  | { type: 'sleep'; time: string }
  | { type: 'fixed'; block: FixedBlock; time: string }
  | { type: 'habit'; block: PlannedBlock; habit: Habit | undefined; time: string };

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export const Timeline: React.FC<TimelineProps> = ({
  wakeTime,
  sleepTime,
  fixedBlocks,
  habits,
  plan,
  isReshuffling,
  onUpdateProgress,
  onToggleComplete,
}) => {
  // Merge all events into chronological sequence
  const items: TimelineItem[] = [
    { type: 'wake', time: wakeTime },
    ...fixedBlocks.map((fb) => ({ type: 'fixed' as const, block: fb, time: fb.start })),
    ...plan.map((pb) => ({
      type: 'habit' as const,
      block: pb,
      habit: habits.find((h) => h.id === pb.habitId),
      time: pb.start,
    })),
    { type: 'sleep', time: sleepTime },
  ].sort((a, b) => timeToMins(a.time) - timeToMins(b.time));

  return (
    <div
      className={`relative max-w-xl mx-auto px-4 py-6 transition-all duration-500 ${
        isReshuffling ? 'animate-reshuffle' : ''
      }`}
    >
      {/* Central dashed line for timeline */}
      <div className="absolute left-8 top-10 bottom-10 w-0.5 border-l-2 border-dashed border-paper-400 pointer-events-none" />

      <div className="flex flex-col gap-5">
        {items.map((item, idx) => {
          if (item.type === 'wake') {
            return (
              <div key="wake-item" className="flex items-center gap-4 z-10">
                <div className="w-8 h-8 rounded-full bg-mango flex items-center justify-center border-2 border-ink shadow-sm text-ink font-bold text-xs">
                  <Sun className="w-4 h-4 fill-ink" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-paper-200 border border-paper-300 rounded-xl text-xs font-bold text-ink">
                  <span className="font-mono">{item.time}</span>
                  <span className="text-ink-muted font-normal">• Gising na! Simulan ang araw</span>
                </div>
              </div>
            );
          }

          if (item.type === 'sleep') {
            return (
              <div key="sleep-item" className="flex items-center gap-4 z-10">
                <div className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center border-2 border-ink shadow-sm text-xs">
                  <Moon className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-paper-200 border border-paper-300 rounded-xl text-xs font-bold text-ink">
                  <span className="font-mono">{item.time}</span>
                  <span className="text-ink-muted font-normal">• Tulog time na (Pahinga para bukas)</span>
                </div>
              </div>
            );
          }

          if (item.type === 'fixed') {
            const isSurprise = item.block.id.startsWith('surprise');
            return (
              <div key={item.block.id} className="flex items-start gap-4 z-10 ml-1">
                {/* Timeline node */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 border-ink shadow-sm mt-2 shrink-0 ${
                    isSurprise ? 'bg-terracotta text-white' : 'bg-paper-300 text-ink'
                  }`}
                >
                  {isSurprise ? (
                    <AlertCircle className="w-3.5 h-3.5" />
                  ) : (
                    <BookOpen className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Card */}
                <div
                  className={`flex-1 rounded-2xl p-3.5 border-2 border-ink ${
                    isSurprise
                      ? 'bg-terracotta-light/50 border-terracotta shadow-chunky-sm'
                      : 'bg-paper-200/90 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-paper-300/80 text-ink">
                      {item.block.start} – {item.block.end}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isSurprise
                          ? 'bg-terracotta text-white'
                          : 'bg-paper-300 text-ink-muted'
                      }`}
                    >
                      {isSurprise ? '⚡ Biglang Lakad' : 'Fixed Block / Klase'}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-ink">{item.block.title}</h4>
                </div>
              </div>
            );
          }

          if (item.type === 'habit') {
            return (
              <div key={item.block.habitId} className="flex items-start gap-4 z-10 ml-1">
                {/* Timeline node */}
                <div className="w-6 h-6 rounded-full bg-mango flex items-center justify-center border-2 border-ink shadow-sm mt-3 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 fill-ink text-ink" />
                </div>

                {/* Habit Card */}
                <div className="flex-1">
                  <HabitCard
                    block={item.block}
                    streak={item.habit?.streak || 1}
                    onUpdateProgress={onUpdateProgress}
                    onToggleComplete={onToggleComplete}
                  />
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};
