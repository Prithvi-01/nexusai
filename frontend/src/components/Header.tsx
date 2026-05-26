"use client";

import { useRouter } from "next/navigation";
import { LogOut, Shield, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const router = useRouter();
  const [onlineStatus, setOnlineStatus] = useState<"CONNECTED" | "OFFLINE">("OFFLINE");

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await api.getModels();
        setOnlineStatus(res.ollama_connection);
      } catch {
        setOnlineStatus("OFFLINE");
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("nexus_session");
    router.push("/login");
  };

  return (
    <header className="h-16 border-b border-slate-900 bg-slate-950/40 backdrop-blur-md px-6 flex items-center justify-between">
      {/* Page Breadcrumb */}
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-accent-cyan" />
        <span className="text-slate-600 text-xs font-mono">/</span>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">{title}</h2>
      </div>

      {/* Control Actions / Nodes */}
      <div className="flex items-center gap-4">
        {/* Node status indicators */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800/80 text-[11px] font-mono">
          {onlineStatus === "CONNECTED" ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-accent-emerald animate-pulse-slow" />
              <span className="text-slate-300">CORE NODE: ONLINE</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-500" />
              <span className="text-red-500">CORE NODE: DISCONNECTED</span>
            </>
          )}
        </div>

        {/* Security / Admin actions */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-500/20 transition-all"
          title="Sign Out Session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit Session</span>
        </button>
      </div>
    </header>
  );
}
