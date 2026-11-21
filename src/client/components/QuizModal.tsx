import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  X,
  Plus,
  Trash2,
  Clock,
  Zap,
  Shield,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';
import { Habit, TimeOfDay, QuizAnswers, FixedBlock, HabitType } from '../../shared/types.js';

interface QuizModalProps {
  fixedBlocks: FixedBlock[];
  onBack: () => void;
  onPlanComplete: (data: any, quiz: QuizAnswers) => void;
  onClose: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  fixedBlocks,
  onBack,
  onPlanComplete,
  onClose,
}) => {
  const [wakeTime, setWakeTime] = useState<string>('07:00');
  const [sleepTime, setSleepTime] = useState<string>('23:00');
  const [energyPeak, setEnergyPeak] = useState<TimeOfDay>('morning');
  const [commitmentLevel, setCommitmentLevel] = useState<number>(4);
  const [isPlanning, setIsPlanning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [habits, setHabits] = useState<Habit[]>([
    {
      id: 'h-1',
      title: '3 Chess puzzles',
      type: 'count',
      target: 3,
      unit: 'puzzles',
      preferredTime: 'morning',
      estimatedMinutes: 15,
      progress: 0,
      completed: false,
      streak: 3,
    },
    {
      id: 'h-2',
      title: 'Coding practice',
      type: 'timer',
      target: 50,
      unit: 'mins',
      preferredTime: 'afternoon',
      estimatedMinutes: 50,
      progress: 0,
      completed: false,
      streak: 5,
    },
    {
      id: 'h-3',
      title: 'Duolingo lesson',
      type: 'check',
      target: 1,
      unit: 'lesson',
      preferredTime: 'evening',
      estimatedMinutes: 15,
      progress: 0,
      completed: false,
      streak: 12,
    },
  ]);

  const addHabit = () => {
    setHabits([
      ...habits,
      {
        id: `h-${Date.now()}`,
        title: 'Bagong Habit',
        type: 'check',
        target: 1,
        unit: 'session',
        preferredTime: 'afternoon',
        estimatedMinutes: 20,
        progress: 0,
        completed: false,
        streak: 1,
      },
    ]);
  };

  const updateHabit = (index: number, patch: Partial<Habit>) => {
    const updated = [...habits];
    updated[index] = { ...updated[index], ...patch };
    setHabits(updated);
  };

  const removeHabit = (index: number) => {
    setHabits(habits.filter((_, i) => i !== index));
  };

  const handlePlan = async () => {
    if (habits.length === 0) {
      setErrorMsg('Maglagay ng kahit isang habit.');
      return;
    }

    setIsPlanning(true);
    setErrorMsg(null);

    const quiz: QuizAnswers = {
      wakeTime,
      sleepTime,
      energyPeak,
      commitmentLevel,
      habits,
    };

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...quiz,
          fixedBlocks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Nabigo sa pag-plano.');
      }

      onPlanComplete(data, quiz);
    } catch (err: any) {
      console.error('Plan error:', err);
      setErrorMsg(err.message || 'May problema sa koneksyon. Subukang muli.');
    } finally {
      setIsPlanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-paper-50 rounded-3xl border-2 border-ink shadow-chunky p-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-paper-300">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1 rounded-lg hover:bg-paper-200 text-ink-muted hover:text-ink"
              title="Bumalik sa Schedule"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="text-[11px] font-bold text-mango-dark uppercase tracking-wider">
                Step 2 of 2: Quick Quiz
              </div>
              <h2 className="text-lg font-extrabold text-ink">I-customize ang Singit Plan</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl hover:bg-paper-200 text-ink-muted hover:text-ink"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5 my-4">
          {/* Q1: Wake & Sleep */}
          <div className="p-3.5 bg-paper-100 rounded-2xl border border-paper-300">
            <label className="text-xs font-bold text-ink flex items-center gap-1.5 mb-2">
              <Clock className="w-4 h-4 text-mango-dark" />
              <span>1. Oras ng Gising at Tulog</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-ink-muted block mb-1">Gising:</span>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full text-xs font-mono font-bold bg-white p-2 rounded-xl border border-paper-300 focus:border-ink"
                />
              </div>
              <div>
                <span className="text-[11px] text-ink-muted block mb-1">Tulog:</span>
                <input
                  type="time"
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                  className="w-full text-xs font-mono font-bold bg-white p-2 rounded-xl border border-paper-300 focus:border-ink"
                />
              </div>
            </div>
          </div>

          {/* Q2 & Q3: Habits with Target Types & Preferred Times */}
          <div className="p-3.5 bg-paper-100 rounded-2xl border border-paper-300">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-sage" />
                <span>2 & 3. Mga Habits, Target Type, at Preferred Time</span>
              </label>
              <button
                onClick={addHabit}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-ink hover:text-mango-dark"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Magdagdag</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {habits.map((h, i) => (
                <div
                  key={h.id || i}
                  className="p-3 bg-white rounded-xl border border-paper-300 shadow-sm flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={h.title}
                      onChange={(e) => updateHabit(i, { title: e.target.value })}
                      placeholder="Pangalan ng habit"
                      className="flex-1 text-xs font-bold bg-transparent border-b border-paper-200 focus:border-ink focus:outline-none"
                    />
                    <button
                      onClick={() => removeHabit(i)}
                      className="p-1 text-ink-muted hover:text-terracotta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Target Type */}
                    <div>
                      <span className="text-[10px] text-ink-muted block">Type:</span>
                      <select
                        value={h.type}
                        onChange={(e) => {
                          const t = e.target.value as HabitType;
                          updateHabit(i, {
                            type: t,
                            target: t === 'timer' ? 25 : t === 'count' ? 3 : 1,
                            unit: t === 'timer' ? 'mins' : t === 'count' ? 'puzzles' : 'lesson',
                          });
                        }}
                        className="w-full text-[11px] bg-paper-100 p-1.5 rounded-lg border border-paper-300 font-semibold"
                      >
                        <option value="count">Count (e.g. 3)</option>
                        <option value="timer">Timer (Pomodoro)</option>
                        <option value="check">Check (1 tap)</option>
                      </select>
                    </div>

                    {/* Target Value */}
                    <div>
                      <span className="text-[10px] text-ink-muted block">Target:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          value={h.target}
                          onChange={(e) => updateHabit(i, { target: parseInt(e.target.value) || 1 })}
                          className="w-12 text-[11px] font-mono bg-paper-100 p-1.5 rounded-lg border border-paper-300 font-bold"
                        />
                        <span className="text-[10px] text-ink-muted truncate">{h.unit}</span>
                      </div>
                    </div>

                    {/* Preferred Time */}
                    <div>
                      <span className="text-[10px] text-ink-muted block">Preferred:</span>
                      <select
                        value={h.preferredTime}
                        onChange={(e) =>
                          updateHabit(i, { preferredTime: e.target.value as TimeOfDay })
                        }
                        className="w-full text-[11px] bg-paper-100 p-1.5 rounded-lg border border-paper-300 font-semibold capitalize"
                      >
                        <option value="morning">Morning</option>
                        <option value="afternoon">Afternoon</option>
                        <option value="evening">Evening</option>
                        <option value="night">Night</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Q4: Energy Peak */}
          <div className="p-3.5 bg-paper-100 rounded-2xl border border-paper-300">
            <label className="text-xs font-bold text-ink flex items-center gap-1.5 mb-2">
              <Zap className="w-4 h-4 text-mango" />
              <span>4. Kailan pinakamataas ang energy mo?</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: 'morning', label: 'Umaga', icon: '🌅' },
                  { id: 'afternoon', label: 'Hapon', icon: '☀️' },
                  { id: 'evening', label: 'Gabi', icon: '🌆' },
                  { id: 'night', label: 'Hatinggabi', icon: '🌙' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setEnergyPeak(p.id)}
                  className={`p-2 rounded-xl text-center border transition-all ${
                    energyPeak === p.id
                      ? 'bg-mango text-ink border-ink font-bold shadow-chunky-sm'
                      : 'bg-white text-ink-muted border-paper-300 hover:bg-paper-200'
                  }`}
                >
                  <div className="text-base select-none">{p.icon}</div>
                  <div className="text-[11px]">{p.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Q5: Commitment Level (1-5) */}
          <div className="p-3.5 bg-paper-100 rounded-2xl border border-paper-300">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-terracotta" />
                <span>5. Commitment Level (1–5)</span>
              </label>
              <span className="text-xs font-bold text-ink font-mono">{commitmentLevel} / 5</span>
            </div>
            <p className="text-[11px] text-ink-muted mb-2">
              Gaano kahirap ipaglaban ang habit kapag sumisikip ang araw?
            </p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setCommitmentLevel(lvl)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                    commitmentLevel === lvl
                      ? 'bg-ink text-white border-ink shadow-sm'
                      : 'bg-white text-ink-muted border-paper-300 hover:bg-paper-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-ink-muted mt-1 px-1">
              <span>Chill lang (Move/Drop)</span>
              <span>Balanse</span>
              <span>Protektahan todo</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="my-2 text-xs text-terracotta bg-terracotta-light p-2 rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 pt-3 border-t border-paper-300 flex justify-end">
          <button
            onClick={handlePlan}
            disabled={isPlanning}
            className="w-full py-3 rounded-2xl bg-mango hover:bg-mango-hover disabled:opacity-50 text-ink font-extrabold text-sm border-2 border-ink shadow-chunky flex items-center justify-center gap-2 transition-all active:translate-y-0.5"
          >
            {isPlanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Isinisingit ng Gemini sa free slots mo...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>✨ Isingit na ang Habits Gamit ang Gemini!</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
