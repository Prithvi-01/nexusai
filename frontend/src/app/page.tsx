"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect directly to chat console dashboard
    router.push("/chat");
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-500 font-mono text-xs">
      <Loader2 className="w-6 h-6 text-accent-cyan animate-spin" />
      <span>Bootstrapping NexusAI console...</span>
    </div>
  );
}
