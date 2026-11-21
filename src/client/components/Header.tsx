import React from 'react';
import { Flame, Sparkles, PlusCircle, RefreshCw, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  overallStreak: number;
  plannedBy?: 'gemini' | 'fallback' | 'sample';
  isSampleData?: boolean;
  onLoadSample: () => void;
  onOpenSetup: () => void;
  onReset: () => void;
  hasPlan: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  overallStreak,
  plannedBy,
  isSampleData,
  onLoadSample,
  onOpenSetup,
  onReset,
  hasPlan,
}) => {
  const isSample = isSampleData || plannedBy === 'sample';

  return (
    <header className="border-b border-paper-300 bg-paper-50 sticky top-0 z-30 shadow-sm">
      <div className="max-w-xl mx-auto px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-mango flex items-center justify-center text-xl shadow-chunky-sm border-2 border-ink select-none shrink-0">
              🥭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-extrabold text-xl tracking-tight text-ink">
                  Singit
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-mango-light text-ink border border-mango uppercase tracking-wider">
                  DevFest Manila
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Isingit ang daily habits sa siksik mong araw
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Overall Streak */}
            <div
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-paper-200 border border-paper-300 shadow-sm whitespace-nowrap"
              title={isSample ? 'Sample streak data for demo' : 'Araw-araw na streak mo'}
            >
              <Flame className="w-4 h-4 text-coral fill-coral animate-pulse shrink-0" />
              <div className="text-xs font-bold text-ink">
                <span className="tabular-nums">{overallStreak}d</span>
                {isSample ? (
                  <span className="text-[10px] font-bold text-coral ml-1">(Sample)</span>
                ) : (
                  <span className="text-ink-muted font-normal ml-0.5">streak</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action bar & Privacy banner */}
        <div className="flex items-center justify-between gap-1 sm:gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-ink-muted truncate min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 text-sage shrink-0" />
            <span className="truncate">Nasa device mo lang (localStorage)</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!hasPlan ? (
              <button
                onClick={onLoadSample}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-1.5 bg-mango hover:bg-mango-hover active:translate-y-0.5 text-ink rounded-xl border border-ink shadow-chunky-sm transition-all whitespace-nowrap"
                title="Subukan agad gamit ang sample UP/DLSU student schedule"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Load Sample Day</span>
                <span className="sm:hidden">Sample Day</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                {plannedBy && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${
                      plannedBy === 'sample'
                        ? 'bg-slate text-white border-slate font-bold'
                        : plannedBy === 'gemini'
                        ? 'bg-mango-light border-mango text-ink'
                        : 'bg-paper-200 border-paper-400 text-ink-muted'
                    }`}
                  >
                    {plannedBy === 'sample'
                      ? '📋 Sample Day'
                      : plannedBy === 'gemini'
                      ? '✨ Planned by Gemini'
                      : '⚙️ Fallback planner'}
                  </span>
                )}
                <button
                  onClick={onOpenSetup}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-paper-200 hover:bg-paper-300 text-ink rounded-lg border border-paper-300 transition-all"
                  title="Mag-plano ng bagong araw"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Bago</span>
                </button>
                <button
                  onClick={onReset}
                  className="p-1 text-ink-muted hover:text-ink hover:bg-paper-200 rounded-lg transition-colors"
                  title="I-reset ang araw"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
