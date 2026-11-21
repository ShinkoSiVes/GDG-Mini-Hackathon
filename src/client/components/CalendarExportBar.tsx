import React from 'react';
import { Calendar, Download, ShieldCheck, Zap } from 'lucide-react';
import { PlannedBlock } from '../../shared/types.js';
import { downloadICS } from '../utils/calendar.js';

interface CalendarExportBarProps {
  plan: PlannedBlock[];
  onOpenSomethingCameUp: () => void;
}

export const CalendarExportBar: React.FC<CalendarExportBarProps> = ({
  plan,
  onOpenSomethingCameUp,
}) => {
  return (
    <div className="max-w-xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
      {/* Something came up button */}
      <button
        onClick={onOpenSomethingCameUp}
        className="flex-1 py-3 px-4 bg-coral hover:bg-coral-hover text-white font-extrabold text-xs rounded-2xl border-2 border-ink shadow-chunky flex items-center justify-center gap-2 transition-transform active:translate-y-0.5"
      >
        <Zap className="w-4 h-4 fill-white" />
        <span>⚡ Something came up?</span>
      </button>

      {/* Send to calendar */}
      <button
        onClick={() => downloadICS(plan)}
        disabled={plan.length === 0}
        className="py-3 px-4 bg-paper-50 hover:bg-white text-ink font-bold text-xs rounded-2xl border-2 border-ink shadow-chunky flex items-center justify-center gap-2 transition-transform active:translate-y-0.5"
        title="Export .ics with 10-minute alarms"
      >
        <Calendar className="w-4 h-4 text-mango-dark" />
        <span>Send to Calendar (.ics)</span>
        <Download className="w-3.5 h-3.5 text-ink-muted" />
      </button>
    </div>
  );
};
