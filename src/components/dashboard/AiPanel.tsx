"use client";

import { useState } from "react";
import { Send, Bot, User, Sparkles, RefreshCw } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function AiPanel() {
  const { state: dashboardState } = useDashboard();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm ArcLens AI. I'm monitoring live dashboard metrics, block finality, and balances. How can I assist you?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Step 2: Dynamic Prompt Chips based on real-time dashboard events
  const getDynamicChips = () => {
    const chips: string[] = [];

    const gasNum = parseFloat(dashboardState.network.gasGwei);
    if (!isNaN(gasNum) && gasNum > 0.005) {
      chips.push("Why is gas price high?");
    } else {
      chips.push("Summarize network status");
    }

    if (dashboardState.activity.recentTxs.length > 0) {
      chips.push("Explain my last transaction");
    } else {
      chips.push("What's current block finality?");
    }

    if (dashboardState.user.address) {
      chips.push("Check my USDC & EURC balance");
    } else {
      chips.push("How do I connect my wallet?");
    }

    return chips;
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: Message = { role: "user", content: query };
    const updatedMessages = [...messages, userMsg];

    setMessages(updatedMessages);
    if (!textToSend) setInput("");
    setIsLoading(true);

    try {
      // Step 1: Send both conversation history AND live dashboard state to API
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          dashboardState,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch response");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.text },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error retrieving live telemetry. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card-surface flex h-[580px] flex-col rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-xl backdrop-blur-md">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent border border-accent/30">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              ArcLens AI
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Context
              </span>
            </h3>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 text-xs">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-start gap-2.5 ${
              msg.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                msg.role === "user"
                  ? "bg-accent text-slate-950"
                  : "bg-slate-800 text-slate-300 border border-slate-700"
              }`}
            >
              {msg.role === "user" ? <User className="h-3 w-3" /> : <Sparkles className="h-3 w-3 text-accent" />}
            </div>
            <div
              className={`max-w-[82%] rounded-xl px-3.5 py-2.5 leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent/15 text-slate-100 border border-accent/20"
                  : "bg-slate-900/90 text-slate-300 border border-slate-800/80"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs italic pl-8">
            <RefreshCw className="h-3 w-3 animate-spin text-accent" />
            Analyzing dashboard signals...
          </div>
        )}
      </div>

      {/* Dynamic Prompt Chips */}
      <div className="pt-2 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {getDynamicChips().map((chip, i) => (
            <button
              key={i}
              onClick={() => handleSend(chip)}
              disabled={isLoading}
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:border-accent/40 hover:bg-slate-800 hover:text-slate-200 transition-all disabled:opacity-50"
            >
              ✨ {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="flex items-center gap-2 border-t border-slate-800/80 pt-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask about live blocks, gas, or balances..."
          disabled={isLoading}
          className="flex-1 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs text-foreground placeholder:text-slate-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all disabled:opacity-50"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-slate-950 hover:bg-accent/90 disabled:opacity-40 transition-all shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
