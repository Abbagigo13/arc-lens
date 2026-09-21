"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownUp, ExternalLink, RefreshCw } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import {
  MINI_SWAP_ADDRESS,
  SELECTORS,
  toWeiHex,
  readCreditOf,
} from "@/lib/contracts";
import { DEFAULT_ARC } from "@/lib/arc";

export default function SwapPanel() {
  const { isConnected, onArc, address, connect, sendContractTx } = useWallet();
  const [amount, setAmount] = useState("0.01");
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credit, setCredit] = useState<string | null>(null);

  const refreshCredit = useCallback(async () => {
    if (!address) {
      setCredit(null);
      return;
    }
    try {
      const c = await readCreditOf(address, DEFAULT_ARC.rpcUrls[0]);
      setCredit(c);
    } catch {
      setCredit(null);
    }
  }, [address]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshCredit();
    }, 0);

    return () => clearTimeout(timer);
  }, [refreshCredit]);

  async function onSwap(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTxHash(null);
    if (!isConnected) {
      connect();
      return;
    }
    if (!onArc) {
      setError("Switch to Arc Network first.");
      return;
    }
    setBusy(true);
    try {
      const value = toWeiHex(amount, 18);
      const hash = await sendContractTx(
        MINI_SWAP_ADDRESS,
        SELECTORS.swap,
        value,
      );
      setTxHash(hash);
      setTimeout(refreshCredit, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Swap failed");
    } finally {
      setBusy(false);
    }
  }

  const explorer = DEFAULT_ARC.blockExplorerUrls[0];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-surface rounded-2xl p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/20">
            <ArrowDownUp className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">MiniSwap</h2>
            <p className="text-xs text-slate-400">USDC → synthetic EURC credit (1:1)</p>
          </div>
        </div>
        <button
          type="button"
          onClick={refreshCredit}
          className="cursor-pointer rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:text-foreground hover:border-slate-700"
          title="Refresh credit"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {isConnected && credit !== null ? (
        <p className="mb-4 rounded-xl border border-success/30 bg-success/10 px-3.5 py-2 text-xs font-medium text-success">
          Your EURC Credit: <span className="font-mono font-bold text-foreground ml-1">{credit}</span>
        </p>
      ) : null}

      <form onSubmit={onSwap} className="space-y-3">
        <div className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3">
          <p className="text-[11px] font-medium text-slate-400">You pay</p>
          <div className="mt-1 flex items-center gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent font-mono text-lg font-semibold text-foreground outline-none"
              inputMode="decimal"
            />
            <span className="shrink-0 rounded-lg bg-primary/20 border border-primary/30 px-2.5 py-1 text-xs font-semibold text-accent">
              USDC
            </span>
          </div>
        </div>

        <div className="flex justify-center">
          <ArrowDownUp className="h-4 w-4 text-slate-500" />
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3">
          <p className="text-[11px] font-medium text-slate-400">You receive (Credit)</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-lg font-semibold text-foreground">{amount || "0"}</span>
            <span className="rounded-lg bg-success/20 border border-success/30 px-2.5 py-1 text-xs font-semibold text-success">
              EURC*
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy || !amount.trim()}
          className="w-full cursor-pointer rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-soft disabled:opacity-40"
        >
          {!isConnected ? "Connect Wallet" : busy ? "Confirm in Wallet…" : "Swap on Arc"}
        </button>
      </form>

      {error ? <p className="mt-3 text-xs font-medium text-danger">{error}</p> : null}
      {txHash ? (
        <a
          href={`${explorer}/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-success underline hover:text-accent"
        >
          Tx {txHash.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </motion.section>
  );
}
