"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Cpu, 
  Clock, 
  Coins, 
  BookmarkCheck, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Settings, 
  Sparkles,
  Zap
} from "lucide-react";
import { api, ChatMessage } from "@/lib/api";

interface ChatConsoleProps {
  selectedDocId: number | null;
}

export default function ChatConsole({ selectedDocId }: ChatConsoleProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [modelOverride, setModelOverride] = useState<string>("auto");
  const [showSettings, setShowSettings] = useState(false);
  const [activeMetadata, setActiveMetadata] = useState<any>(null);
  const [activeCitations, setActiveCitations] = useState<any[]>([]);
  const [openCitationsIndex, setOpenCitationsIndex] = useState<number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userQuery = input;
    setInput("");
    setLoading(true);
    setActiveMetadata(null);
    setActiveCitations([]);

    // 1. Add user query to thread
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userQuery }
    ];
    setMessages(newMessages);

    // 2. Add placeholder assistant response
    const assistantIndex = newMessages.length;
    setMessages(prev => [
      ...prev,
      { 
        role: "assistant", 
        content: "", 
        model_used: "Processing...", 
        citations: [] 
      }
    ]);

    let incomingText = "";
    
    try {
      // 3. Initiate API stream connection
      await api.chatStream(
        userQuery,
        selectedDocId,
        modelOverride === "auto" ? null : modelOverride,
        // Metadata callback
        (meta) => {
          setActiveMetadata(meta);
          setMessages(prev => {
            const updated = [...prev];
            updated[assistantIndex] = {
              ...updated[assistantIndex],
              model_used: meta.model_used,
              fallback_used: meta.fallback_used,
              cache_hit: meta.cache_hit
            };
            return updated;
          });
        },
        // Citations callback
        (citations) => {
          setActiveCitations(citations);
          setMessages(prev => {
            const updated = [...prev];
            updated[assistantIndex] = {
              ...updated[assistantIndex],
              citations: citations
            };
            return updated;
          });
        },
        // Chunk callback
        (chunk) => {
          incomingText += chunk;
          setMessages(prev => {
            const updated = [...prev];
            updated[assistantIndex] = {
              ...updated[assistantIndex],
              content: incomingText
            };
            return updated;
          });
        },
        // Done callback
        (fullText) => {
          setLoading(false);
        },
        // Error callback
        (err) => {
          setLoading(false);
          setMessages(prev => {
            const updated = [...prev];
            updated[assistantIndex] = {
              ...updated[assistantIndex],
              content: `Error connecting to model socket: ${err.message || "Is Ollama offline?"}`,
              model_used: "Error"
            };
            return updated;
          });
        }
      );
    } catch (err: any) {
      setLoading(false);
      console.error(err);
    }
  };

  const toggleCitations = (idx: number) => {
    setOpenCitationsIndex(openCitationsIndex === idx ? null : idx);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/20 overflow-hidden relative">
      {/* Dynamic Background Mesh glow */}
      <div className="cyber-glow top-1/4 left-1/3" />
      <div className="cyber-glow bottom-1/4 right-1/4 bg-gradient-radial from-accent-cyan/10 to-transparent" />

      {/* Chat Sub-Header / Custom Router settings */}
      <div className="p-4 border-b border-slate-900 bg-slate-950/30 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent-emerald animate-pulse-slow" />
          <span className="text-xs font-semibold text-slate-300">
            {selectedDocId !== null ? "RAG Pipeline Active: Anchored Search" : "Corpus Search Mode: General Knowledge"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick parameter overrides */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-mono text-[10px]">ROUTING INSTRUCTION:</span>
            <select
              value={modelOverride}
              onChange={(e) => setModelOverride(e.target.value)}
              className="bg-slate-900/80 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-accent-emerald cursor-pointer font-mono"
            >
              <option value="auto">⚡ AUTO-CLASSIFY ROUTE</option>
              <option value="llama3">🧠 LLAMA3 (Reasoning)</option>
              <option value="mistral">💻 MISTRAL (Coding)</option>
              <option value="phi3">📝 PHI3 (Summarization)</option>
              <option value="gemma">🔑 GEMMA (Extraction)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages Thread list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10 scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.1)]">
              <Zap className="w-8 h-8 text-accent-cyan animate-pulse-slow" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-200">System Ready for Queries</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Submit coding tasks, extraction requests, summarizations, or logical proofs. NexusAI will dynamically route your prompt to the best local node, profile its latency, and update the semantic cache on completion.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            } animate-fade-in`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-5 border text-sm transition-all ${
                msg.role === "user"
                  ? "bg-slate-900/60 border-slate-800 text-slate-100 rounded-tr-none shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                  : "glass-panel border-slate-850 rounded-tl-none text-slate-300"
              }`}
            >
              {/* Message Header Indicators (For Assistant replies only) */}
              {msg.role === "assistant" && (
                <div className="flex flex-wrap items-center gap-3 border-b border-slate-900 pb-3 mb-3 text-[10px] font-mono text-slate-500">
                  <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                    <Cpu className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>NODE: {msg.model_used}</span>
                  </div>

                  {msg.cache_hit && (
                    <div className="flex items-center gap-1 bg-accent-emerald/10 px-2 py-0.5 rounded border border-accent-emerald/20 text-accent-emerald font-bold">
                      <BookmarkCheck className="w-3.5 h-3.5" />
                      <span>SEMANTIC CACHE HIT</span>
                    </div>
                  )}

                  {msg.fallback_used && (
                    <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 text-yellow-500 font-bold">
                      <span>FALLBACK APPLIED</span>
                    </div>
                  )}

                  {!msg.cache_hit && msg.model_used !== "Processing..." && (
                    <>
                      <div className="flex items-center gap-1 bg-slate-900/50 px-2 py-0.5 rounded text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>LATENCY SCANNING</span>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-900/50 px-2 py-0.5 rounded text-slate-400">
                        <Coins className="w-3.5 h-3.5 text-slate-500" />
                        <span>EST. TOKENS</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Message Content Body */}
              <div className="whitespace-pre-wrap leading-relaxed select-text font-sans">
                {msg.content === "" ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="w-2 h-2 bg-accent-cyan rounded-full animate-ping" />
                    <span className="font-mono text-xs">Awaiting inference...</span>
                  </div>
                ) : (
                  msg.content
                )}
              </div>

              {/* Citation drawer for RAG context */}
              {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-900/60">
                  <button
                    onClick={() => toggleCitations(idx)}
                    className="flex items-center gap-1.5 text-accent-cyan hover:text-cyan-400 text-xs font-semibold focus:outline-none transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>
                      {openCitationsIndex === idx 
                        ? "Hide Search Citations" 
                        : `View ${msg.citations.length} Ingestion Citations`}
                    </span>
                    {openCitationsIndex === idx ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {openCitationsIndex === idx && (
                    <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {msg.citations.map((cite: any, citeIdx: number) => (
                        <div 
                          key={citeIdx} 
                          className="bg-slate-950/60 border border-slate-900/80 rounded-xl p-3 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-accent-cyan truncate max-w-[200px]" title={cite.metadata.filename}>
                              📄 {cite.metadata.filename}
                            </span>
                            <span className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-500">
                              SIMILARITY: {Math.round(cite.score * 100)}%
                            </span>
                          </div>
                          <p className="text-slate-400 leading-normal bg-slate-900/20 p-2 rounded border border-slate-900/20 italic">
                            "{cite.text}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="glass-panel border-slate-850 rounded-2xl rounded-tl-none p-5 flex items-center gap-3 text-slate-400 text-xs">
              <span className="w-2.5 h-2.5 bg-accent-emerald rounded-full animate-ping" />
              <span className="font-mono text-slate-500">Orchestrator streaming tokens...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input panel drawer */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/40 backdrop-blur-md z-10">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder={
              selectedDocId !== null 
                ? "Ask anything about this document... (RAG Active)" 
                : "Enter prompt (reasoning, code, summarize, parse)..."
            }
            className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent-emerald focus:ring-1 focus:ring-accent-emerald transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className={`px-4 rounded-xl flex items-center justify-center transition-all ${
              input.trim() && !loading
                ? "bg-gradient-to-r from-accent-emerald to-accent-cyan text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:brightness-110"
                : "bg-slate-900 text-slate-600 border border-slate-850 cursor-not-allowed"
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <span className="text-[10px] text-slate-600 font-mono text-center block mt-2 tracking-wide uppercase">
          Local Multi-LLM Orchestration Engine • SQLite Logging Active • SentenceTransformer CPU Ingestions
        </span>
      </div>
    </div>
  );
}
