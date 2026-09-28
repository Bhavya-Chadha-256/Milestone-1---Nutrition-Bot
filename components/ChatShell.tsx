"use client";

import { useState, useEffect } from "react";
import { Message, Claim } from "@/types/chat";
import { MessageList } from "./MessageList";
import { InputBox } from "./InputBox";
import { SourcesPanel } from "./SourcesPanel";
import { v4 as uuidv4 } from "uuid";

export function ChatShell() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Rehydrate sessionId from local storage
  useEffect(() => {
    const savedSession = localStorage.getItem("nutrition_session_id");
    if (savedSession) {
      setSessionId(savedSession);
    }
  }, []);

  const handleSend = async (text: string) => {
    const userMsg: Message = { id: uuidv4(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();

      if (!sessionId && data.session_id) {
        setSessionId(data.session_id);
        localStorage.setItem("nutrition_session_id", data.session_id);
      }

      const asstMsg: Message = {
        id: uuidv4(),
        role: "assistant",
        content: data.answer,
        claims: data.claims,
      };

      setMessages((prev) => [...prev, asstMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: uuidv4(),
        role: "assistant",
        content: `Error: ${err.message || "Something went wrong."}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem("nutrition_session_id");
  };

  const latestClaims = [...messages].reverse().find(m => m.role === "assistant")?.claims || [];

  return (
    <div className="flex flex-col h-screen max-h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <header className="h-16 px-4 md:px-6 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between flex-shrink-0 z-20 backdrop-blur">
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-zinc-950 font-bold shadow-md shadow-emerald-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-semibold tracking-tight text-zinc-100">Nutrition Bot</h1>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Milestone 1
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden xl:block">Evidence-based dietary reasoning & claim verification</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1 ml-4 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800">
            <button className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700/80 cursor-default">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" /></svg>
              <span>Chat & Claims</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleResetChat}
            title="New Chat"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-zinc-100 bg-emerald-600/90 hover:bg-emerald-500 active:bg-emerald-700 border border-emerald-500/30 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex flex-col flex-1 lg:w-[68%] w-full h-full bg-zinc-950 border-r border-zinc-800/80 transition-all">
          <MessageList messages={messages} loading={loading} />
          <InputBox onSend={handleSend} disabled={loading} />
        </main>

        <aside className="hidden md:flex flex-col lg:w-[32%] md:w-[36%] w-full h-full bg-zinc-925/90 flex-shrink-0 transition-all">
          <SourcesPanel claims={latestClaims} />
        </aside>
      </div>
    </div>
  );
}
