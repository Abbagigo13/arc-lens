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
      setError("Switch to Arc Testnet first.");
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
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <ArrowDownUp className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Swap</h2>
            <p className="text-xs text-muted">USDC → synthetic EURC credit (1:1)</p>
          </div>
        </div>
        <button
          type="button"
          onClick={refreshCredit}
          className="cursor-pointer rounded-lg p-1.5 text-muted hover:text-foreground"
          title="Refresh credit"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {isConnected && credit !== null ? (
        <p className="mb-3 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
          Your EURC credit: <span className="font-mono font-medium">{credit}</span>
        </p>
      ) : null}

      <form onSubmit={onSwap} className="space-y-3">
        <div className="rounded-xl border border-card-border bg-background px-3 py-3">
          <p className="text-[11px] text-muted">You pay</p>
          <div className="mt-1 flex items-center gap-2">
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent font-mono text-lg text-foreground outline-none"
              inputMode="decimal"
            />
            <span className="shrink-0 rounded-lg bg-primary/15 px-2 py-1 text-xs text-accent">
              USDC
            </span>
          </div>
        </div>
        <div className="flex justify-center">
          <ArrowDownUp className="h-4 w-4 text-muted" />
        </div>
        <div className="rounded-xl border border-card-border bg-background px-3 py-3">
          <p className="text-[11px] text-muted">You receive (credit)</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-lg text-foreground">{amount || "0"}</span>
            <span className="rounded-lg bg-success/15 px-2 py-1 text-xs text-success">
              EURC*
            </span>
          </div>
        </div>
        <button
          type="submit"
          disabled={busy || !amount.trim()}
          className="w-full cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-soft disabled:opacity-40"
        >
          {!isConnected ? "Connect wallet" : busy ? "Confirm…" : "Swap on Arc"}
        </button>
      </form>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
      {txHash ? (
        <a
          href={`${explorer}/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-success underline"
        >
          Tx {txHash.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </motion.section>
  );
}