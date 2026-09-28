"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";

    // Past conversation sessions with grouped time buckets & message IDs for exact targeting
    const PAST_SESSIONS = [
      {
        id: "session_1",
        title: "New Nutrition Inquiry",
        preview: "Ask me a question...",
        timeGroup: "Today",
        timestamp: "Just now",
        claimsCount: 0,
        category: "Nutrient requirements",
        messages: [
          {
            id: "intro_1",
            sender: "assistant",
            text: "Hello! I am your AI Nutrition Assistant. Ask me anything about diet, micronutrients, caloric requirements, or meal planning.",
            timestamp: "Just now",
            claims: []
          }
        ]
      }
    ];
    const INITIAL_QUERY_LOGS: any[] = [];
    const SAMPLE_REPLIES: any[] = [];
    const CATEGORIES = [
      "All Categories",
      "Nutrient requirements",
      "Food safety and storage",
      "Cooking methods",
      "Questions where nobody has a clear answer"
    ];

    function inferCategory(q: string): string {
      const lower = q.toLowerCase();
      if (
        lower.includes("fasting") ||
        lower.includes("16:8") ||
        lower.includes("intermittent") ||
        lower.includes("sweetener") ||
        lower.includes("diet soda") ||
        lower.includes("seed oil") ||
        lower.includes("breakfast") ||
        lower.includes("coffee") ||
        lower.includes("egg") ||
        lower.includes("cholesterol") ||
        lower.includes("debate") ||
        lower.includes("good or bad")
      ) {
        return "Questions where nobody has a clear answer";
      }
      if (
        lower.includes("steam") ||
        lower.includes("boil") ||
        lower.includes("fry") ||
        lower.includes("smoke point") ||
        lower.includes("microwave") ||
        lower.includes("cook") ||
        lower.includes("sous-vide") ||
        lower.includes("method")
      ) {
        return "Cooking methods";
      }
      if (
        lower.includes("fridge") ||
        lower.includes("refrigerator") ||
        lower.includes("freeze") ||
        lower.includes("thaw") ||
        lower.includes("room temp") ||
        lower.includes("overnight") ||
        lower.includes("bacteria") ||
        lower.includes("safe") ||
        lower.includes("salmonella") ||
        lower.includes("spoil") ||
        lower.includes("honey") ||
        lower.includes("storage") ||
        lower.includes("leftover")
      ) {
        return "Food safety and storage";
      }
      return "Nutrient requirements";
    }

    // Main App Component
    function NutritionBotApp() {
      // 3 Top-level views: 'chat' | 'logs' | 'excel'
      const [mainNav, setMainNav] = useState("chat");

      // History Drawer / Sidebar state
      const [historyOpen, setHistoryOpen] = useState(true);
      const [historySearch, setHistorySearch] = useState("");
      
      // Active session management
      const [sessions, setSessions] = useState<any[]>(PAST_SESSIONS);
      const [activeSessionId, setActiveSessionId] = useState("session_1");

      // Chat state
      const activeSession = sessions.find((s: any) => s.id === activeSessionId) || sessions[0];
      const [messages, setMessages] = useState<any[]>(activeSession.messages);
      const [activeClaims, setActiveClaims] = useState<any[]>(
        activeSession.messages.find((m: any) => m.claims && m.claims.length > 0)?.claims || []
      );

      // Categorized Query Logs & Excel Grid State
      const [queryLogs, setQueryLogs] = useState<any[]>(INITIAL_QUERY_LOGS);
      const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All Categories");
      const [logSearchQuery, setLogSearchQuery] = useState("");
      
      // Excel Specific States
      const [selectedExcelRowIndex, setSelectedExcelRowIndex] = useState(0);
      const [activeCellCoord, setActiveCellCoord] = useState("C2");
      const [activeCellContent, setActiveCellContent] = useState(INITIAL_QUERY_LOGS[0]?.question || "");
      const [sortField, setSortField] = useState("code");
      const [sortAsc, setSortAsc] = useState(true);
      const [exportNotification, setExportNotification] = useState("");

      // Deep Linking & Target Highlight Banner State
      const [navigatedFromLog, setNavigatedFromLog] = useState<any>(null);
      const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

      // Chat input & mobile view toggles
      const [activeTabMobile, setActiveTabMobile] = useState("chat");
      const [inputQuery, setInputQuery] = useState("");
      const [isLoading, setIsLoading] = useState(false);
      const messagesEndRef = useRef<HTMLDivElement | null>(null);

      // Synchronize active session message updates
      const switchSession = (sessionId: string) => {
        const found = sessions.find((s: any) => s.id === sessionId);
        if (found) {
          setActiveSessionId(sessionId);
          setMessages(found.messages);
          const foundClaims = found.messages.slice().reverse().find((m: any) => m.claims && m.claims.length > 0)?.claims || [];
          setActiveClaims(foundClaims);
          setMainNav("chat");
          setActiveTabMobile("chat");
        }
      };

      // Jump to exact chat from an Excel Log row or Query Log card
      const handleJumpToChatFromLog = (logEntry: any) => {
        const targetSess = sessions.find((s: any) => s.id === logEntry.sessionId);
        if (targetSess) {
          setActiveSessionId(targetSess.id);
          setMessages(targetSess.messages);
          const foundClaims = targetSess.messages.slice().reverse().find((m: any) => m.claims && m.claims.length > 0)?.claims || [];
          setActiveClaims(foundClaims);
        }
        setNavigatedFromLog(logEntry);
        setHighlightedMsgId(logEntry.targetMsgId || "msg_2");
        setMainNav("chat");
        setActiveTabMobile("chat");

        // Scroll to highlighted message
        setTimeout(() => {
          const el = document.getElementById(`msg-bubble-${logEntry.targetMsgId || "msg_2"}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 120);
      };

      // Auto scroll to bottom of chat when not navigating directly to a target
      useEffect(() => {
        if (mainNav === "chat" && !highlightedMsgId) {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }, [messages, isLoading, mainNav]);

      // Removed lucide CDN call to prevent React DOM NotFoundError

      const handleResetChat = () => {
        const newSessionId = `session_${Date.now()}`;
        const newMsg = [
          {
            id: `intro_${Date.now()}`,
            sender: "assistant",
            text: "Hello! Started a fresh conversation. Ask me any nutrition question regarding daily requirements, food safety, preparation methods, or active scientific debates.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            claims: []
          }
        ];
        const newSession = {
          id: newSessionId,
          title: "New Nutrition Inquiry",
          preview: "Started fresh conversation...",
          timeGroup: "Today",
          timestamp: "Just now",
          claimsCount: 0,
          category: "Nutrient requirements",
          messages: newMsg
        };

        setSessions([newSession, ...sessions]);
        setActiveSessionId(newSessionId);
        setMessages(newMsg);
        setActiveClaims([]);
        setNavigatedFromLog(null);
        setHighlightedMsgId(null);
        setMainNav("chat");
      };

      const handleSendMessage = async (e: React.FormEvent | undefined) => {
        if (e) e.preventDefault();
        const trimmed = inputQuery.trim();
        if (!trimmed || isLoading) return;

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const userMsgId = `user_${Date.now()}`;
        const userMsg = {
          id: userMsgId,
          sender: "user",
          text: trimmed,
          timestamp: timeStr,
          claims: []
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInputQuery("");
        setIsLoading(true);
        setNavigatedFromLog(null);
        setHighlightedMsgId(null);

        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: activeSessionId, message: trimmed }),
          });

          if (!res.ok) {
            throw new Error(await res.text());
          }

          const data = await res.json();
          
          const botMsg = {
            id: `bot_${Date.now()}`,
            sender: "assistant",
            text: data.answer,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            claims: data.claims || []
          };

          const newMsgList = [...updatedMessages, botMsg];
          setMessages(newMsgList);
          setActiveClaims(botMsg.claims);
          
          setSessions((prev: any) => prev.map((s: any) => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                title: s.title === "New Nutrition Inquiry" ? trimmed.slice(0, 38) + (trimmed.length > 38 ? "..." : "") : s.title,
                preview: botMsg.text.slice(0, 60) + "...",
                claimsCount: s.claimsCount + botMsg.claims.length,
                messages: newMsgList
              };
            }
            return s;
          }));

          const nextCodeNumber = 142 + queryLogs.length;
          const assignedCategory = inferCategory(trimmed);
          const newLogEntry = {
            id: `log_live_${Date.now()}`,
            code: `LOG-0${nextCodeNumber}`,
            sessionId: activeSessionId,
            targetMsgId: userMsgId,
            category: assignedCategory,
            question: trimmed,
            answer: botMsg.text,
            timestamp: "Just now",
            claimsCount: botMsg.claims.length,
            status: "Verified Response",
            tags: ["Live Query", assignedCategory.split(" ")[0]]
          };
          setQueryLogs((prev: any) => [newLogEntry, ...prev]);
        } catch (err: any) {
          const errorMsg = {
            id: `bot_${Date.now()}`,
            sender: "assistant",
            text: `Error: ${err.message || "Something went wrong."}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            claims: []
          };
          setMessages([...updatedMessages, errorMsg]);
        } finally {
          setIsLoading(false);
        }
      };

      // Filtered past sessions
      const filteredSessions = useMemo(() => {
        if (!historySearch.trim()) return sessions;
        const q = historySearch.toLowerCase();
        return sessions.filter((s: any) => s.title.toLowerCase().includes(q) || s.preview.toLowerCase().includes(q));
      }, [sessions, historySearch]);

      // Group past sessions
      const sessionGroups = useMemo<Record<string, any[]>>(() => {
        const groups: Record<string, any[]> = { "Today": [], "Yesterday": [], "Previous 7 Days": [] };
        filteredSessions.forEach((s: any) => {
          if (groups[s.timeGroup]) {
            groups[s.timeGroup].push(s);
          } else {
            if (!groups["Previous 7 Days"]) groups["Previous 7 Days"] = [];
            groups["Previous 7 Days"].push(s);
          }
        });
        return groups;
      }, [filteredSessions]);

      // Filtered and sorted logs for Cards & Excel view
      const filteredLogs = useMemo(() => {
        let result = queryLogs.filter((log: any) => {
          const matchCategory = selectedCategoryFilter === "All Categories" || log.category === selectedCategoryFilter;
          const matchSearch = !logSearchQuery.trim() || 
            log.question.toLowerCase().includes(logSearchQuery.toLowerCase()) || 
            log.answer.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
            (log.code && log.code.toLowerCase().includes(logSearchQuery.toLowerCase())) ||
            (log.tags && log.tags.some((t: string) => t.toLowerCase().includes(logSearchQuery.toLowerCase())));
          return matchCategory && matchSearch;
        });

        result.sort((a: any, b: any) => {
          let valA = a[sortField] || "";
          let valB = b[sortField] || "";
          if (typeof valA === "string") valA = valA.toLowerCase();
          if (typeof valB === "string") valB = valB.toLowerCase();
          if (valA < valB) return sortAsc ? -1 : 1;
          if (valA > valB) return sortAsc ? 1 : -1;
          return 0;
        });

        return result;
      }, [queryLogs, selectedCategoryFilter, logSearchQuery, sortField, sortAsc]);

      const triggerExport = (format: string) => {
        setExportNotification(`Generating nutrition_query_logs_${new Date().toISOString().slice(0, 10)}.${format}... Download ready.`);
        setTimeout(() => setExportNotification(""), 4000);
      };

      const handleSort = (field: string) => {
        if (sortField === field) {
          setSortAsc(!sortAsc);
        } else {
          setSortField(field);
          setSortAsc(true);
        }
      };

      return (
        <div className="flex flex-col h-screen max-h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
          
          {/* 1. Primary Navigation Header */}
          <header className="h-16 px-4 md:px-6 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between flex-shrink-0 z-20 backdrop-blur">
            <div className="flex items-center space-x-3 md:space-x-4">
              {/* History Drawer Toggle Button */}
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                className={`p-2 rounded-lg border transition-all ${
                  historyOpen 
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                    : "bg-zinc-800/80 text-zinc-400 border-zinc-700/80 hover:text-white"
                }`}
                title="Toggle Past Conversations Drawer"
                aria-label="Toggle Conversation History Drawer"
              >
                <i data-lucide="history" className="w-4 h-4"></i>
              </button>

              {/* Logo / Branding */}
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-zinc-950 font-bold shadow-md shadow-emerald-500/20">
                  <i data-lucide="leaf" className="w-5 h-5 text-zinc-950 stroke-[2.5]"></i>
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

              {/* View Switcher: 3 Full Tabs (Chat, Categorized Cards, Excel Spreadsheet Log) */}
              <nav className="hidden md:flex items-center space-x-1 ml-4 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setMainNav("chat")}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    mainNav === "chat"
                      ? "bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700/80"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <i data-lucide="message-square" className="w-3.5 h-3.5"></i>
                  <span>Chat & Claims</span>
                </button>
                <button
                  onClick={() => setMainNav("logs")}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    mainNav === "logs"
                      ? "bg-zinc-800 text-emerald-400 shadow-sm border border-zinc-700/80"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <i data-lucide="layout-grid" className="w-3.5 h-3.5"></i>
                  <span>Categorized Logs</span>
                </button>
                <button
                  onClick={() => setMainNav("excel")}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    mainNav === "excel"
                      ? "bg-emerald-950/40 text-emerald-300 shadow-sm border border-emerald-500/40"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <i data-lucide="file-spreadsheet" className="w-3.5 h-3.5 text-emerald-400"></i>
                  <span className="font-semibold">Excel Spreadsheet Log</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                    {queryLogs.length}
                  </span>
                </button>
              </nav>
            </div>

            {/* Right Header Actions */}
            <div className="flex items-center space-x-2">
              {/* Mobile Main Tab Switcher Toggle */}
              <div className="flex md:hidden bg-zinc-800 p-0.5 rounded-lg border border-zinc-700/60">
                <button
                  onClick={() => setMainNav("chat")}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                    mainNav === "chat" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400"
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setMainNav("logs")}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                    mainNav === "logs" ? "bg-zinc-700 text-zinc-100" : "text-zinc-400"
                  }`}
                >
                  Logs
                </button>
                <button
                  onClick={() => setMainNav("excel")}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-all ${
                    mainNav === "excel" ? "bg-emerald-800 text-white" : "text-zinc-400"
                  }`}
                >
                  Excel
                </button>
              </div>

              {/* Reset / New Chat Button */}
              <button
                onClick={handleResetChat}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-zinc-100 bg-emerald-600/90 hover:bg-emerald-500 active:bg-emerald-700 border border-emerald-500/30 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-sm"
                aria-label="Reset Conversation and Start New Chat"
                title="New Chat"
              >
                <i data-lucide="plus" className="w-3.5 h-3.5 stroke-[2.5]"></i>
                <span className="hidden sm:inline">New Chat</span>
              </button>
            </div>
          </header>

          {/* Export Notification Toast */}
          {exportNotification && (
            <div className="bg-emerald-900/90 border-b border-emerald-500/40 text-emerald-200 text-xs px-4 py-2 flex items-center justify-between z-30 transition-all">
              <span className="flex items-center space-x-2">
                <i data-lucide="download" className="w-4 h-4 animate-bounce"></i>
                <span>{exportNotification}</span>
              </span>
              <button onClick={() => setExportNotification("")} className="text-emerald-300 hover:text-white">
                <i data-lucide="x" className="w-3.5 h-3.5"></i>
              </button>
            </div>
          )}

          {/* 2. Main Content Layout */}
          <div className="flex-1 flex overflow-hidden relative">

            {/* 2A. LEFT HISTORY DRAWER / SIDEBAR */}
            <aside
              className={`${
                historyOpen ? "w-72 lg:w-80 border-r" : "w-0 border-r-0"
              } transition-all duration-200 ease-in-out bg-zinc-925/95 border-zinc-800/80 flex flex-col flex-shrink-0 z-10 overflow-hidden select-none`}
            >
              {/* History Search Header */}
              <div className="p-3 border-b border-zinc-800/80 space-y-2.5 bg-zinc-900/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-300">
                    <i data-lucide="clock" className="w-4 h-4 text-emerald-400"></i>
                    <span>Conversation History</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {sessions.length} sessions
                  </span>
                </div>
                <div className="relative">
                  <i data-lucide="search" className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2"></i>
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search past conversations..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50"
                  />
                  {historySearch && (
                    <button 
                      onClick={() => setHistorySearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      <i data-lucide="x" className="w-3 h-3"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* Grouped Session List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {Object.keys(sessionGroups).map((groupName: string) => {
                  const list = sessionGroups[groupName] || [];
                  if (list.length === 0) return null;
                  return (
                    <div key={groupName} className="space-y-1.5">
                      <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                        <span>{groupName}</span>
                        <span className="text-[9px] text-zinc-600 font-mono">{list.length}</span>
                      </div>
                      <div className="space-y-1">
                        {list.map((sess: any) => {
                          const isActive = sess.id === activeSessionId && mainNav === "chat";
                          return (
                            <button
                              key={sess.id}
                              onClick={() => {
                                setNavigatedFromLog(null);
                                setHighlightedMsgId(null);
                                switchSession(sess.id);
                              }}
                              className={`w-full text-left p-2.5 rounded-xl border transition-all flex flex-col space-y-1 group relative ${
                                isActive 
                                  ? "bg-zinc-800/90 border-emerald-500/40 text-zinc-100 shadow-sm"
                                  : "bg-zinc-900/40 border-transparent hover:bg-zinc-850 hover:border-zinc-800 text-zinc-300"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="text-xs font-medium truncate group-hover:text-emerald-300 transition-colors">
                                  {sess.title}
                                </span>
                                {isActive && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-500 truncate line-clamp-1">
                                {sess.preview}
                              </p>
                              <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-500">
                                <span>{sess.timestamp}</span>
                                <span className="inline-flex items-center space-x-1 text-emerald-400/80">
                                  <i data-lucide="shield-check" className="w-3 h-3"></i>
                                  <span>{sess.claimsCount} claims</span>
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {filteredSessions.length === 0 && (
                  <div className="text-center py-8 text-zinc-500 text-xs">
                    <p>No past conversations matched</p>
                    <button 
                      onClick={() => setHistorySearch("")}
                      className="text-emerald-400 underline mt-1 text-[11px]"
                    >
                      Clear search
                    </button>
                  </div>
                )}
              </div>

              {/* History Drawer Footer */}
              <div className="p-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center space-x-1.5">
                  <i data-lucide="archive" className="w-3.5 h-3.5 text-zinc-500"></i>
                  <span>Sessions persistent</span>
                </span>
                <button
                  onClick={handleResetChat}
                  className="text-emerald-400 hover:text-emerald-300 text-xs font-medium"
                >
                  + New
                </button>
              </div>
            </aside>

            {/* 2B. PRIMARY WORKSPACE: Switch between Chat, Categorized Logs, and Excel Spreadsheet */}
            {mainNav === "chat" && (
              // === VIEW 1: CHAT VIEW + SOURCES & CLAIMS PANEL ===
              <div className="flex-1 flex overflow-hidden">
                {/* Center Chat Area (~68% on Desktop) */}
                <main 
                  className={`flex flex-col flex-1 lg:w-[68%] w-full h-full bg-zinc-950 border-r border-zinc-800/80 transition-all ${
                    activeTabMobile === "sources" ? "hidden md:flex" : "flex"
                  }`}
                >
                  {/* Interactive Banner when navigated directly from a Log Entry */}
                  {navigatedFromLog && (
                    <div className="bg-emerald-950/60 border-b border-emerald-500/40 px-4 md:px-8 py-2.5 flex items-center justify-between text-xs text-emerald-200">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                          {navigatedFromLog.code}
                        </span>
                        <span className="font-semibold text-emerald-300">Navigated from Log:</span>
                        <span className="truncate text-zinc-200">{navigatedFromLog.question}</span>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => setMainNav("excel")}
                          className="text-[11px] text-emerald-400 hover:text-emerald-200 underline font-medium"
                        >
                          Back to Sheet
                        </button>
                        <button
                          onClick={() => {
                            setNavigatedFromLog(null);
                            setHighlightedMsgId(null);
                          }}
                          className="text-emerald-400/80 hover:text-white p-1"
                        >
                          <i data-lucide="x" className="w-3.5 h-3.5"></i>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Current Active Session Top Bar */}
                  <div className="h-10 px-4 md:px-8 border-b border-zinc-800/70 bg-zinc-950/60 flex items-center justify-between text-xs text-zinc-400 flex-shrink-0">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-zinc-500 uppercase text-[10px] font-mono tracking-wider">Active Session:</span>
                      <span className="text-zinc-200 font-medium truncate">{activeSession.title}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => setMainNav("excel")}
                        className="text-[11px] text-zinc-400 hover:text-emerald-400 flex items-center space-x-1.5 transition-colors"
                      >
                        <i data-lucide="file-spreadsheet" className="w-3.5 h-3.5 text-emerald-400"></i>
                        <span>Inspect in Excel View</span>
                      </button>
                    </div>
                  </div>

                  {/* Message List */}
                  <div 
                    className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6"
                    aria-live="polite"
                    aria-label="Conversation History"
                  >
                    <div className="max-w-3xl mx-auto space-y-6">
                      {messages.map((msg) => {
                        const isTarget = highlightedMsgId === msg.id;
                        return (
                          <div 
                            key={msg.id}
                            id={`msg-bubble-${msg.id}`}
                            className={`flex flex-col transition-all duration-300 ${msg.sender === "user" ? "items-end" : "items-start"}`}
                          >
                            <div className="flex items-center space-x-2 mb-1 px-1">
                              <span className="text-[11px] font-semibold tracking-wide uppercase text-zinc-500">
                                {msg.sender === "user" ? "You" : "Nutrition Bot"}
                              </span>
                              <span className="text-[10px] text-zinc-600">{msg.timestamp}</span>
                              {isTarget && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  <i data-lucide="target" className="w-3 h-3"></i>
                                  <span>Target Logged Query {navigatedFromLog?.code}</span>
                                </span>
                              )}
                            </div>

                            {msg.sender === "user" ? (
                              <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-sm text-white shadow-lg shadow-blue-950/20 leading-relaxed break-words ${
                                isTarget ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-zinc-950" : ""
                              }`}>
                                {msg.text}
                              </div>
                            ) : (
                              <div className={`max-w-[90%] sm:max-w-[85%] rounded-2xl rounded-tl-sm bg-zinc-900 border px-5 py-4 text-sm text-zinc-200 shadow-md leading-relaxed space-y-3 ${
                                isTarget 
                                  ? "border-emerald-500/70 shadow-emerald-950/30 ring-1 ring-emerald-500/40" 
                                  : "border-zinc-800/90"
                              }`}>
                                <p className="whitespace-pre-line text-zinc-100">{msg.text}</p>
                                
                                {msg.claims && msg.claims.length > 0 && (
                                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                                    <span className="inline-flex items-center space-x-1.5 text-emerald-400 font-medium text-[11px]">
                                      <i data-lucide="shield-check" className="w-3.5 h-3.5"></i>
                                      <span>{msg.claims.length} verified statements extracted</span>
                                    </span>
                                    <button 
                                      onClick={() => {
                                        setActiveClaims(msg.claims);
                                        setActiveTabMobile("sources");
                                      }}
                                      className="text-[11px] text-zinc-400 hover:text-emerald-400 underline decoration-zinc-700 underline-offset-2 transition-colors"
                                    >
                                      View in Claims Panel &rarr;
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {isLoading && (
                        <div className="flex flex-col items-start animate-fade-in">
                          <div className="flex items-center space-x-2 mb-1 px-1">
                            <span className="text-[11px] font-semibold uppercase text-zinc-500">Nutrition Bot</span>
                            <span className="text-[10px] text-zinc-600">Formulating nutritional answer...</span>
                          </div>
                          <div className="rounded-2xl rounded-tl-sm bg-zinc-900 border border-zinc-800 px-4 py-3 flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></div>
                            <span className="text-xs text-zinc-400 ml-2">Evaluating scientific claims...</span>
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  </div>

                  {/* Input Box Component */}
                  <div className="p-4 md:px-8 md:py-4 bg-zinc-900/70 border-t border-zinc-800 flex-shrink-0">
                    <div className="max-w-3xl mx-auto">
                      <form onSubmit={handleSendMessage} className="relative flex items-center">
                        <input
                          type="text"
                          value={inputQuery}
                          onChange={(e) => setInputQuery(e.target.value)}
                          disabled={isLoading}
                          placeholder="Ask a nutrition question (e.g., protein absorption, micronutrients, keto)..."
                          aria-label="Nutrition question input"
                          className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-4 pr-24 py-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/80 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner transition-all"
                        />
                        <div className="absolute right-2 flex items-center">
                          <button
                            type="submit"
                            disabled={isLoading || !inputQuery.trim()}
                            aria-label="Send message"
                            className="inline-flex items-center justify-center px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-semibold rounded-lg text-xs transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                          >
                            {isLoading ? (
                              <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <>
                                <span>Send</span>
                                <i data-lucide="arrow-up" className="w-3.5 h-3.5 ml-1 stroke-[3]"></i>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                      <p className="text-[11px] text-zinc-500 mt-2 text-center">
                        Press <kbd className="px-1.5 py-0.5 text-[10px] bg-zinc-800 rounded border border-zinc-700 font-mono text-zinc-300">Enter</kbd> to submit. Synchronized with Excel Spreadsheet Log.
                      </p>
                    </div>
                  </div>
                </main>

                {/* Right Sidebar: Sources & Claims Panel (~32% on Desktop) */}
                <aside 
                  className={`flex-col lg:w-[32%] md:w-[36%] w-full h-full bg-zinc-925/90 flex flex-shrink-0 transition-all ${
                    activeTabMobile === "sources" ? "flex" : "hidden md:flex"
                  }`}
                  aria-label="Sources and Claims Sidebar"
                >
                  <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-zinc-800 text-emerald-400 border border-zinc-700/60">
                        <i data-lucide="layers" className="w-4 h-4"></i>
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-zinc-100">Sources & Claims</h2>
                        <p className="text-[11px] text-zinc-400">Structured claim verification</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {activeClaims.length} Claims
                      </span>
                    </div>
                  </div>

                  {/* Milestone 2 Roadmap Banner */}
                  <div className="mx-4 mt-4 p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 flex items-start space-x-2.5">
                    <i data-lucide="info" className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5"></i>
                    <div className="text-[11px] text-zinc-300 leading-snug">
                      <span className="font-semibold text-emerald-300">Milestone 1 Architecture:</span> Claims are isolated from LLM output. Citations & DOI mapping will populate in <span className="underline decoration-emerald-500">Milestone 2</span>.
                    </div>
                  </div>

                  {/* Claims List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                    {activeClaims.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                        <div className="w-12 h-12 rounded-full bg-zinc-850 flex items-center justify-center mb-3 text-zinc-400 border border-zinc-800">
                          <i data-lucide="file-question" className="w-6 h-6 stroke-1"></i>
                        </div>
                        <p className="text-sm font-medium text-zinc-300 mb-1">No claims in active message</p>
                        <p className="text-xs text-zinc-500 max-w-[220px]">
                          Ask a question in the chat to extract and verify nutritional claims.
                        </p>
                      </div>
                    ) : (
                      activeClaims.map((claim, idx) => (
                        <div 
                          key={idx}
                          className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700/80 transition-all shadow-sm space-y-2.5 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-zinc-800 text-zinc-400 border border-zinc-700/70">
                              Claim #{idx + 1}
                            </span>
                            <span className="text-[10px] text-emerald-400/90 flex items-center gap-1 font-medium">
                              <i data-lucide="check" className="w-3 h-3 stroke-[2.5]"></i>
                              Extracted
                            </span>
                          </div>

                          <p className="text-xs text-zinc-200 leading-relaxed font-normal">
                            "{claim.claim_text}"
                          </p>

                          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 text-[11px] text-zinc-500">
                              <i data-lucide="bookmark" className="w-3 h-3"></i>
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

                  {/* Raw JSON Debug Inspector */}
                  <div className="p-3 border-t border-zinc-800 bg-zinc-900/80 text-xs">
                    <details className="group cursor-pointer">
                      <summary className="flex items-center justify-between text-zinc-400 group-hover:text-zinc-200 select-none font-mono text-[11px]">
                        <span className="flex items-center space-x-1.5">
                          <i data-lucide="code" className="w-3.5 h-3.5 text-zinc-500"></i>
                          <span>JSON State Inspector</span>
                        </span>
                        <i data-lucide="chevron-down" className="w-3 h-3 transition-transform group-open:rotate-180"></i>
                      </summary>
                      <div className="mt-2.5 p-2 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-[10px] text-emerald-400/90 overflow-x-auto max-h-36">
                        <pre>{JSON.stringify({ 
                          session_id: activeSessionId,
                          answer: messages[messages.length - 1]?.text || "",
                          claims: activeClaims 
                        }, null, 2)}</pre>
                      </div>
                    </details>
                  </div>
                </aside>
              </div>
            )}

            {mainNav === "logs" && (
              // === VIEW 2: CATEGORIZED CARDS LOGS ===
              <main className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden">
                <div className="p-4 md:px-8 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur flex-shrink-0 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <i data-lucide="layout-grid" className="w-4 h-4"></i>
                        </div>
                        <h2 className="text-base font-semibold text-zinc-100">Categorized Query Logs</h2>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {filteredLogs.length} Entries
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Systematic catalog of user nutrition questions & verified synthesized answers sorted into standard domains
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="relative w-full sm:w-64">
                        <i data-lucide="search" className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2"></i>
                        <input
                          type="text"
                          value={logSearchQuery}
                          onChange={(e) => setLogSearchQuery(e.target.value)}
                          placeholder="Search questions or keywords..."
                          className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        {logSearchQuery && (
                          <button onClick={() => setLogSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                            <i data-lucide="x" className="w-3 h-3"></i>
                          </button>
                        )}
                      </div>
                      <button 
                        onClick={() => setMainNav("excel")}
                        className="px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors flex items-center space-x-1.5 flex-shrink-0"
                      >
                        <i data-lucide="file-spreadsheet" className="w-3.5 h-3.5"></i>
                        <span>Spreadsheet View</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Core Categories Filter Tabs */}
                  <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                    {CATEGORIES.map((cat) => {
                      const isActive = selectedCategoryFilter === cat;
                      const count = cat === "All Categories" 
                        ? queryLogs.length 
                        : queryLogs.filter(q => q.category === cat).length;
                      
                      let activeStyle = "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-750";
                      if (isActive) {
                        if (cat === "Nutrient requirements") activeStyle = "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm";
                        else if (cat === "Food safety and storage") activeStyle = "bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-sm";
                        else if (cat === "Cooking methods") activeStyle = "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm";
                        else if (cat === "Questions where nobody has a clear answer") activeStyle = "bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm";
                        else activeStyle = "bg-zinc-700 text-white border-zinc-600 shadow-sm";
                      }

                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-lg border font-medium transition-all flex items-center space-x-2 flex-shrink-0 ${activeStyle}`}
                        >
                          {cat === "Questions where nobody has a clear answer" && (
                            <i data-lucide="help-circle" className="w-3.5 h-3.5 text-purple-400"></i>
                          )}
                          {cat === "Nutrient requirements" && (
                            <i data-lucide="activity" className="w-3.5 h-3.5 text-emerald-400"></i>
                          )}
                          {cat === "Food safety and storage" && (
                            <i data-lucide="shield-alert" className="w-3.5 h-3.5 text-blue-400"></i>
                          )}
                          {cat === "Cooking methods" && (
                            <i data-lucide="flame" className="w-3.5 h-3.5 text-amber-400"></i>
                          )}
                          <span>{cat}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? "bg-zinc-900/60" : "bg-zinc-800 text-zinc-400"}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Categorized Logs List Cards */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
                  <div className="max-w-5xl mx-auto space-y-4">
                    {filteredLogs.map((log) => {
                      const isUncertain = log.category === "Questions where nobody has a clear answer";
                      let categoryBadgeColor = "bg-zinc-800 text-zinc-300 border-zinc-700";
                      if (log.category === "Nutrient requirements") {
                        categoryBadgeColor = "bg-emerald-950/60 text-emerald-400 border-emerald-800/60";
                      } else if (log.category === "Food safety and storage") {
                        categoryBadgeColor = "bg-blue-950/60 text-blue-400 border-blue-800/60";
                      } else if (log.category === "Cooking methods") {
                        categoryBadgeColor = "bg-amber-950/60 text-amber-400 border-amber-800/60";
                      } else if (isUncertain) {
                        categoryBadgeColor = "bg-purple-950/60 text-purple-300 border-purple-800/60";
                      }

                      return (
                        <div 
                          key={log.id}
                          className={`rounded-2xl border p-5 md:p-6 transition-all shadow-md ${
                            isUncertain 
                              ? "bg-gradient-to-br from-zinc-900 via-zinc-900 to-purple-950/20 border-purple-800/40 hover:border-purple-600/60" 
                              : "bg-zinc-900/90 border-zinc-800 hover:border-zinc-700/80"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs text-zinc-400 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                                {log.code}
                              </span>
                              <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${categoryBadgeColor}`}>
                                {log.category}
                              </span>
                              {isUncertain && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse-fast">
                                  <i data-lucide="alert-triangle" className="w-3 h-3"></i>
                                  <span>Scientific Debate Active</span>
                                </span>
                              )}
                              {!isUncertain && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/70">
                                  <i data-lucide="check-circle" className="w-3 h-3 text-emerald-400"></i>
                                  <span>{log.status}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-3 text-xs text-zinc-500">
                              <span>{log.timestamp}</span>
                              <span className="inline-flex items-center space-x-1 text-emerald-400 font-mono text-[11px]">
                                <i data-lucide="shield-check" className="w-3.5 h-3.5"></i>
                                <span>{log.claimsCount} Verified Claims</span>
                              </span>
                            </div>
                          </div>

                          <div className="mb-3.5">
                            <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 block mb-1">
                              Logged Question Prompt
                            </span>
                            <h3 className="text-base md:text-lg font-medium text-zinc-100 flex items-start gap-2">
                              <span className="text-emerald-400 font-serif font-bold text-lg select-none">Q:</span>
                              <span>{log.question}</span>
                            </h3>
                          </div>

                          <div className="rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-4 space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-850 pb-2">
                              <span className="flex items-center space-x-1.5 font-medium text-zinc-300">
                                <i data-lucide="file-text" className="w-3.5 h-3.5 text-emerald-400"></i>
                                <span>Verified Synthesized Answer</span>
                              </span>
                              {isUncertain ? (
                                <span className="text-purple-400 text-[10px] uppercase font-mono">
                                  Requires individual context
                                </span>
                              ) : (
                                <span className="text-emerald-400 text-[10px] uppercase font-mono">
                                  Consensus validated
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-zinc-300 leading-relaxed pt-1 whitespace-pre-line">
                              {log.answer}
                            </p>
                          </div>

                          <div className="mt-3.5 pt-3 border-t border-zinc-800/70 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {log.tags && log.tags.map((t: string, idx: number) => (
                                <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                                  #{t}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center space-x-2">
                              {/* Open in Chat Action Button */}
                              <button
                                onClick={() => handleJumpToChatFromLog(log)}
                                className="px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm flex items-center space-x-1.5 transition-all"
                              >
                                <i data-lucide="external-link" className="w-3.5 h-3.5 stroke-[2.5]"></i>
                                <span>Visit Exact Chat ↗</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </main>
            )}

            {mainNav === "excel" && (
              // === VIEW 3: NEW EXCEL SPREADSHEET LOG GRID ===
              <main className="flex-1 flex flex-col h-full bg-[#1e1e24] overflow-hidden select-none">
                
                {/* 3A. Excel Green Ribbon / Toolbar Header */}
                <div className="bg-[#107c41] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-white shadow-md flex-shrink-0">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/10 p-1.5 rounded flex items-center justify-center">
                      <i data-lucide="table" className="w-4 h-4 text-white"></i>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm tracking-wide">Nutrition_Query_Database.xlsx</span>
                        <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded text-emerald-100 font-mono">
                          Sheet1 • Read/Write
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-100">Synchronized tabular query log with exact chat references</p>
                    </div>
                  </div>

                  {/* Excel Actions: Search, Filter, Export Buttons */}
                  <div className="flex items-center space-x-2">
                    {/* Search in Sheet */}
                    <div className="relative">
                      <i data-lucide="search" className="w-3.5 h-3.5 text-white/70 absolute left-2.5 top-1/2 -translate-y-1/2"></i>
                      <input
                        type="text"
                        value={logSearchQuery}
                        onChange={(e) => setLogSearchQuery(e.target.value)}
                        placeholder="Search cells..."
                        className="bg-black/25 text-white placeholder-white/60 text-xs rounded pl-8 pr-3 py-1 border border-white/20 focus:outline-none focus:bg-black/40 focus:ring-1 focus:ring-white/50 w-44"
                      />
                    </div>

                    {/* Category Filter */}
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="bg-black/25 text-white text-xs rounded px-2.5 py-1 border border-white/20 focus:outline-none focus:bg-black/40"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c} className="bg-zinc-900 text-zinc-100">
                          {c}
                        </option>
                      ))}
                    </select>

                    {/* Export .xlsx */}
                    <button
                      onClick={() => triggerExport("xlsx")}
                      className="bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs px-2.5 py-1 rounded flex items-center space-x-1.5 border border-white/20 font-medium transition-colors"
                      title="Export current view to Excel workbook"
                    >
                      <i data-lucide="download" className="w-3.5 h-3.5"></i>
                      <span>Export .xlsx</span>
                    </button>

                    {/* Export .csv */}
                    <button
                      onClick={() => triggerExport("csv")}
                      className="bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs px-2.5 py-1 rounded flex items-center space-x-1.5 border border-white/20 font-medium transition-colors"
                      title="Export current view to CSV file"
                    >
                      <i data-lucide="file-text" className="w-3.5 h-3.5"></i>
                      <span>Export .csv</span>
                    </button>
                  </div>
                </div>

                {/* 3B. Formula / Cell Inspection Bar (`fx`) */}
                <div className="bg-[#26262e] border-b border-zinc-700/80 px-3 py-1.5 flex items-center space-x-3 text-xs flex-shrink-0">
                  <div className="w-16 px-2 py-0.5 bg-zinc-900 text-zinc-200 border border-zinc-700 rounded text-center font-mono font-bold text-xs select-all">
                    {activeCellCoord}
                  </div>
                  <div className="flex items-center space-x-1 text-zinc-400 font-serif italic font-bold select-none text-sm">
                    <span>fx</span>
                  </div>
                  <div className="h-4 w-px bg-zinc-700"></div>
                  <div className="flex-1 overflow-hidden">
                    <input
                      type="text"
                      readOnly
                      value={activeCellContent}
                      className="w-full bg-zinc-950 text-zinc-200 border border-zinc-800 rounded px-2.5 py-0.5 text-xs font-mono truncate select-all focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                    {filteredLogs.length} rows loaded
                  </span>
                </div>

                {/* 3C. Excel Grid Table */}
                <div className="flex-1 overflow-auto bg-[#17171c]">
                  <table className="w-full border-collapse text-left text-xs font-sans">
                    {/* Header Columns (Letters: A, B, C...) */}
                    <thead className="sticky top-0 bg-[#26262e] z-10 text-zinc-300 select-none shadow-sm">
                      <tr className="border-b border-zinc-700">
                        {/* Excel Row Index Header Corner */}
                        <th className="w-12 bg-[#2d2d37] border-r border-b border-zinc-700 text-center py-2 px-1 font-mono text-[11px] text-zinc-400 font-bold">
                          #
                        </th>
                        
                        {/* Column A: ID */}
                        <th 
                          onClick={() => handleSort("code")}
                          className="w-24 border-r border-zinc-700 px-3 py-2 cursor-pointer hover:bg-zinc-700/50 transition-colors font-medium text-zinc-200"
                        >
                          <div className="flex items-center justify-between">
                            <span>A • Query ID</span>
                            <i data-lucide="arrow-up-down" className="w-3 h-3 text-zinc-500"></i>
                          </div>
                        </th>

                        {/* Column B: Category */}
                        <th 
                          onClick={() => handleSort("category")}
                          className="w-48 border-r border-zinc-700 px-3 py-2 cursor-pointer hover:bg-zinc-700/50 transition-colors font-medium text-zinc-200"
                        >
                          <div className="flex items-center justify-between">
                            <span>B • Category Domain</span>
                            <i data-lucide="arrow-up-down" className="w-3 h-3 text-zinc-500"></i>
                          </div>
                        </th>

                        {/* Column C: Question */}
                        <th 
                          onClick={() => handleSort("question")}
                          className="min-w-[280px] border-r border-zinc-700 px-3 py-2 cursor-pointer hover:bg-zinc-700/50 transition-colors font-medium text-zinc-200"
                        >
                          <div className="flex items-center justify-between">
                            <span>C • Question / Prompt</span>
                            <i data-lucide="arrow-up-down" className="w-3 h-3 text-zinc-500"></i>
                          </div>
                        </th>

                        {/* Column D: Synthesized Answer */}
                        <th className="min-w-[340px] border-r border-zinc-700 px-3 py-2 font-medium text-zinc-200">
                          D • Synthesized LLM Answer
                        </th>

                        {/* Column E: Claims Count */}
                        <th 
                          onClick={() => handleSort("claimsCount")}
                          className="w-24 border-r border-zinc-700 px-3 py-2 text-center cursor-pointer hover:bg-zinc-700/50 transition-colors font-medium text-zinc-200"
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span>E • Claims</span>
                            <i data-lucide="arrow-up-down" className="w-3 h-3 text-zinc-500"></i>
                          </div>
                        </th>

                        {/* Column F: Timestamp */}
                        <th className="w-28 border-r border-zinc-700 px-3 py-2 font-medium text-zinc-200">
                          F • Timestamp
                        </th>

                        {/* Column G: Interactive Action Column */}
                        <th className="w-36 bg-[#202028] px-3 py-2 text-center font-bold text-emerald-400">
                          G • Actions
                        </th>
                      </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody className="divide-y divide-zinc-800 font-mono text-xs">
                      {filteredLogs.map((log, index) => {
                        const isSelected = selectedExcelRowIndex === index;
                        const rowNum = index + 1;
                        const isUncertain = log.category === "Questions where nobody has a clear answer";

                        let badgeColor = "bg-zinc-800 text-zinc-300 border-zinc-700";
                        if (log.category === "Nutrient requirements") badgeColor = "bg-emerald-950/60 text-emerald-400 border-emerald-800/50";
                        else if (log.category === "Food safety and storage") badgeColor = "bg-blue-950/60 text-blue-400 border-blue-800/50";
                        else if (log.category === "Cooking methods") badgeColor = "bg-amber-950/60 text-amber-400 border-amber-800/50";
                        else if (isUncertain) badgeColor = "bg-purple-950/60 text-purple-300 border-purple-800/50";

                        return (
                          <tr
                            key={log.id}
                            onClick={() => {
                              setSelectedExcelRowIndex(index);
                              setActiveCellCoord(`C${rowNum + 1}`);
                              setActiveCellContent(log.question);
                            }}
                            className={`group cursor-pointer transition-colors ${
                              isSelected 
                                ? "bg-emerald-950/25 ring-1 ring-inset ring-emerald-500/60" 
                                : "hover:bg-zinc-850/80 bg-zinc-950/70"
                            }`}
                          >
                            {/* Row Index Number */}
                            <td className="bg-[#24242c] border-r border-zinc-800 text-center py-2.5 px-1 font-mono text-[11px] text-zinc-500 font-bold select-none group-hover:text-zinc-200">
                              {rowNum}
                            </td>

                            {/* Col A: Code */}
                            <td 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExcelRowIndex(index);
                                setActiveCellCoord(`A${rowNum + 1}`);
                                setActiveCellContent(log.code);
                              }}
                              className="border-r border-zinc-800 px-3 py-2.5 font-bold text-zinc-300 group-hover:text-emerald-400 transition-colors"
                            >
                              {log.code}
                            </td>

                            {/* Col B: Category Badge */}
                            <td 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExcelRowIndex(index);
                                setActiveCellCoord(`B${rowNum + 1}`);
                                setActiveCellContent(log.category);
                              }}
                              className="border-r border-zinc-800 px-3 py-2.5 font-sans"
                            >
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
                                {log.category}
                              </span>
                            </td>

                            {/* Col C: Question */}
                            <td 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExcelRowIndex(index);
                                setActiveCellCoord(`C${rowNum + 1}`);
                                setActiveCellContent(log.question);
                              }}
                              className="border-r border-zinc-800 px-3 py-2.5 font-sans text-zinc-100 max-w-xs truncate"
                              title={log.question}
                            >
                              {log.question}
                            </td>

                            {/* Col D: Answer */}
                            <td 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExcelRowIndex(index);
                                setActiveCellCoord(`D${rowNum + 1}`);
                                setActiveCellContent(log.answer);
                              }}
                              className="border-r border-zinc-800 px-3 py-2.5 font-sans text-zinc-400 max-w-sm truncate"
                              title={log.answer}
                            >
                              {log.answer}
                            </td>

                            {/* Col E: Claims Count */}
                            <td 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExcelRowIndex(index);
                                setActiveCellCoord(`E${rowNum + 1}`);
                                setActiveCellContent(`${log.claimsCount} claims`);
                              }}
                              className="border-r border-zinc-800 px-3 py-2.5 text-center font-bold text-emerald-400"
                            >
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                                {log.claimsCount}
                              </span>
                            </td>

                            {/* Col F: Timestamp */}
                            <td 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedExcelRowIndex(index);
                                setActiveCellCoord(`F${rowNum + 1}`);
                                setActiveCellContent(log.timestamp);
                              }}
                              className="border-r border-zinc-800 px-3 py-2.5 text-[11px] text-zinc-500 whitespace-nowrap"
                            >
                              {log.timestamp}
                            </td>

                            {/* Col G: Dedicated Interactive Action Button */}
                            <td className="px-3 py-2.5 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJumpToChatFromLog(log);
                                }}
                                className="w-full inline-flex items-center justify-center space-x-1.5 px-2.5 py-1 text-xs font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded shadow-sm border border-emerald-300 transition-all font-sans"
                                title={`Jump directly to the conversation for ${log.code}`}
                              >
                                <span>Open in Chat</span>
                                <i data-lucide="arrow-up-right" className="w-3.5 h-3.5 stroke-[2.5]"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {filteredLogs.length === 0 && (
                    <div className="p-12 text-center text-zinc-500 font-sans">
                      <i data-lucide="file-x" className="w-8 h-8 mx-auto mb-2 text-zinc-600"></i>
                      <p className="text-sm">No rows matched your search or category filter in this sheet</p>
                    </div>
                  )}
                </div>

                {/* 3D. Excel Bottom Sheet Tab Bar */}
                <div className="bg-[#1f1f26] border-t border-zinc-800 px-4 py-1.5 flex items-center justify-between text-xs text-zinc-400 flex-shrink-0">
                  <div className="flex items-center space-x-1">
                    <button className="px-2 py-1 text-zinc-400 hover:text-white">
                      <i data-lucide="chevron-left" className="w-3.5 h-3.5"></i>
                    </button>
                    <button className="px-2 py-1 text-zinc-400 hover:text-white">
                      <i data-lucide="chevron-right" className="w-3.5 h-3.5"></i>
                    </button>
                    
                    {/* Active Sheet Tab */}
                    <div className="flex items-center space-x-1.5 bg-zinc-900 border-t-2 border-emerald-500 border-x border-zinc-700 px-3 py-1 text-zinc-100 font-semibold rounded-t text-xs">
                      <i data-lucide="sheet" className="w-3.5 h-3.5 text-emerald-400"></i>
                      <span>All Nutrition Inquiries</span>
                    </div>

                    <button 
                      onClick={() => setMainNav("logs")}
                      className="px-3 py-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors text-xs"
                    >
                      Domain Card View
                    </button>
                  </div>

                  <div className="flex items-center space-x-4 text-[11px] text-zinc-400 font-mono">
                    <span>Selected: {activeCellCoord}</span>
                    <span>Total Rows: {filteredLogs.length}</span>
                    <span className="text-emerald-400 font-sans font-medium hidden sm:inline">● READY</span>
                  </div>
                </div>
              </main>
            )}

          </div>
        </div>
      );
    }

    export default function NutritionBotAppWrapper() {
      const [mounted, setMounted] = useState(false);
      useEffect(() => { setMounted(true); }, []);
      if (!mounted) return null;
      return <NutritionBotApp />;
    }
