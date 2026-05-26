"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Sliders, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface DocumentUploaderProps {
  onUploadSuccess?: () => void;
}

export default function DocumentUploader({ onUploadSuccess }: DocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [chunkSize, setChunkSize] = useState(800);
  const [chunkOverlap, setChunkOverlap] = useState(150);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setStatus("idle");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus("idle");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus("idle");
    try {
      await api.uploadDocument(file, chunkSize, chunkOverlap);
      setStatus("success");
      setMessage(`Successfully queued background parsing for ${file.name}`);
      setFile(null);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Failed to ingest document");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass-panel-cyan p-6 rounded-2xl border border-slate-800/80 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
          <Upload className="w-4 h-4 text-accent-cyan" />
          RAG Pipeline Ingestion
        </h3>
        <p className="text-xs text-slate-400 mt-1">Ingest local knowledge to augment prompt context using semantic lookup maps.</p>
      </div>

      {/* Drag & Drop File Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`border border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:bg-slate-900/40 ${
          file 
            ? "border-accent-cyan/60 bg-accent-cyan/5" 
            : "border-slate-800 hover:border-slate-700 bg-slate-950/20"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.docx,.txt,.md,.json"
          className="hidden"
        />
        {file ? (
          <>
            <FileText className="w-10 h-10 text-accent-cyan animate-pulse-slow" />
            <div className="text-center">
              <span className="text-xs font-semibold text-white block max-w-[200px] truncate">{file.name}</span>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                {Math.round(file.size / 1024)} KB
              </span>
            </div>
          </>
        ) : (
          <>
            <Upload className="w-10 h-10 text-slate-600 group-hover:text-accent-cyan" />
            <div className="text-center">
              <span className="text-xs text-slate-300 font-medium block">Drag & Drop knowledge file</span>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">PDF, DOCX, TXT, MD or JSON</span>
            </div>
          </>
        )}
      </div>

      {/* Parsing Parameters */}
      <div className="space-y-4 pt-2 border-t border-slate-900">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Sliders className="w-3.5 h-3.5 text-accent-cyan" />
          <span>Ingest Tuning Configurations</span>
        </div>

        {/* Chunk Size slider */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1.5">
            <span>Recursive Chunk Size</span>
            <span className="text-accent-cyan font-bold">{chunkSize} chars</span>
          </div>
          <input
            type="range"
            min="200"
            max="2000"
            step="50"
            value={chunkSize}
            onChange={(e) => setChunkSize(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-accent-cyan"
          />
        </div>

        {/* Chunk Overlap slider */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1.5">
            <span>Recursive Chunk Overlap</span>
            <span className="text-accent-cyan font-bold">{chunkOverlap} chars</span>
          </div>
          <input
            type="range"
            min="50"
            max="500"
            step="10"
            value={chunkOverlap}
            onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-accent-cyan"
          />
        </div>
      </div>

      {/* API Action button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
          file && !uploading
            ? "bg-gradient-to-r from-accent-cyan to-blue-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:brightness-110"
            : "bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800/60"
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Ingesting Vectors...</span>
          </>
        ) : (
          <span>Execute Ingestion</span>
        )}
      </button>

      {/* Response Messages */}
      {status !== "idle" && (
        <div className={`p-3 rounded-xl border flex gap-3 text-xs ${
          status === "success" 
            ? "bg-accent-emerald/5 border-accent-emerald/30 text-accent-emerald" 
            : "bg-red-500/5 border-red-500/30 text-red-400"
        }`}>
          {status === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="leading-normal">{message}</span>
        </div>
      )}
    </div>
  );
}
