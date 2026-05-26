"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { ShieldAlert } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("nexus_session");
    if (!session) {
      router.push("/login");
    } else {
      setAuthenticated(true);
    }
  }, []);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-500 font-mono text-xs">
        <ShieldAlert className="w-8 h-8 text-accent-cyan animate-pulse-slow" />
        <span>Authorizing telemetry node settings...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      
      {/* 1. Left System Sidebar */}
      <Sidebar />

      {/* Main Dashboard wrapper */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Header bar */}
        <Header title="LLMOps Metrics Dashboard" />

        {/* 2. Scrollable Analytics Panel */}
        <AnalyticsDashboard />
        
      </div>
    </div>
  );
}
