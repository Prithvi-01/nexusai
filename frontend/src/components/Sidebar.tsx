"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Database, 
  MessageSquare, 
  LayoutDashboard, 
  Cpu, 
  FileText, 
  Trash2, 
  RefreshCw, 
  ServerCrash,
  AlertCircle
} from "lucide-react";
import { api } from "@/lib/api";

interface SidebarProps {
  onSelectDocument?: (docId: number | null) => void;
  selectedDocId?: number | null;
}

export default function Sidebar({ onSelectDocument, selectedDocId }: SidebarProps) {
  const pathname = usePathname();
  const [documents, setDocuments] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [ollamaConnected, setOllamaConnected] = useState("OFFLINE");

  const loadSidebarData = async () => {
    setLoadingDocs(true);
    setLoadingModels(true);
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error("Could not load documents:", err);
    } finally {
      setLoadingDocs(false);
    }

    try {
      const modelStatus = await api.getModels();
      setModels(modelStatus.orchestrated_models || []);
      setOllamaConnected(modelStatus.ollama_connection);
    } catch (err) {
      console.error("Could not load models:", err);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    loadSidebarData();
    // Poll for status updates every 10 seconds (standard LLMOps practice)
    const interval = setInterval(loadSidebarData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteDoc = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document? This will purge all vectors in ChromaDB!")) return;
    try {
      await api.deleteDocument(id);
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      if (selectedDocId === id && onSelectDocument) {
        onSelectDocument(null);
      }
    } catch (err) {
      alert("Failed to delete document: " + err);
    }
  };

  return (
    <aside className="w-80 border-r border-slate-800 bg-slate-950/80 backdrop-blur-md flex flex-col h-screen overflow-hidden">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <Link href="/chat" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-accent-emerald to-accent-cyan flex items-center justify-center font-bold text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            N
          </div>
          <div>
            <h1 className="font-extrabold tracking-wider text-lg text-white">NEXUS<span className="text-accent-cyan">AI</span></h1>
            <span className="text-[10px] text-slate-500 font-mono tracking-widest block">LLMOPS ORCHESTRATOR</span>
          </div>
        </Link>
        <button 
          onClick={loadSidebarData} 
          className="text-slate-500 hover:text-accent-emerald transition-colors"
          title="Sync Node Status"
        >
          <RefreshCw className={`w-4.5 h-4.5 ${(loadingDocs || loadingModels) ? 'animate-spin text-accent-emerald' : ''}`} />
        </button>
      </div>

      {/* Nav Menu */}
      <nav className="p-4 space-y-1">
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block px-3 mb-2">Navigation</span>
        
        <Link 
          href="/chat" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            pathname === "/chat" 
              ? "bg-gradient-to-r from-accent-emerald/10 to-accent-cyan/10 text-white border-l-2 border-accent-emerald" 
              : "text-slate-400 hover:bg-slate-900/60 hover:text-white"
          }`}
        >
          <MessageSquare className="w-5 h-5 text-accent-emerald" />
          <span>Chat Console</span>
        </Link>

        <Link 
          href="/dashboard" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            pathname === "/dashboard" 
              ? "bg-gradient-to-r from-accent-emerald/10 to-accent-cyan/10 text-white border-l-2 border-accent-cyan" 
              : "text-slate-400 hover:bg-slate-900/60 hover:text-white"
          }`}
        >
          <LayoutDashboard className="w-5 h-5 text-accent-cyan" />
          <span>LLMOps Dashboard</span>
        </Link>
      </nav>

      {/* Model Health Monitor */}
      <div className="p-4 border-t border-slate-900 flex-1 overflow-y-auto space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Local LLM Node</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              ollamaConnected === "CONNECTED" ? "bg-accent-emerald/10 text-accent-emerald" : "bg-red-500/10 text-red-500"
            }`}>
              {ollamaConnected === "CONNECTED" ? "ACTIVE" : "OFFLINE"}
            </span>
          </div>

          <div className="space-y-1.5">
            {models.map((model) => (
              <div key={model.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800/40 text-xs">
                <div className="flex items-center gap-2">
                  <Cpu className={`w-3.5 h-3.5 ${model.pulled ? 'text-accent-emerald' : 'text-slate-600'}`} />
                  <span className="font-mono text-slate-300 font-semibold">{model.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${model.pulled ? 'bg-accent-emerald animate-pulse-slow' : 'bg-red-500'}`} />
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">{model.status}</span>
                </div>
              </div>
            ))}
            {models.length === 0 && (
              <div className="text-center p-3 rounded-lg border border-dashed border-slate-800 text-slate-500 text-xs flex flex-col items-center gap-1">
                <ServerCrash className="w-5 h-5 text-slate-600" />
                <span>Ollama daemon unreachable</span>
              </div>
            )}
          </div>
        </div>

        {/* Vector DB / Document Index Catalog */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Ingested Documents</span>
            <span className="text-[10px] text-slate-400 font-mono">({documents.length})</span>
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {onSelectDocument && (
              <button
                onClick={() => onSelectDocument(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between border transition-all ${
                  selectedDocId === null
                    ? "bg-accent-emerald/10 border-accent-emerald/30 text-white font-medium shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                    : "bg-slate-900/20 border-slate-800/60 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5" />
                  <span>Search Global Corpus</span>
                </div>
              </button>
            )}

            {documents.map((doc) => {
              const isSelected = selectedDocId === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDocument && onSelectDocument(doc.id)}
                  className={`group relative px-3 py-2 rounded-lg text-xs border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-accent-cyan/15 border-accent-cyan/40 text-white font-medium shadow-[0_0_10px_rgba(6,182,212,0.05)]"
                      : "bg-slate-900/40 border-slate-800/40 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-4">
                    <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${doc.status === "COMPLETED" ? 'text-accent-cyan' : doc.status === "PROCESSING" ? 'text-yellow-500' : 'text-red-500'}`} />
                    <span className="truncate text-slate-300" title={doc.filename}>{doc.filename}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.status === "PROCESSING" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping" />
                    )}
                    {doc.status === "FAILED" && (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" title="Ingestion Failed" />
                    )}
                    <span className="text-[9px] text-slate-500 font-mono">
                      {doc.chunk_count > 0 ? `${doc.chunk_count}c` : "..."}
                    </span>
                    <button
                      onClick={(e) => handleDeleteDoc(doc.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-500 transition-opacity p-0.5"
                      title="Purge Document Index"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {documents.length === 0 && (
              <div className="text-center p-6 border border-dashed border-slate-900 rounded-lg text-slate-500 text-xs">
                No active vector documents. Upload one in the upload drawer.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Context Info */}
      <div className="p-4 border-t border-slate-900 bg-slate-950 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 border border-slate-700">
          U
        </div>
        <div className="flex-1 overflow-hidden">
          <span className="font-semibold text-xs text-white block">AI / GenAI Engineer</span>
          <span className="text-[10px] text-slate-500 font-mono truncate block">local_admin@nexus.ai</span>
        </div>
      </div>
    </aside>
  );
}
