import React, { useState, useRef } from 'react';
import { Upload, FileText, Plus, Trash2, ArrowRight, Loader2, Sparkles, X } from 'lucide-react';
import { FixedBlock } from '../../shared/types.js';

interface ScheduleInputModalProps {
  initialBlocks: FixedBlock[];
  onContinue: (blocks: FixedBlock[]) => void;
  onClose: () => void;
}

export const ScheduleInputModal: React.FC<ScheduleInputModalProps> = ({
  initialBlocks,
  onContinue,
  onClose,
}) => {
  const [mode, setMode] = useState<'upload' | 'text'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [textSchedule, setTextSchedule] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<FixedBlock[]>(
    initialBlocks.length > 0
      ? initialBlocks
      : [
          { id: 'fb-1', day: 'Today', start: '08:30', end: '10:00', title: 'CS 101 Lecture' },
          { id: 'fb-2', day: 'Today', start: '13:00', end: '14:30', title: 'Math 53 Discussion' },
        ]
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setErrorMsg('Image too large (max 5 MB).');
        return;
      }
      setFile(selected);
      setErrorMsg(null);
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const handleExtract = async () => {
    setIsExtracting(true);
    setErrorMsg(null);

    try {
      let res: Response;
      if (mode === 'upload' && file) {
        const formData = new FormData();
        formData.append('scheduleImage', file);
        res = await fetch('/api/schedule/extract', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/schedule/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text:
              textSchedule ||
              'CS 101 Lecture MWF 8:30am - 10:00am, Math 53 TTH 1:00pm - 2:30pm, CS 101 Lab F 3:00pm - 5:00pm',
          }),
        });
      }

      const data = await res.json();
      if (data.fixedBlocks && data.fixedBlocks.length > 0) {
        // Server already sorts today-first; keep the order
        setBlocks(data.fixedBlocks);
        if (data.notes && /read/i.test(data.notes)) setErrorMsg(data.notes);
      } else if (data.fallbackBlocks) {
        setBlocks(data.fallbackBlocks);
        setErrorMsg(data.error || 'Could not read the schedule. Edit the table below.');
      }
    } catch (err: any) {
      console.error('Extract error:', err);
      setErrorMsg('Cannot reach the server. Edit the table directly.');
    } finally {
      setIsExtracting(false);
    }
  };

  const updateBlock = (index: number, field: keyof FixedBlock, value: string) => {
    const copy = [...blocks];
    copy[index] = { ...copy[index], [field]: value };
    setBlocks(copy);
  };

  const addBlock = () => {
    setBlocks([
      ...blocks,
      {
        id: `fb-${Date.now()}`,
        day: 'Today',
        start: '15:00',
        end: '16:00',
        title: 'New class',
      },
    ]);
  };

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-paper-50 rounded-3xl border-2 border-ink shadow-chunky p-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-paper-300">
          <div>
            <div className="text-[11px] font-bold text-mango-dark uppercase tracking-wider">
              Step 1 of 2: Schedule Input
            </div>
            <h2 className="font-display text-lg font-extrabold text-ink tracking-tight">Your classes</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl hover:bg-paper-200 text-ink-muted hover:text-ink"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload or Text Switcher */}
        <div className="flex gap-2 my-4">
          <button
            onClick={() => setMode('upload')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl border border-ink flex items-center justify-center gap-2 transition-all ${
              mode === 'upload' ? 'bg-mango shadow-chunky-sm text-ink' : 'bg-paper-200 text-ink-muted'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Screenshot / Photo</span>
          </button>
          <button
            onClick={() => setMode('text')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl border border-ink flex items-center justify-center gap-2 transition-all ${
              mode === 'text' ? 'bg-mango shadow-chunky-sm text-ink' : 'bg-paper-200 text-ink-muted'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Type it in</span>
          </button>
        </div>

        {/* Input Body */}
        {mode === 'upload' ? (
          <div className="flex flex-col gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-paper-400 hover:border-ink rounded-2xl p-4 text-center cursor-pointer bg-paper-100 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {filePreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={filePreview}
                    alt="Schedule preview"
                    className="max-h-36 rounded-lg object-contain border border-paper-300"
                  />
                  <span className="text-xs text-ink-muted underline">Change image</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-4">
                  <Upload className="w-8 h-8 text-mango-dark" />
                  <span className="text-xs font-bold text-ink">
                    Upload a screenshot of your schedule
                  </span>
                  <span className="text-[11px] text-ink-muted">PNG, JPG or WebP, up to 5 MB</span>
                </div>
              )}
            </div>

            <button
              onClick={handleExtract}
              disabled={isExtracting || !file}
              className="w-full py-2.5 rounded-xl bg-mango hover:bg-mango-hover disabled:opacity-50 text-ink font-bold text-xs border border-ink shadow-chunky-sm flex items-center justify-center gap-2"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Reading schedule...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Read with Gemini</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <textarea
              rows={3}
              value={textSchedule}
              onChange={(e) => setTextSchedule(e.target.value)}
              placeholder="Example: CS 101 Lecture MWF 8:30-10:00am, Math 53 TTH 1:00-2:30pm"
              className="w-full p-3 text-xs bg-paper-100 rounded-xl border border-paper-400 focus:border-ink focus:outline-none"
            />
            <button
              onClick={handleExtract}
              disabled={isExtracting}
              className="w-full py-2.5 rounded-xl bg-mango hover:bg-mango-hover text-ink font-bold text-xs border border-ink shadow-chunky-sm flex items-center justify-center gap-2"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Reading...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Extract schedule</span>
                </>
              )}
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mt-2 text-xs text-terracotta bg-terracotta-light p-2 rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Editable Table */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-ink">
              Classes ({blocks.length}):
            </span>
            <button
              onClick={addBlock}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-ink hover:text-mango-dark"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {blocks.map((b, i) => (
              <div
                key={b.id || i}
                className="flex items-center gap-2 p-2 bg-paper-100 rounded-xl border border-paper-300"
              >
                <span className="text-[10px] font-bold text-mango-dark w-9 shrink-0 truncate" title={b.day}>
                  {b.day === 'Today' ? 'Today' : (b.day || 'Today').slice(0, 3)}
                </span>
                <input
                  type="text"
                  value={b.title}
                  onChange={(e) => updateBlock(i, 'title', e.target.value)}
                  placeholder="Subject / Event"
                  className="flex-1 text-xs font-semibold bg-transparent border-b border-transparent hover:border-paper-400 focus:border-ink focus:outline-none px-1"
                />
                <input
                  type="time"
                  value={b.start}
                  onChange={(e) => updateBlock(i, 'start', e.target.value)}
                  className="text-xs font-mono bg-paper-200 px-1.5 py-0.5 rounded border border-paper-300"
                />
                <span className="text-xs text-ink-muted">–</span>
                <input
                  type="time"
                  value={b.end}
                  onChange={(e) => updateBlock(i, 'end', e.target.value)}
                  className="text-xs font-mono bg-paper-200 px-1.5 py-0.5 rounded border border-paper-300"
                />
                <button
                  onClick={() => removeBlock(i)}
                  className="p-1 text-ink-muted hover:text-terracotta"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Next Button */}
        <div className="mt-5 pt-3 border-t border-paper-300 flex justify-end">
          <button
            onClick={() => onContinue(blocks)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ink text-white hover:bg-ink-muted font-bold text-xs shadow-chunky-sm transition-all"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
