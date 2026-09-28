import { FormEvent, useState } from "react";

export function InputBox({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className="p-4 md:px-8 md:py-4 bg-zinc-900/70 border-t border-zinc-800 flex-shrink-0">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-4 pr-24 py-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/80 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner transition-all"
            placeholder="Ask a nutrition question..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            aria-label="Nutrition question input"
          />
          <div className="absolute right-2 flex items-center">
            <button
              type="submit"
              disabled={disabled || !text.trim()}
              className="inline-flex items-center justify-center px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-semibold rounded-lg text-xs transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            >
              {disabled && text.trim() ? (
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Send</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                </>
              )}
            </button>
          </div>
        </form>
        <p className="text-[11px] text-zinc-500 mt-2 text-center">
          Press <kbd className="px-1.5 py-0.5 text-[10px] bg-zinc-800 rounded border border-zinc-700 font-mono text-zinc-300">Enter</kbd> to submit.
        </p>
      </div>
    </div>
  );
}
