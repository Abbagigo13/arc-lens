"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, ExternalLink } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { DEFAULT_ARC } from "@/lib/arc";

export default function SendUsdc() {
  const { isConnected, onArc, sendNativeUsdc, connect } = useWallet();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTxHash(null);
    if (!isConnected) {
      connect();
      return;
    }
    if (!onArc) {
      setError("Switch your wallet to Arc (chain 5042) first.");
      return;
    }
    setBusy(true);
    try {
      const hash = await sendNativeUsdc(to, amount);
      setTxHash(hash);
      setAmount("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Send failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2 }}
      className="card-surface rounded-2xl p-6"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/20">
          <Send className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Send USDC</h2>
          <p className="text-xs text-slate-400">
            Native USDC transfer on Arc · Requires wallet signature
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-300" htmlFor="send-to">
            Recipient Address
          </label>
          <input
            id="send-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x…"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-slate-500 focus:border-accent focus:ring-1 focus:ring-accent"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-300" htmlFor="send-amount">
            Amount (USDC)
          </label>
          <input
            id="send-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.01"
            inputMode="decimal"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-slate-500 focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        <button
          type="submit"
          disabled={busy || !to.trim() || !amount.trim()}
          className="w-full cursor-pointer rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          {!isConnected
            ? "Connect Wallet to Send"
            : busy
              ? "Confirm in Wallet…"
              : "Send USDC"}
        </button>
      </form>

      {error ? <p className="mt-3 text-xs font-medium text-danger">{error}</p> : null}
      {txHash ? (
        <p className="mt-3 flex flex-wrap items-center gap-1 text-xs font-medium text-success">
          Transaction Sent ·{" "}
          <a
            href={`${DEFAULT_ARC.blockExplorerUrls[0]}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 underline hover:text-accent"
          >
            {txHash.slice(0, 10)}…{txHash.slice(-6)}
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      ) : null}
    </motion.section>
  );
}
