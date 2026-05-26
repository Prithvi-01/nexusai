// API Service Client for backend connection

const getBackendUrl = () => {
  // If running in browser and on AWS / Production reverse proxy, use relative paths
  if (typeof window !== "undefined") {
    if (window.location.port === "" || window.location.port === "80") {
      return "/api";
    }
  }
  // Local development default
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
};

export const API_BASE = getBackendUrl();

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  model_used?: string;
  latency_ms?: number;
  cache_hit?: boolean;
  fallback_used?: boolean;
  citations?: Array<{
    text: string;
    score: number;
    metadata: {
      filename: string;
      chunk_index: number;
    };
  }>;
}

export const api = {
  // Auth REST routes
  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Authentication failed");
    }
    return res.json();
  },

  async register(username: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Registration failed");
    }
    return res.json();
  },

  // Document Ingestion
  async getDocuments() {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error("Failed to fetch documents catalog");
    return res.json();
  },

  async uploadDocument(file: File, chunkSize: number = 800, chunkOverlap: number = 150) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chunk_size", chunkSize.toString());
    formData.append("chunk_overlap", chunkOverlap.toString());

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Upload failed");
    }
    return res.json();
  },

  async deleteDocument(id: number) {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Purge failed");
    return res.json();
  },

  // Models online check
  async getModels() {
    const res = await fetch(`${API_BASE}/models`);
    if (!res.ok) throw new Error("Failed to scan models status");
    return res.json();
  },

  // Observability & Audits
  async getMetrics() {
    const res = await fetch(`${API_BASE}/metrics`);
    if (!res.ok) throw new Error("Failed to fetch LLMOps metrics");
    return res.json();
  },

  async getLogs() {
    const res = await fetch(`${API_BASE}/logs`);
    if (!res.ok) throw new Error("Failed to load audit traces");
    return res.json();
  },

  // Streaming RAG Chat Ingestion
  async chatStream(
    prompt: string,
    documentId: number | null,
    customModel: string | null,
    onMetadata: (meta: { model_used: string; fallback_used: boolean; cache_hit?: boolean }) => void,
    onCitations: (citations: any[]) => void,
    onChunk: (chunk: string) => void,
    onDone: (fullText: string) => void,
    onError: (err: any) => void
  ) {
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          stream: true,
          document_id: documentId,
          custom_model: customModel,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "FastAPI connection failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Browser streaming unsupported on this endpoint");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the incomplete last line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.startsWith("__metadata__:")) {
            const metaStr = line.replace("__metadata__:", "").trim();
            const meta = JSON.parse(metaStr);
            onMetadata(meta);
          } else if (line.startsWith("__citations__:")) {
            const citStr = line.replace("__citations__:", "").trim();
            const citations = JSON.parse(citStr);
            onCitations(citations);
          } else {
            // Standard answer tokens
            onChunk(line);
            accumulatedText += line;
          }
        }
      }

      // Read remaining buffer
      if (buffer.trim()) {
        if (!buffer.startsWith("__metadata__:") && !buffer.startsWith("__citations__:")) {
          onChunk(buffer);
          accumulatedText += buffer;
        }
      }

      onDone(accumulatedText);
    } catch (err: any) {
      console.error("Streaming error in api.ts:", err);
      onError(err);
    }
  },
};
