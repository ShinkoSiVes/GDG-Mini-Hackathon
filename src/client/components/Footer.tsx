import React from 'react';
import { Sparkles, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 py-8 border-t border-paper-300 bg-paper-50 text-center text-xs text-ink-muted">
      <div className="max-w-xl mx-auto px-4 flex flex-col items-center gap-3">
        <div className="flex items-center gap-1.5 font-bold text-ink">
          <Sparkles className="w-3.5 h-3.5 text-mango-dark" />
          <span>Paano ito gumagana?</span>
        </div>
        <p className="max-w-md text-[11px] leading-relaxed">
          Binabasa ng <strong>Gemini 2.5 Flash</strong> sa Google Cloud ang iyong school schedule at
          hinahanap ang pinakamagandang libreng puwang para sa iyong mga daily habits—hindi sasabit
          sa klase o tulog, at agad na mag-aadjust kapag may biglang lakad ang barkada.
        </p>
        <div className="text-[11px] flex items-center gap-1 text-ink-muted">
          <span>Gawa para sa</span>
          <strong className="text-ink">DevFest Manila 2026 After Hours</strong>
          <span className="text-[10px] font-mono bg-paper-200 px-1.5 py-0.5 rounded border border-paper-300">
            #GeminiPromptMaxxing
          </span>
        </div>
        <div className="text-[10px] text-ink-light flex items-center gap-1">
          <span>Walang database o account • Powered by Gemini on Google Cloud Run</span>
        </div>
      </div>
    </footer>
  );
};
