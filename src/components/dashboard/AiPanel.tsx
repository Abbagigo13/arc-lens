"use client";

import { useState, useEffect, useRef } from "react";
import { Bot, Send, Lock, Unlock, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { useWallet } from "@/hooks/useWallet";
import { HUB_ADDRESS, SELECTORS, toWeiHex } from "@/lib/contracts";

type Message = {
  role: "user" | "assistant";
  content: string;
  intent?: any;
};

const PROMPT_CHIPS = [
  "Why is gas price high?",
  "What's current block finality?",
  "How do I connect my wallet?",
];

export default function AiPanel() {
  const { state, updateUser } = useDashboard();
  const { isConnected, onArc, address, connect, sendContractTx } = useWallet();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm ArcLens AI. I analyze real-time network telemetry or propose actions like 'swap 0.01 USDC' or 'send 0.01 to address'.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [isPaywallLocked, setIsPaywallLocked] = useState(false);
  const [freeLeft, setFreeLeft] = useState<number | null>(3);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Execute 0.01 USDC unlock transaction on Arc
  const handleUnlockAI = async () => {
    if (!isConnected) {
      connect();
      return;
    }
    if (!onArc) {
      alert("Please switch your wallet to Arc Network.");
      return;
    }

    setUnlocking(true);
    try {
      const unlockFeeHex = toWeiHex("0.01", 18);
      await sendContractTx(HUB_ADDRESS, SELECTORS.unlock, unlockFeeHex);

      updateUser({ isUnlocked: true });
      setIsPaywallLocked(false);
    } catch (err) {
      console.error("Unlock transaction failed:", err);
      alert("Unlock transaction failed or was rejected.");
    } finally {
      setUnlocking(false);
    }
  };

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading || isPaywallLocked) return;

    const newMessages: Message[] = [...messages, { role: "user", content: query }];
    setMessages(newMessages);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          snapshot: {
            block: state.network.block,
            gasGwei: state.network.gasGwei,
            chainId: state.network.chainId,
            usdcBalance: state.user.usdcBalance,
            address: address || state.user.address,
            isUnlocked: state.user.isUnlocked,
          },
        }),
      });

      const data = await res.json();

      if (res.status === 402 || data.error === "PAYWALL_LOCKED") {
        setIsPaywallLocked(true);
        setFreeLeft(0);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
        return;
      }

      if (data.isUnlocked) {
        updateUser({ isUnlocked: true });
        setIsPaywallLocked(false);
      } else if (typeof data.remainingFree === "number") {
        setFreeLeft(data.remainingFree);
        if (data.remainingFree === 0) {
          setIsPaywallLocked(true);
        }
      }

      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply, intent: data.intent },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to connect to AI assistant service." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-surface flex h-full min-h-[520px] flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/80 p-5 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/20">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">ArcLens AI Guide</h3>
            <p className="text-[11px] text-slate-400">Qwen model · On-chain verified</p>
          </div>
        </div>

        {state.user.isUnlocked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
            <Unlock className="h-3 w-3" /> Unlocked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
            <Lock className="h-3 w-3" /> {freeLeft !== null ? `${freeLeft} Free Left` : "Trial"}
          </span>
        )}
      </div>

      {/* Messages Viewport */}
      <div className="my-4 flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[380px]">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-accent text-slate-950 font-medium rounded-br-none"
                  : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none"
              }`}
            >
              {m.content}
            </div>

            {m.intent && (
              <div className="mt-2 w-[88%] rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-accent mb-1">
                  <Sparkles className="h-3.5 w-3.5" /> Proposed Action Intent
                </div>
                <p className="text-[11px] text-slate-300 font-mono">
                  {JSON.stringify(m.intent)}
                </p>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 w-max px-3 py-2 rounded-xl">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" /> Thinking...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Prompt Chips */}
      {!isPaywallLocked && !state.user.isUnlocked && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PROMPT_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => sendMessage(chip)}
              className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-300 hover:border-accent/40 hover:text-accent transition-all"
            >
              ✨ {chip}
            </button>
          ))}
        </div>
      )}

      {/* Paywall Banner / Input Form */}
      {isPaywallLocked && !state.user.isUnlocked ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-center">
          <div className="flex justify-center mb-1.5 text-amber-400">
            <Lock className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-foreground">Free Queries Exhausted</p>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
            Pay 0.01 USDC on Arc Mainnet to permanently unlock unlimited AI features for this wallet.
          </p>

          <button
            onClick={handleUnlockAI}
            disabled={unlocking}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-xs font-semibold text-slate-950 hover:bg-accent/90 disabled:opacity-50 transition-all shadow-lg shadow-accent/10"
          >
            {unlocking ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Finalizing 0.01 USDC Unlock...
              </>
            ) : !isConnected ? (
              "Connect Wallet to Unlock (0.01 USDC)"
            ) : (
              "Pay 0.01 USDC on Arc to Unlock AI"
            )}
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 p-1.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about live blocks, gas, or balances..."
            className="w-full bg-transparent px-2.5 text-xs text-foreground outline-none placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-slate-950 disabled:opacity-40 transition-all"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}