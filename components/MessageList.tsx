import { useEffect, useRef } from "react";
import { Message } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";

export function MessageList({ messages, loading }: { messages: Message[], loading: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6" aria-live="polite">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-zinc-700"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <p className="text-sm font-medium text-zinc-300">Welcome to the Nutrition Bot</p>
            <p className="text-xs max-w-[250px] mt-2">Ask me about food, safety, and nutrients for evidence-based dietary reasoning.</p>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        
        {loading && (
          <div className="flex flex-col items-start animate-fade-in mb-6">
            <div className="flex items-center space-x-2 mb-1 px-1">
              <span className="text-[11px] font-semibold uppercase text-zinc-500">Nutrition Bot</span>
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-zinc-900 border border-zinc-800 px-4 py-3 flex items-center space-x-2 shadow-md">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></div>
              <span className="text-xs text-zinc-400 ml-2">Evaluating scientific claims...</span>
            </div>
          </div>
        )}
        
        <div ref={endRef} />
      </div>
    </div>
  );
}
