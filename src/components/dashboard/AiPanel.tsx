"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  Lock,
  Unlock,
  Sparkles,
  Loader2,
  RefreshCw,
  ArrowRightLeft,
  ArrowUpRight,
  Repeat,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { useWallet } from "@/hooks/useWallet";
import {
  HUB_ADDRESS,
  SELECTORS,
  toWeiHex,
  padAddress,
  padUint,
} from "@/lib/contracts";

type Message = {
  role: "user" | "assistant";
  content: string;
  intent?: any;
};

const PROMPT_CHIPS = [
  "Why is gas price high?",
  "What's current block finality?",
  "Swap 0.01 USDC to EURC",
];

export default function AiPanel() {
  const { state, updateUser } = useDashboard();
  const { isConnected, onArc, address, connect, sendContractTx } = useWallet();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm ArcLens AI. I analyze real-time network telemetry or propose actions like 'swap 0.01 USDC', 'redeem 0.01 EURC', or 'send 0.01 to 0x...'.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [isPaywallLocked, setIsPaywallLocked] = useState(false);
  const [freeLeft, setFreeLeft] = useState<number | null>(3);
  const [executingIdx, setExecutingIdx] = useState<number | null>(null);
  const [executedStatus, setExecutedStatus] = useState<
    Record<number, "success" | "error">
  >({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleUnlockAI = async () => {
    if (!isConnected) {
      connect();
      return;
    }
    if (!onArc) {
      alert("Please switch your wallet to Arc Network (chain 5042).");
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

  const executeIntent = async (intent: any, msgIdx: number) => {
    if (!isConnected) {
      connect();
      return;
    }
    if (!onArc) {
      alert("Please switch your wallet to Arc Network (chain 5042).");
      return;
    }

    setExecutingIdx(msgIdx);

    try {
      const amountWei = BigInt(toWeiHex(String(intent.amount), 18));

      switch (intent.type) {
        case "SWAP": {
          // swap() is payable, takes NO args — send USDC as value
          await sendContractTx(
            HUB_ADDRESS,
            SELECTORS.swap,
            "0x" + amountWei.toString(16)
          );
          break;
        }

        case "REDEEM": {
          // redeem(uint256) — amount as calldata, value = 0
          const data = SELECTORS.redeem + padUint(amountWei);
          await sendContractTx(HUB_ADDRESS, data, "0x0");
          break;
        }

        case "SEND": {
          if (
            !intent.recipient ||
            !/^0x[a-fA-F0-9]{40}$/.test(intent.recipient)
          ) {
            throw new Error("Invalid recipient address");
          }
          // Native USDC transfer — no calldata, value = amount
          await sendContractTx(
            intent.recipient as `0x${string}`,
            "0x",
            "0x" + amountWei.toString(16)
          );
          break;
        }

        case "RECURRING": {
          if (
            !intent.recipient ||
            !/^0x[a-fA-F0-9]{40}$/.test(intent.recipient)
          ) {
            throw new Error("Invalid recipient address");
          }
          const interval = BigInt(intent.intervalSeconds || 60);
          const data =
            SELECTORS.createPlan +
            padAddress(intent.recipient) +
            padUint(amountWei) +
            padUint(interval);

          await sendContractTx(
            HUB_ADDRESS,
            data,
            "0x" + amountWei.toString(16)
          );
          break;
        }

        default:
          throw new Error("Unknown intent type");
      }

      setExecutedStatus((prev) => ({ ...prev, [msgIdx]: "success" }));
    } catch (err) {
      console.error("Intent execution failed:", err);
      setExecutedStatus((prev) => ({ ...prev, [msgIdx]: "error" }));
    } finally {
      setExecutingIdx(null);
    }
  };

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading || isPaywallLocked) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: query },
    ];
    setMessages(newMessages);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
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
        {
          role: "assistant",
          content: "Failed to connect to AI assistant service.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderActionCard = (intent: any, msgIdx: number) => {
    const status = executedStatus[msgIdx];
    const isExecuting = executingIdx === msgIdx;

    const labelMap: Record<string, string> = {
      SWAP: "Swap USDC → EURC",
      REDEEM: "Redeem EURC → USDC",
      SEND: "Send USDC",
      RECURRING: "Create Recurring Plan",
    };

    const iconMap: Record<string, React.ReactNode> = {
      SWAP: <ArrowRightLeft className="h-3.5 w-3.5" />,
      REDEEM: <ArrowRightLeft className="h-3.5 w-3.5" />,
      SEND: <ArrowUpRight className="h-3.5 w-3.5" />,
      RECURRING: <Repeat className="h-3.5 w-3.5" />,
    };

    return (
      <div className="mt-2 w-[88%] rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs">
        <div className="mb-2 flex items-center gap-1.5 font-semibold text-accent">
          <Sparkles className="h-3.5 w-3.5" />
          {labelMap[intent.type] || "Proposed Action"}
        </div>

        <div className="mb-3 space-y-1 font-mono text-[11px] text-slate-300">
          {intent.amount && (
            <div className="flex justify-between">
              <span className="text-slate-500">Amount:</span>
              <span>
                {intent.amount}{" "}
                {intent.type === "REDEEM" ? "EURC" : "USDC"}
              </span>
            </div>
          )}
          {intent.recipient && (
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">To:</span>
              <span className="truncate">{intent.recipient}</span>
            </div>
          )}
          {intent.intervalSeconds && (
            <div className="flex justify-between">
              <span className="text-slate-500">Interval:</span>
              <span>{intent.intervalSeconds}s</span>
            </div>
          )}
        </div>

        {status === "success" ? (
          <div className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-[11px] font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed on-chain
          </div>
        ) : status === "error" ? (
          <div className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-[11px] font-semibold text-red-400">
            <XCircle className="h-3.5 w-3.5" /> Transaction failed
          </div>
        ) : (
          <button
            onClick={() => executeIntent(intent, msgIdx)}
            disabled={isExecuting}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-accent py-2 text-[11px] font-semibold text-slate-950 transition-all hover:bg-accent/90 disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirm in
                wallet...
              </>
            ) : (
              <>
                {iconMap[intent.type]} Confirm & Sign
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="card-surface flex h-full min-h-[520px] flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950/80 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-accent/20 bg-accent/15 text-accent">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              ArcLens AI Guide
            </h3>
            <p className="text-[11px] text-slate-400">
              Qwen model · On-chain verified
            </p>
          </div>
        </div>

        {state.user.isUnlocked ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
            <Unlock className="h-3 w-3" /> Unlocked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-400">
            <Lock className="h-3 w-3" />{" "}
            {freeLeft !== null ? `${freeLeft} Free Left` : "Trial"}
          </span>
        )}
      </div>

      <div className="my-4 max-h-[380px] flex-1 space-y-3.5 overflow-y-auto pr-1">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              m.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                m.role === "user"
                  ? "rounded-br-none bg-accent font-medium text-slate-950"
                  : "rounded-bl-none border border-slate-800 bg-slate-900 text-slate-200"
              }`}
            >
              {m.content}
            </div>

            {m.intent && renderActionCard(m.intent, idx)}
          </div>
        ))}

        {loading && (
          <div className="flex w-max items-center gap-2 rounded-xl bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />{" "}
            Thinking...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {!isPaywallLocked && !state.user.isUnlocked && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PROMPT_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => sendMessage(chip)}
              className="cursor-pointer rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-300 transition-all hover:border-accent/40 hover:text-accent"
            >
              ✨ {chip}
            </button>
          ))}
        </div>
      )}

      {isPaywallLocked && !state.user.isUnlocked ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-center">
          <div className="mb-1.5 flex justify-center text-amber-400">
            <Lock className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-foreground">
            Free Queries Exhausted
          </p>
          <p className="mb-3 mt-0.5 text-[11px] text-slate-400">
            Pay 0.01 USDC on Arc Mainnet to permanently unlock unlimited AI
            features for this wallet.
          </p>

          <button
            onClick={handleUnlockAI}
            disabled={unlocking}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-accent/10 transition-all hover:bg-accent/90 disabled:opacity-50"
          >
            {unlocking ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Finalizing
                0.01 USDC Unlock...
              </>
            ) : !isConnected ? (
              "Connect Wallet to Unlock (0.01 USDC)"
            ) : !onArc ? (
              "Switch to Arc Network (Chain 5042)"
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
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-accent text-slate-950 transition-all disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}
