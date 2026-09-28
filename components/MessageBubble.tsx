import { Message } from "@/types/chat";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex flex-col transition-all duration-300 ${isUser ? "items-end" : "items-start"} mb-6`}>
      <div className="flex items-center space-x-2 mb-1 px-1">
        <span className="text-[11px] font-semibold tracking-wide uppercase text-zinc-500">
          {isUser ? "You" : "Nutrition Bot"}
        </span>
      </div>

      {isUser ? (
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-sm text-white shadow-lg shadow-blue-950/20 leading-relaxed break-words">
          {message.content}
        </div>
      ) : (
        <div className="max-w-[90%] sm:max-w-[85%] rounded-2xl rounded-tl-sm bg-zinc-900 border border-zinc-800/90 px-5 py-4 text-sm text-zinc-200 shadow-md leading-relaxed space-y-3">
          <p className="whitespace-pre-line text-zinc-100">{message.content}</p>
          
          {message.claims && message.claims.length > 0 && (
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="inline-flex items-center space-x-1.5 text-emerald-400 font-medium text-[11px]">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                <span>{message.claims.length} verified statements extracted</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
