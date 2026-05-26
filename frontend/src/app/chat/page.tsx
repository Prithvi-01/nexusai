"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ChatConsole from "@/components/ChatConsole";
import DocumentUploader from "@/components/DocumentUploader";
import { Database, ShieldAlert } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [uploaderRefreshKey, setUploaderRefreshKey] = useState(0);

  useEffect(() => {
    // Standard client session check
    const session = localStorage.getItem("nexus_session");
    if (!session) {
      router.push("/login");
    } else {
      setAuthenticated(true);
    }
  }, []);

  const handleSelectDocument = (docId: number | null) => {
    setSelectedDocId(docId);
  };

  const handleUploadSuccess = () => {
    // Increment key to trigger sidebar file list reload dynamically
    setUploaderRefreshKey(prev => prev + 1);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-500 font-mono text-xs">
        <ShieldAlert className="w-8 h-8 text-accent-cyan animate-pulse-slow" />
        <span>Authorizing local workspace environment...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      
      {/* 1. Left System Sidebar */}
      <Sidebar 
        key={uploaderRefreshKey} 
        onSelectDocument={handleSelectDocument} 
        selectedDocId={selectedDocId} 
      />

      {/* Main Console wrapper (Center + Right) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Header bar */}
        <Header title="AI Operations Chat Console" />

        {/* Console Workspace (Two columns) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* 2. Middle Interactive Chat Window */}
          <ChatConsole selectedDocId={selectedDocId} />

          {/* 3. Right RAG Ingestion & Pipeline tuning Sidebar */}
          <div className="w-80 border-l border-slate-900 bg-slate-950/60 p-6 flex flex-col gap-6 overflow-y-auto hidden xl:flex">
            <div>
              <h4 className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-3">Context Source Scope</h4>
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Database className="w-4 h-4 text-accent-emerald" />
                  <span>
                    {selectedDocId === null ? "Global Corpus" : "Anchored Document"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  {selectedDocId === null 
                    ? "Inquiries search across all ingested document vector databases concurrently."
                    : "Inquiries are strictly limited to vector chunks of the selected source document."}
                </p>
              </div>
            </div>

            {/* Document uploader card */}
            <DocumentUploader onUploadSuccess={handleUploadSuccess} />
          </div>

        </div>
      </div>
    </div>
  );
}
