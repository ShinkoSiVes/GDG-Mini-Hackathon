import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  AlertTriangle,
  Flame,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { DayState, FixedBlock, Habit, PlannedBlock, QuizAnswers } from '../shared/types.js';
import { loadSavedState, saveState, clearSavedState } from './utils/storage.js';
import { getSampleDayState } from './utils/sampleData.js';
import { Header } from './components/Header.js';
import { Timeline } from './components/Timeline.js';
import { ScheduleInputModal } from './components/ScheduleInputModal.js';
import { QuizModal } from './components/QuizModal.js';
import { SomethingCameUpModal } from './components/SomethingCameUpModal.js';
import { CalendarExportBar } from './components/CalendarExportBar.js';
import { Footer } from './components/Footer.js';

export const App: React.FC = () => {
  const [dayState, setDayState] = useState<DayState | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [showQuizModal, setShowQuizModal] = useState<boolean>(false);
  const [showSomethingCameUp, setShowSomethingCameUp] = useState<boolean>(false);
  const [stagingFixedBlocks, setStagingFixedBlocks] = useState<FixedBlock[]>([]);
  const [isReshuffling, setIsReshuffling] = useState<boolean>(false);

  // Load from localStorage or start fresh
  useEffect(() => {
    const saved = loadSavedState();
    if (saved) {
      setDayState(saved);
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (dayState) {
      saveState(dayState);
    }
  }, [dayState]);

  const handleLoadSample = () => {
    const sample = getSampleDayState();
    setDayState(sample);
  };

  const handleReset = () => {
    if (window.confirm('Gusto mo bang i-reset ang araw at simulan muli?')) {
      clearSavedState();
      setDayState(null);
    }
  };

  const handleOpenSetup = () => {
    setStagingFixedBlocks(dayState?.fixedBlocks || []);
    setShowScheduleModal(true);
  };

  const handleScheduleContinued = (blocks: FixedBlock[]) => {
    setStagingFixedBlocks(blocks);
    setShowScheduleModal(false);
    setShowQuizModal(true);
  };

  const handlePlanComplete = (data: any, quiz: QuizAnswers) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const plannedBlocks: PlannedBlock[] = (data.blocks || []).map((b: any) => {
      const habit = quiz.habits.find((h) => h.id === b.habitId);
      return {
        habitId: b.habitId,
        title: habit?.title || 'Habit',
        type: habit?.type || 'check',
        start: b.start,
        end: b.end,
        reason: b.reason || 'Squeezed into free slot',
        target: habit?.target || 1,
        unit: habit?.unit,
        progress: 0,
        completed: false,
      };
    });

    const newState: DayState = {
      date: dateStr,
      fixedBlocks: stagingFixedBlocks,
      habits: quiz.habits,
      plan: plannedBlocks,
      wakeTime: quiz.wakeTime,
      sleepTime: quiz.sleepTime,
      energyPeak: quiz.energyPeak,
      commitmentLevel: quiz.commitmentLevel,
      plannedBy: data.plannedBy || 'gemini',
      overallStreak: (dayState?.overallStreak || 0) + 1,
    };

    setDayState(newState);
    setShowQuizModal(false);
  };

  const handleUpdateProgress = (habitId: string, delta: number) => {
    if (!dayState) return;

    let targetMet = false;
    const nextPlan = dayState.plan.map((p) => {
      if (p.habitId === habitId) {
        const nextProgress = p.progress + delta;
        const complete = nextProgress >= p.target;
        if (complete && !p.completed) targetMet = true;
        return {
          ...p,
          progress: nextProgress,
          completed: complete,
        };
      }
      return p;
    });

    const nextHabits = dayState.habits.map((h) => {
      if (h.id === habitId) {
        const nextProgress = h.progress + delta;
        const complete = nextProgress >= h.target;
        return {
          ...h,
          progress: nextProgress,
          completed: complete,
          streak: targetMet ? h.streak + 1 : h.streak,
        };
      }
      return h;
    });

    setDayState({
      ...dayState,
      plan: nextPlan,
      habits: nextHabits,
    });
  };

  const handleToggleComplete = (habitId: string) => {
    if (!dayState) return;

    let targetMet = false;
    const nextPlan = dayState.plan.map((p) => {
      if (p.habitId === habitId) {
        const nextVal = !p.completed;
        if (nextVal) targetMet = true;
        return {
          ...p,
          completed: nextVal,
          progress: nextVal ? p.target : 0,
        };
      }
      return p;
    });

    const nextHabits = dayState.habits.map((h) => {
      if (h.id === habitId) {
        const nextVal = !h.completed;
        return {
          ...h,
          completed: nextVal,
          progress: nextVal ? h.target : 0,
          streak: targetMet ? h.streak + 1 : Math.max(0, h.streak - 1),
        };
      }
      return h;
    });

    setDayState({
      ...dayState,
      plan: nextPlan,
      habits: nextHabits,
    });
  };

  const handleApplyReplan = (
    newBlocks: PlannedBlock[],
    newEvent: FixedBlock,
    summary: string
  ) => {
    if (!dayState) return;

    setIsReshuffling(true);
    setDayState({
      ...dayState,
      fixedBlocks: [...dayState.fixedBlocks, newEvent],
      plan: newBlocks,
    });

    setTimeout(() => {
      setIsReshuffling(false);
    }, 600);
  };

  // Replan starts from real current time in Asia/Manila, unless using the sample day demo (which uses 14:00)
  const isSampleDay = dayState?.plannedBy === 'sample' || !!dayState?.isSampleData;
  const getRealCurrentTime = () => {
    try {
      const now = new Date();
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(now);
    } catch {
      const d = new Date();
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  };
  const currentTime = isSampleDay ? '14:00' : getRealCurrentTime();

  return (
    <div className="min-h-screen bg-paper-100 flex flex-col font-sans selection:bg-mango selection:text-ink">
      {/* Header */}
      <Header
        overallStreak={dayState?.overallStreak || 0}
        plannedBy={dayState?.plannedBy}
        isSampleData={isSampleDay}
        onLoadSample={handleLoadSample}
        onOpenSetup={handleOpenSetup}
        onReset={handleReset}
        hasPlan={!!dayState && dayState.plan.length > 0}
      />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-4">
        {dayState && dayState.plan.length > 0 ? (
          <div>
            {/* Quick action bar: "May Biglang Lakad?" + "Send to Calendar" */}
            <CalendarExportBar
              plan={dayState.plan}
              onOpenSomethingCameUp={() => setShowSomethingCameUp(true)}
            />

            {/* Vertical Timeline */}
            <Timeline
              wakeTime={dayState.wakeTime}
              sleepTime={dayState.sleepTime}
              fixedBlocks={dayState.fixedBlocks}
              habits={dayState.habits}
              plan={dayState.plan}
              isReshuffling={isReshuffling}
              isSampleData={isSampleDay}
              onUpdateProgress={handleUpdateProgress}
              onToggleComplete={handleToggleComplete}
            />
          </div>
        ) : (
          /* Empty / Welcome State (Under 10-Second Wow Moment) */
          <div className="flex flex-col items-center justify-center text-center py-12 px-4 gap-6">
            <div className="w-20 h-20 rounded-3xl bg-mango flex items-center justify-center text-4xl shadow-chunky border-2 border-ink animate-bounce">
              🥭
            </div>

            <div className="max-w-md">
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-mango-light border border-mango text-ink uppercase tracking-wider">
                DevFest Manila 2026
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-3">
                Kaya pang isingit ang habits mo ngayon.
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted mt-2 leading-relaxed">
                Hindi mo kailangan ng personal assistant para mag-chess, mag-code, o mag-Duolingo.
                I-upload lang ang schedule mo, at hahanapan ito ng puwang ng Gemini.
              </p>
            </div>

            {/* Two Action Paths */}
            <div className="w-full max-w-sm flex flex-col gap-3">
              {/* 1-Tap Wow Demo: Load Sample Day */}
              <button
                onClick={handleLoadSample}
                className="w-full py-3.5 px-4 rounded-2xl bg-mango hover:bg-mango-hover active:translate-y-0.5 text-ink font-extrabold text-sm border-2 border-ink shadow-chunky flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4 fill-ink" />
                <span>Subukan Agad: Load Sample Day</span>
              </button>

              {/* Real Flow: Set up custom day */}
              <button
                onClick={handleOpenSetup}
                className="w-full py-3 px-4 rounded-2xl bg-paper-50 hover:bg-white active:translate-y-0.5 text-ink font-bold text-xs border-2 border-ink shadow-chunky-sm flex items-center justify-center gap-2 transition-all"
              >
                <span>I-upload ang sariling klase (Flow A)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-md mt-4 text-left">
              <div className="p-3 bg-paper-50 rounded-2xl border border-paper-300">
                <div className="text-base mb-1">📸</div>
                <div className="font-bold text-xs text-ink">Photo Schedule</div>
                <div className="text-[10px] text-ink-muted">Gemini extracts class blocks</div>
              </div>
              <div className="p-3 bg-paper-50 rounded-2xl border border-paper-300">
                <div className="text-base mb-1">⚡</div>
                <div className="font-bold text-xs text-ink">Biglang Lakad</div>
                <div className="text-[10px] text-ink-muted">Replans rest of today</div>
              </div>
              <div className="p-3 bg-paper-50 rounded-2xl border border-paper-300">
                <div className="text-base mb-1">📅</div>
                <div className="font-bold text-xs text-ink">One-tap .ICS</div>
                <div className="text-[10px] text-ink-muted">10-min alarms sa Google Cal</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals */}
      {showScheduleModal && (
        <ScheduleInputModal
          initialBlocks={stagingFixedBlocks}
          onContinue={handleScheduleContinued}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {showQuizModal && (
        <QuizModal
          fixedBlocks={stagingFixedBlocks}
          onBack={() => {
            setShowQuizModal(false);
            setShowScheduleModal(true);
          }}
          onPlanComplete={handlePlanComplete}
          onClose={() => setShowQuizModal(false)}
        />
      )}

      {showSomethingCameUp && dayState && (
        <SomethingCameUpModal
          currentTime={currentTime}
          isSampleTime={isSampleDay}
          wakeTime={dayState.wakeTime}
          sleepTime={dayState.sleepTime}
          fixedBlocks={dayState.fixedBlocks}
          habits={dayState.habits}
          currentPlan={dayState.plan}
          onApplyReplan={handleApplyReplan}
          onClose={() => setShowSomethingCameUp(false)}
        />
      )}
    </div>
  );
};
