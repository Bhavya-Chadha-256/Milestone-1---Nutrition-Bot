import { Claim } from "@/types/chat";

export function SourcesPanel({ claims }: { claims: Claim[] }) {
  return (
    <div className="flex flex-col h-full bg-zinc-925/90 text-zinc-100 flex-shrink-0 border-l border-zinc-800">
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-zinc-800 text-emerald-400 border border-zinc-700/60">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 17L12 22l10-5M2 12l10 5 10-5M12 2L2 7l10 5 10-5-10-5z"/></svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Sources & Claims</h2>
            <p className="text-[11px] text-zinc-400">Structured claim verification</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
            {claims ? claims.length : 0} Claims
          </span>
        </div>
      </div>

      {/* Milestone 2 Roadmap Banner */}
      <div className="mx-4 mt-4 p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 flex items-start space-x-2.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        <div className="text-[11px] text-zinc-300 leading-snug">
          <span className="font-semibold text-emerald-300">Milestone 1 Architecture:</span> Claims are isolated from LLM output. Citations & DOI mapping will populate in <span className="underline decoration-emerald-500">Milestone 2</span>.
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {!claims || claims.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            <div className="w-12 h-12 rounded-full bg-zinc-850 flex items-center justify-center mb-3 text-zinc-400 border border-zinc-800">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/><path d="m14 17-2.83-2.83"/></svg>
            </div>
            <p className="text-sm font-medium text-zinc-300 mb-1">No claims in active message</p>
            <p className="text-xs text-zinc-500 max-w-[220px]">
              Ask a question in the chat to extract and verify nutritional claims.
            </p>
          </div>
        ) : (
          claims.map((claim, idx) => (
            <div 
              key={idx}
              className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 transition-all shadow-sm space-y-2.5 group"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-zinc-800 text-zinc-400 border border-zinc-700/70">
                  Claim #{idx + 1}
                </span>
                <span className="text-[10px] text-emerald-400/90 flex items-center gap-1 font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Extracted
                </span>
              </div>

              <p className="text-xs text-zinc-200 leading-relaxed font-normal">
                "{claim.claim_text}"
              </p>

              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-[11px] text-zinc-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                  <span>Source:</span>
                  {claim.source ? (
                    <span className="text-emerald-400 font-medium">{claim.source}</span>
                  ) : (
                    <span className="italic text-zinc-500 bg-zinc-850 px-2 py-0.5 rounded text-[10px] border border-zinc-800">
                      No source provided
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-mono">
                  M2 Slot
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
