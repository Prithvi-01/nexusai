import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-outfit"
});

export const metadata: Metadata = {
  title: "NexusAI - Enterprise Multi-LLM Orchestrator & RAG Platform",
  description: "A completely local, cost-free Multi-LLM routing, semantic caching, local document RAG, and LLMOps telemetry platform for AI Engineers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;500;700&family=Outfit:wght@300;400;500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className={`${outfit.variable} font-sans antialiased bg-slate-950 text-slate-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
