import React, { useState } from 'react';
import {
  AlertTriangle,
  Sparkles,
  Loader2,
  X,
  ArrowRight,
  Minimize2,
  SkipForward,
  Trash2,
  Check,
} from 'lucide-react';
import { FixedBlock, Habit, PlannedBlock, ReplanConflict, DetectedEvent } from '../../shared/types.js';

interface SomethingCameUpModalProps {
  currentTime: string;
  isSampleTime?: boolean;
  wakeTime: string;
  sleepTime: string;
  fixedBlocks: FixedBlock[];
  habits: Habit[];
  currentPlan: PlannedBlock[];
  onApplyReplan: (
    newBlocks: PlannedBlock[],
    newEvent: FixedBlock,
    summary: string
  ) => void;
  onClose: () => void;
}

// A proposed block counts as moved only if its time differs from the current plan
const isMoved = (plan: { habitId: string; start: string; end: string }[], b: { habitId: string; start: string; end: string }) => {
  const orig = plan.find((p) => p.habitId === b.habitId);
  return !orig || orig.start !== b.start || orig.end !== b.end;
};

export const SomethingCameUpModal: React.FC<SomethingCameUpModalProps> = ({
  currentTime,
  isSampleTime,
  wakeTime,
  sleepTime,
  fixedBlocks,
  habits,
  currentPlan,
  onApplyReplan,
  onClose,
}) => {
  const [eventText, setEventText] = useState<string>('');
  const [isReplanning, setIsReplanning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Result state
  const [stage, setStage] = useState<'input' | 'preview'>('input');
  const [detectedEvent, setDetectedEvent] = useState<DetectedEvent | null>(null);
  const [proposedBlocks, setProposedBlocks] = useState<
    Array<{ habitId: string; start: string; end: string; reason: string }>
  >([]);
  const [conflicts, setConflicts] = useState<ReplanConflict[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [conflictDecisions, setConflictDecisions] = useState<
    Record<string, 'squeeze' | 'skip' | 'remove'>
  >({});

  const samplePrompts = [
    '🍻 Friends hangout 7–10pm, drinks',
    '📝 Surprise quiz tomorrow, review 6–9pm',
    '🚗 Heavy traffic, delayed 1 hour (4–5pm)',
  ];

  const handleReplan = async (promptToUse?: string) => {
    const text = promptToUse || eventText;
    if (!text.trim()) {
      setErrorMsg('Describe what came up.');
      return;
    }

    setIsReplanning(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/replan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventText: text,
          currentTime,
          wakeTime,
          sleepTime,
          fixedBlocks,
          habits,
          currentPlan,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Replan failed. Try again.');
      }

      setDetectedEvent(data.detectedEvent);
      setProposedBlocks(data.blocks || []);
      setConflicts(data.conflicts || []);
      setSummary(data.summary || 'Day replanned.');

      // Default conflict decisions to 'squeeze' if eligible, else 'skip'
      const initialDecisions: Record<string, 'squeeze' | 'skip' | 'remove'> = {};
      (data.conflicts || []).forEach((c: ReplanConflict) => {
        initialDecisions[c.habitId] = c.canSqueeze ? 'squeeze' : 'skip';
      });
      setConflictDecisions(initialDecisions);

      setStage('preview');
    } catch (err: any) {
      console.error('Replan error:', err);
      setErrorMsg(err.message || 'Connection problem.');
    } finally {
      setIsReplanning(false);
    }
  };

  const handleConfirmAndApply = () => {
    if (!detectedEvent) return;

    // Convert detected event into a FixedBlock
    const newFixedEvent: FixedBlock = {
      id: `surprise-${Date.now()}`,
      day: 'Today',
      start: detectedEvent.start,
      end: detectedEvent.end,
      title: detectedEvent.title,
    };

    // Build the final list of planned blocks
    const finalBlocks: PlannedBlock[] = [];

    // Keep existing habits that occurred before currentTime
    const [curH, curM] = currentTime.split(':').map(Number);
    const curTotal = curH * 60 + curM;

    for (const b of currentPlan) {
      const [bH, bM] = b.start.split(':').map(Number);
      if (bH * 60 + bM < curTotal) {
        finalBlocks.push(b);
      }
    }

    // Add proposed blocks that fit
    for (const pb of proposedBlocks) {
      const orig = currentPlan.find((p) => p.habitId === pb.habitId);
      const habitDef = habits.find((h) => h.id === pb.habitId);

      if (orig && habitDef) {
        finalBlocks.push({
          ...orig,
          start: pb.start,
          end: pb.end,
          reason: pb.reason,
        });
      }
    }

    // Apply conflict resolutions
    for (const c of conflicts) {
      const decision = conflictDecisions[c.habitId];
      const orig = currentPlan.find((p) => p.habitId === c.habitId);
      const habitDef = habits.find((h) => h.id === c.habitId);

      if (decision === 'squeeze' && orig && habitDef) {
        // Squeeze into shorter session
        const squeezedMinutes = c.minMinutes || 15;
        const [evEndH, evEndM] = detectedEvent.end.split(':').map(Number);
        const startMins = evEndH * 60 + evEndM + 10;
        const endMins = startMins + squeezedMinutes;

        const toHHMM = (m: number) => {
          const hh = Math.floor(m / 60);
          const mm = m % 60;
          return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
        };

        finalBlocks.push({
          ...orig,
          start: toHHMM(startMins),
          end: toHHMM(endMins),
          isSqueezed: true,
          target: habitDef.type === 'count' ? 1 : squeezedMinutes,
          unit: habitDef.unit,
          reason: `Squeezed to ${squeezedMinutes} min to fit tonight.`,
        });
      }
      // 'skip' or 'remove' means omitted from today's timeline
    }

    onApplyReplan(finalBlocks, newFixedEvent, summary);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-paper-50 rounded-3xl border-2 border-ink shadow-chunky p-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-paper-300">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-terracotta text-white flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-extrabold text-ink tracking-tight">Something came up?</h2>
              <p className="text-[11px] text-ink-muted">
                Replanning from{' '}
                <span className="font-mono font-bold text-ink">{currentTime}</span>{' '}
                {isSampleTime ? (
                  <span className="text-coral font-bold">(Sample Day 14:00 simulated)</span>
                ) : (
                  <span className="text-sage font-bold">(current time)</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl hover:bg-paper-200 text-ink-muted hover:text-ink"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {stage === 'input' ? (
          <div className="flex flex-col gap-4 my-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-ink">What happened?</label>
              <textarea
                rows={3}
                value={eventText}
                onChange={(e) => setEventText(e.target.value)}
                placeholder="e.g. friends hangout 7–10pm, or surprise quiz tomorrow"
                className="w-full p-3 text-xs bg-paper-100 rounded-xl border border-paper-400 focus:border-ink focus:outline-none"
              />
            </div>

            {/* Quick Prompts */}
            <div>
              <span className="text-[11px] font-bold text-ink-muted block mb-1.5">
                Quick examples:
              </span>
              <div className="flex flex-col gap-1.5">
                {samplePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setEventText(p);
                      handleReplan(p);
                    }}
                    className="text-left text-xs p-2.5 bg-paper-100 hover:bg-paper-200 text-ink rounded-xl border border-paper-300 transition-colors flex items-center justify-between"
                  >
                    <span>{p}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-ink-muted" />
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="text-xs text-terracotta bg-terracotta-light p-2 rounded-lg">
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <div className="mt-2 pt-3 border-t border-paper-300">
              <button
                onClick={() => handleReplan()}
                disabled={isReplanning || !eventText.trim()}
                className="w-full py-3 rounded-2xl bg-mango hover:bg-mango-hover disabled:opacity-50 text-ink font-bold text-xs border-2 border-ink shadow-chunky flex items-center justify-center gap-2"
              >
                {isReplanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Replanning...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Replan my day</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Preview Stage: Before/After Diff & Conflict Squeeze Options */
          <div className="flex flex-col gap-4 my-4">
            {/* Detected event badge */}
            {detectedEvent && (
              <div className="p-3 bg-terracotta-light/60 border border-terracotta rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta">
                    ⚡ Detected event:
                  </span>
                  <span className="font-mono text-xs font-bold text-ink">
                    {detectedEvent.start} – {detectedEvent.end}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-ink mt-0.5">{detectedEvent.title}</h4>
                {detectedEvent.notes && (
                  <p className="text-[11px] text-ink-muted mt-1">{detectedEvent.notes}</p>
                )}
              </div>
            )}

            {/* AI Summary note */}
            {summary && (conflicts.length > 0 || proposedBlocks.some((b) => isMoved(currentPlan, b))) && (
              <div className="p-3 bg-mango-light border border-mango rounded-2xl text-xs text-ink font-semibold">
                💡 {summary}
              </div>
            )}

            {detectedEvent && conflicts.length === 0 && !proposedBlocks.some((b) => isMoved(currentPlan, b)) && (
              <div className="p-3 bg-paper-100 border border-paper-300 rounded-2xl text-xs text-ink font-semibold">
                ✅ Your plan already works around this. Nothing needs to move.
              </div>
            )}

            {/* If habits shift cleanly */}
            {proposedBlocks.some((b) => isMoved(currentPlan, b)) && (
              <div>
                <span className="text-xs font-bold text-ink block mb-2">
                  Moved habits ({proposedBlocks.filter((b) => isMoved(currentPlan, b)).length}):
                </span>
                <div className="flex flex-col gap-2">
                  {proposedBlocks.filter((b) => isMoved(currentPlan, b)).map((b) => {
                    const habit = habits.find((h) => h.id === b.habitId);
                    const orig = currentPlan.find((p) => p.habitId === b.habitId);
                    return (
                      <div
                        key={b.habitId}
                        className="p-2.5 bg-paper-100 rounded-xl border border-paper-300 text-xs flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">{habit?.title || 'Habit'}</span>
                          <div className="flex items-center gap-1.5 font-mono tabular-nums text-[11px]">
                            {orig && (
                              <span className="text-ink-muted line-through">
                                {orig.start}–{orig.end}
                              </span>
                            )}
                            <span className="text-ink font-bold">
                              ➔ {b.start}–{b.end}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-ink-muted">{b.reason}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* If conflicts require squeeze/skip */}
            {conflicts.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-terracotta" />
                  <span className="text-xs font-bold text-ink">
                    No room for these:
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {conflicts.map((c) => (
                    <div
                      key={c.habitId}
                      className="p-3 bg-white rounded-xl border border-terracotta/50 shadow-sm flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-ink">{c.habitTitle}</span>
                        <span className="text-[10px] text-terracotta font-semibold">Conflict</span>
                      </div>
                      <p className="text-[11px] text-ink-muted">{c.reason}</p>

                      <div className="flex gap-1.5 mt-1">
                        {c.canSqueeze && (
                          <button
                            onClick={() =>
                              setConflictDecisions({ ...conflictDecisions, [c.habitId]: 'squeeze' })
                            }
                            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1 transition-all ${
                              conflictDecisions[c.habitId] === 'squeeze'
                                ? 'bg-mango text-ink border-ink shadow-sm'
                                : 'bg-paper-100 text-ink-muted border-paper-300 hover:bg-paper-200'
                            }`}
                          >
                            <Minimize2 className="w-3 h-3" />
                            <span>Squeeze ({c.minMinutes}m)</span>
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setConflictDecisions({ ...conflictDecisions, [c.habitId]: 'skip' })
                          }
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1 transition-all ${
                            conflictDecisions[c.habitId] === 'skip'
                              ? 'bg-paper-300 text-ink border-ink shadow-sm'
                              : 'bg-paper-100 text-ink-muted border-paper-300 hover:bg-paper-200'
                          }`}
                        >
                          <SkipForward className="w-3 h-3" />
                          <span>Skip Today</span>
                        </button>
                        <button
                          onClick={() =>
                            setConflictDecisions({ ...conflictDecisions, [c.habitId]: 'remove' })
                          }
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1 transition-all ${
                            conflictDecisions[c.habitId] === 'remove'
                              ? 'bg-terracotta-light text-terracotta border-terracotta shadow-sm'
                              : 'bg-paper-100 text-ink-muted border-paper-300 hover:bg-paper-200'
                          }`}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-2 pt-3 border-t border-paper-300 flex items-center gap-2">
              <button
                onClick={() => setStage('input')}
                className="py-2.5 px-4 rounded-xl bg-paper-200 hover:bg-paper-300 text-xs font-semibold text-ink"
              >
                Back
              </button>
              <button
                onClick={handleConfirmAndApply}
                className="flex-1 py-3 rounded-2xl bg-mango hover:bg-mango-hover text-ink font-extrabold text-xs border-2 border-ink shadow-chunky flex items-center justify-center gap-2 transition-transform active:translate-y-0.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirm replan</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
