"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Lock,
  Send,
  Sparkles,
  ExternalLink,
  ArrowDownUp,
  Repeat,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { explorerTxUrl, readUnlocked } from "@/lib/unlocker";
import {
  MINI_SWAP_ADDRESS,
  RECURRING_BUY_ADDRESS,
  SELECTORS,
  toWeiHex,
  padAddress,
  padUint,
} from "@/lib/contracts";
import { DEFAULT_ARC } from "@/lib/arc";

const SUGGESTIONS = [
  "Why is gas paid in USDC on Arc?",
  "swap 0.01 USDC",
  "send 0.01 to me",
  "recurring 0.01 every 60 seconds",
];

type Message = { role: "user" | "assistant"; text: string };

type PendingAction =
  | { type: "send"; to: string; amount: string }
  | { type: "swap"; amount: string }
  | {
      type: "recurring";
      recipient: string;
      amount: string;
      intervalSec: string;
    };

type NetworkContext = {
  block?: string;
  gasGwei?: string;
  chainId?: string;
};

type Props = {
  networkContext?: NetworkContext;
};

function parseAction(
  text: string,
  selfAddress: string | null,
): PendingAction | null {
  const t = text.trim();

  const swap = t.match(/swap\s+(\d+(?:\.\d+)?)\s*(?:usdc)?/i);
  if (swap) {
    return { type: "swap", amount: swap[1] };
  }

  const sendTo = t.match(
    /send\s+(\d+(?:\.\d+)?)\s*(?:usdc)?\s+to\s+(0x[a-fA-F0-9]{40}|me)/i,
  );
  if (sendTo) {
    const to =
      sendTo[2].toLowerCase() === "me"
        ? selfAddress
        : sendTo[2];
    if (!to) return null;
    return { type: "send", to, amount: sendTo[1] };
  }

  const rec = t.match(
    /recurring\s+(\d+(?:\.\d+)?)\s*(?:usdc)?(?:\s+to\s+(0x[a-fA-F0-9]{40}|me))?\s*(?:every\s+(\d+)\s*(?:s|sec|seconds)?)?/i,
  );
  if (rec) {
    const recipient =
      !rec[2] || rec[2].toLowerCase() === "me"
        ? selfAddress
        : rec[2];
    if (!recipient) return null;
    return {
      type: "recurring",
      recipient,
      amount: rec[1],
      intervalSec: rec[3] || "60",
    };
  }

  return null;
}

export default function AiPanel({ networkContext }: Props) {
  const {
    isConnected,
    address,
    onArc,
    connect,
    payUnlock,
    sendNativeUsdc,
    sendContractTx,
  } = useWallet();

  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi — I’m ArcLens AI. Try typing “swap 0.01 USDC”, “send 0.01 to me”, or “recurring 0.01 every 60”. I propose actions; you confirm in your wallet.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockTx, setUnlockTx] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionTx, setActionTx] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!address || !isConnected) {
        setUnlocked(false);
        return;
      }
      setChecking(true);
      try {
        const ok = await readUnlocked(address);
        if (!cancelled) setUnlocked(ok);
      } catch {
        /* optional */
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [address, isConnected]);

  function demoUnlock() {
    setUnlocked(true);
    setError(null);
  }

  async function unlockWithUsdc() {
    setError(null);
    setUnlockTx(null);
    if (!isConnected) {
      connect();
      return;
    }
    if (!onArc) {
      setError("Switch wallet to Arc Network (5042) first.");
      return;
    }
    setUnlocking(true);
    try {
      const hash = await payUnlock();
      setUnlockTx(hash);
      setUnlocked(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unlock payment failed");
    } finally {
      setUnlocking(false);
    }
  }

  async function runPending() {
    if (!pending) return;
    setError(null);
    setActionTx(null);
    if (!isConnected) {
      connect();
      return;
    }
    if (!onArc) {
      setError("Switch to Arc Network first.");
      return;
    }
    setActionBusy(true);
    try {
      let hash: string;
      if (pending.type === "send") {
        hash = await sendNativeUsdc(pending.to, pending.amount);
      } else if (pending.type === "swap") {
        const value = toWeiHex(pending.amount, 18);
        hash = await sendContractTx(MINI_SWAP_ADDRESS, SELECTORS.swap, value);
      } else {
        const amountWei = BigInt(toWeiHex(pending.amount, 18));
        const interval = BigInt(pending.intervalSec || "60");
        const data =
          SELECTORS.createPlan +
          padAddress(pending.recipient) +
          padUint(amountWei) +
          padUint(interval);
        hash = await sendContractTx(
          RECURRING_BUY_ADDRESS,
          data,
          "0x" + amountWei.toString(16),
        );
      }
      setActionTx(hash);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `Done. Tx ${hash.slice(0, 10)}…${hash.slice(-6)}`,
        },
      ]);
      setPending(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionBusy(false);
    }
  }

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    if (!unlocked) return;

    setInput("");
    setError(null);
    setActionTx(null);

    const nextMessages: Message[] = [...messages, { role: "user", text: q }];
    setMessages(nextMessages);

    const action = parseAction(q, address);
    if (action) {
      setPending(action);
      const label =
        action.type === "send"
          ? `Send ${action.amount} USDC → ${action.to.slice(0, 6)}…${action.to.slice(-4)}`
          : action.type === "swap"
            ? `Swap ${action.amount} USDC → EURC credit`
            : `Recurring ${action.amount} USDC every ${action.intervalSec}s → ${action.recipient.slice(0, 6)}…`;
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `I can execute that on Arc Network:\n\n**${label}**\n\nConfirm below — nothing executes until you sign in your wallet.`,
        },
      ]);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.text,
          })),
          networkContext,
        }),
      });

      const raw = await res.text();
      let data: { text?: string; error?: string } = {};
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          `API returned non-JSON (status ${res.status}). Check /api/ai/chat`,
        );
      }
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

      setMessages((m) => [
        ...m,
        { role: "assistant", text: (data.text as string) || "Empty reply" },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to reach AI";
      setError(msg);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `Sorry — Qwen error: ${msg}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const explorer = DEFAULT_ARC.blockExplorerUrls[0];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="card-surface flex h-full min-h-[460px] flex-col rounded-2xl border border-slate-800"
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/20">
            <Bot className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Arc AI Guide</h2>
            <p className="text-xs text-slate-400">Qwen AI · Requires wallet confirmation</p>
          </div>
        </div>
        {checking ? (
          <span className="text-xs text-slate-400">Checking…</span>
        ) : unlocked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 border border-success/30 px-2.5 py-1 text-xs font-semibold text-success">
            <Sparkles className="h-3 w-3" aria-hidden />
            Unlocked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-warm/15 border border-accent-warm/30 px-2.5 py-1 text-xs font-semibold text-accent-warm">
            <Lock className="h-3 w-3" aria-hidden />
            Paywall
          </span>
        )}
      </div>

      <div className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-[95%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "ml-auto bg-primary/30 text-foreground border border-primary/40"
                  : "bg-slate-900/90 text-slate-200 border border-slate-800"
              }`}
            >
              {msg.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {pending ? (
          <div className="rounded-xl border border-primary/50 bg-primary/10 p-3.5">
            <p className="text-xs font-semibold text-foreground">
              {pending.type === "send" && (
                <>
                  <Send className="mr-1.5 inline h-3.5 w-3.5 text-accent" />
                  Send {pending.amount} USDC
                </>
              )}
              {pending.type === "swap" && (
                <>
                  <ArrowDownUp className="mr-1.5 inline h-3.5 w-3.5 text-accent" />
                  Swap {pending.amount} USDC
                </>
              )}
              {pending.type === "recurring" && (
                <>
                  <Repeat className="mr-1.5 inline h-3.5 w-3.5 text-accent" />
                  Recurring {pending.amount} USDC / {pending.intervalSec}s
                </>
              )}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={runPending}
                disabled={actionBusy}
                className="cursor-pointer rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-white transition-all hover:bg-primary-soft disabled:opacity-50"
              >
                {actionBusy ? "Confirming in Wallet…" : "Confirm in Wallet"}
              </button>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-xs text-slate-300 hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {actionTx ? (
          <a
            href={`${explorer}/tx/${actionTx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-success underline"
          >
            Action Tx {actionTx.slice(0, 10)}…
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}

        {busy ? (
          <div className="animate-pulse text-xs text-slate-400">Qwen is generating response…</div>
        ) : null}
        {error ? <div className="text-xs font-medium text-danger">{error}</div> : null}
      </div>

      {!unlocked ? (
        <div className="space-y-2.5 border-t border-slate-800 px-5 py-4">
          <p className="text-xs text-slate-300">
            Pay <span className="font-semibold text-foreground">0.01 USDC</span> on Arc Network to unlock AI actions.
          </p>
          <button
            type="button"
            onClick={unlockWithUsdc}
            disabled={unlocking}
            className="w-full cursor-pointer rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-soft disabled:opacity-50"
          >
            {!isConnected
              ? "Connect Wallet to Unlock"
              : unlocking
                ? "Confirm 0.01 USDC Payment…"
                : "Unlock with 0.01 USDC"}
          </button>
          <button
            type="button"
            onClick={demoUnlock}
            className="w-full cursor-pointer rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:text-foreground hover:border-slate-700"
          >
            Demo Unlock (No Payment)
          </button>
          {unlockTx ? (
            <a
              href={explorerTxUrl(unlockTx)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-success underline"
            >
              Unlock Tx {unlockTx.slice(0, 10)}…
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 border-t border-slate-800 px-5 py-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="cursor-pointer rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300 transition-all hover:border-accent/50 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2 border-t border-slate-800 px-5 py-4"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Try "swap 0.01 USDC"'
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-slate-500 focus:border-accent focus:ring-1 focus:ring-accent"
              aria-label="Ask the AI"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-accent px-4 text-background font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </>
      )}
    </motion.section>
  );
}
