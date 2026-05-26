"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Shield, AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    const session = localStorage.getItem("nexus_session");
    if (session) {
      router.push("/chat");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || loading) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isRegistering) {
        await api.register(username, password);
        setSuccess("Registration successful! Initiating login...");
        // Auto-login after registration
        const loginData = await api.login(username, password);
        localStorage.setItem("nexus_session", JSON.stringify(loginData));
        setTimeout(() => router.push("/chat"), 1000);
      } else {
        const loginData = await api.login(username, password);
        localStorage.setItem("nexus_session", JSON.stringify(loginData));
        router.push("/chat");
      }
    } catch (err: any) {
      setError(err.message || "Authentication process failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative p-6 bg-slate-950 overflow-hidden">
      {/* Background Neon Glow Circles */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-accent-cyan/10 filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent-emerald/10 filter blur-3xl pointer-events-none" />

      {/* Cyber Grid Pattern Background Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20 pointer-events-none" />

      {/* Auth Card */}
      <div className="w-full max-w-md glass-panel-cyan p-8 rounded-2xl border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-10 space-y-6 relative">
        
        {/* Brand Logo */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-tr from-accent-emerald to-accent-cyan flex items-center justify-center font-black text-2xl text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            N
          </div>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-wider">NEXUS<span className="text-accent-cyan">AI</span></h1>
            <span className="text-[10px] text-slate-500 font-mono tracking-widest block uppercase mt-0.5">Enterprise Orchestration Gate</span>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Operator Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-cyan font-mono"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Access Key Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-cyan font-mono"
              />
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs flex gap-2 items-center">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl border border-accent-emerald/20 bg-accent-emerald/5 text-accent-emerald text-xs">
              <span>{success}</span>
            </div>
          )}

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-cyan to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>Processing Encryption...</span>
              </>
            ) : (
              <span>{isRegistering ? "Confirm Registration" : "Authenticate Terminal"}</span>
            )}
          </button>
        </form>

        {/* Toggle between register and login */}
        <div className="text-center pt-2">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError("");
              setSuccess("");
            }}
            className="text-xs text-slate-500 hover:text-accent-cyan transition-colors"
          >
            {isRegistering 
              ? "Already an authorized operator? Login here" 
              : "Register new local operator profile"}
          </button>
        </div>

        {/* Bottom Security Info Tag */}
        <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-600 font-mono tracking-widest uppercase">
          <Shield className="w-3 h-3 text-accent-emerald" />
          <span>Local SQLite Node Secured</span>
        </div>
      </div>
    </main>
  );
}
