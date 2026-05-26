"use client";

import { useEffect, useState } from "react";
import { 
  BarChart, Bar, 
  LineChart, Line, 
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { 
  Activity, 
  Zap, 
  Clock, 
  Layers, 
  Search, 
  RefreshCw, 
  Database,
  ArrowRight,
  DatabaseIcon,
  CheckCircle,
  FileText
} from "lucide-react";
import { api } from "@/lib/api";

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [mounted, setMounted] = useState(false);

  // Prevent SSR hydration mismatch for Recharts
  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getMetrics();
      setMetrics(data);
      const logData = await api.getLogs();
      setLogs(logData);
    } catch (err) {
      console.error("Could not fetch metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  // Filter logs based on search term
  const filteredLogs = logs.filter(log => 
    log.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.model_used.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.intent.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Custom colors for charts
  const COLORS = ["#10b981", "#06b6d4", "#f59e0b", "#6366f1", "#ec4899"];

  // Process model distribution for Pie chart
  const modelPieData = metrics?.model_distribution 
    ? Object.keys(metrics.model_distribution).map(key => ({
        name: key,
        value: metrics.model_distribution[key]
      }))
    : [];

  // Process intent distribution for Bar chart
  const intentBarData = metrics?.intent_distribution
    ? Object.keys(metrics.intent_distribution).map(key => ({
        name: key.toUpperCase(),
        requests: metrics.intent_distribution[key]
      }))
    : [];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar">
      {/* Title / Sync Control */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-wide text-white uppercase flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent-cyan" />
            LLMOps Telemetry Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">Real-time inference profiling, intent allocation, and cache efficiency metrics.</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 text-xs font-bold text-accent-cyan hover:text-cyan-400 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl transition-all hover:border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Telemetry</span>
        </button>
      </div>

      {/* KPI Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block">Total Inference requests</span>
            <span className="text-2xl font-black text-white font-mono">{metrics?.total_requests || 0}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800">
            <Zap className="w-5 h-5 text-accent-cyan animate-pulse-slow" />
          </div>
        </div>

        {/* Avg Latency */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block">Average Latency</span>
            <span className="text-2xl font-black text-white font-mono">{metrics?.avg_latency_ms || 0} <span className="text-xs text-slate-500 font-normal font-sans">ms</span></span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800">
            <Clock className="w-5 h-5 text-accent-emerald animate-pulse-slow" />
          </div>
        </div>

        {/* Cache Hit % */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block">Semantic Cache efficiency</span>
            <span className="text-2xl font-black text-white font-mono">
              {metrics?.cache_hit_rate ? `${Math.round(metrics.cache_hit_rate * 100)}%` : "0%"}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800">
            <Database className="w-5 h-5 text-yellow-500 animate-pulse-slow" />
          </div>
        </div>

        {/* Ingested Docs */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block">Ingested Document Corpus</span>
            <span className="text-2xl font-black text-white font-mono">{metrics?.document_count || 0} <span className="text-xs text-slate-500 font-normal font-sans">files</span></span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800">
            <FileText className="w-5 h-5 text-purple-500 animate-pulse-slow" />
          </div>
        </div>
      </div>

      {/* Visual Charting Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Throughput Timeline (Large) */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">Throughput vs Latency Timeline</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Performance tracking and volume load indicators.</p>
          </div>
          <div className="h-64">
            {metrics?.timeline_data && metrics.timeline_data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.timeline_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#06b6d4" fontSize={10} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0b1329", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }} />
                  <Line yAxisId="left" type="monotone" dataKey="requests" stroke="#06b6d4" strokeWidth={2} activeDot={{ r: 6 }} name="Total Requests" />
                  <Line yAxisId="right" type="monotone" dataKey="avg_latency_ms" stroke="#10b981" strokeWidth={2} name="Avg Latency (ms)" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono">No data logged</div>
            )}
          </div>
        </div>

        {/* Model Distribution (Pie Chart) */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">Model Utilization Share</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Distribution of routed requests by Ollama tag.</p>
          </div>
          <div className="h-64 flex flex-col items-center justify-center">
            {modelPieData.length > 0 ? (
              <>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modelPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {modelPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#0b1329", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
                  {modelPieData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span>{item.name} ({item.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-slate-600 text-xs font-mono">No active nodes registered</div>
            )}
          </div>
        </div>

        {/* Intent Categorization (Horizontal Bar Chart) */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 lg:col-span-3 space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">Semantic Intent Allocations</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Classification counts compiled by prompt regex/vector triggers.</p>
          </div>
          <div className="h-48">
            {intentBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={intentBarData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#0b1329", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }} />
                  <Bar dataKey="requests" fill="#06b6d4" radius={[0, 4, 4, 0]} name="Classified Triggers">
                    {intentBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono">No classifications recorded</div>
            )}
          </div>
        </div>
      </div>

      {/* Trace Log Audit Board */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">Platform Transaction Audit Logs</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Searchable telemetry logs for query execution traces.</p>
          </div>
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search prompt, model, or intent..."
              className="bg-slate-950 border border-slate-800/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-accent-cyan font-mono w-full sm:w-64"
            />
          </div>
        </div>

        {/* Tabular logs list */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-850 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Prompt preview</th>
                <th className="py-3 px-4">Intent</th>
                <th className="py-3 px-4">Model Routed</th>
                <th className="py-3 px-4 text-right">Latency</th>
                <th className="py-3 px-4 text-right">Tokens</th>
                <th className="py-3 px-4 text-center">Cache</th>
                <th className="py-3 px-4 text-center">Fallback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 text-xs text-slate-300 font-mono">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/30 transition-colors">
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4 max-w-[220px] truncate text-slate-200 font-sans" title={log.prompt}>
                    {log.prompt}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-slate-800">
                      {log.intent.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-accent-cyan">{log.model_used}</td>
                  <td className={`py-3 px-4 text-right font-bold ${
                    log.latency_ms < 50 ? 'text-accent-emerald' : log.latency_ms < 1500 ? 'text-slate-300' : 'text-yellow-500'
                  }`}>
                    {log.latency_ms} <span className="text-[9px] font-normal text-slate-500">ms</span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400">{log.tokens_estimate}</td>
                  <td className="py-3 px-4 text-center">
                    {log.cache_hit ? (
                      <span className="bg-accent-emerald/10 border border-accent-emerald/20 text-accent-emerald text-[9px] font-bold px-1.5 py-0.5 rounded">HIT</span>
                    ) : (
                      <span className="text-slate-600 text-[9px]">MISS</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {log.fallback_used ? (
                      <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[9px] font-bold px-1.5 py-0.5 rounded">YES</span>
                    ) : (
                      <span className="text-slate-600 text-[9px]">NO</span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-600">
                    No matching traces recorded. Run queries in the chat console first!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
