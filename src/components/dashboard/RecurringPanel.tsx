"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Repeat, ExternalLink } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import {
  RECURRING_BUY_ADDRESS,
  SELECTORS,
  toWeiHex,
  padAddress,
  padUint,
} from "@/lib/contracts";
import { DEFAULT_ARC } from "@/lib/arc";

export default function RecurringPanel() {
  const { isConnected, onArc, connect, sendContractTx } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [intervalSec, setIntervalSec] = useState("60");
  const [planId, setPlanId] = useState("0");
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTxHash(null);
    if (!isConnected) {
      connect();
      return;
    }
    if (!onArc) {
      setError("Switch to Arc Mainnet first.");
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient.trim())) {
      setError("Invalid recipient");
      return;
    }
    setBusy(true);
    try {
      const amountWei = BigInt(toWeiHex(amount, 18));
      const interval = BigInt(intervalSec || "60");
      const data =
        SELECTORS.createPlan +
        padAddress(recipient) +
        padUint(amountWei) +
        padUint(interval);
      const hash = await sendContractTx(
        RECURRING_BUY_ADDRESS,
        data,
        "0x" + amountWei.toString(16),
      );
      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPull() {
    setError(null);
    setTxHash(null);
    if (!isConnected) {
      connect();
      return;
    }
    setBusy(true);
    try {
      const id = BigInt(planId || "0");
      const data = SELECTORS.pull + padUint(id);
      const hash = await sendContractTx(RECURRING_BUY_ADDRESS, data, "0x0");
      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pull failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    setError(null);
    setTxHash(null);
    if (!isConnected) {
      connect();
      return;
    }
    setBusy(true);
    try {
      const id = BigInt(planId || "0");
      const data = SELECTORS.cancel + padUint(id);
      const hash = await sendContractTx(RECURRING_BUY_ADDRESS, data, "0x0");
      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
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
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Repeat className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Recurring buy</h2>
          <p className="text-xs text-muted">Create · pull · cancel (mainnet)</p>
        </div>
      </div>

      <form onSubmit={onCreate} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-muted">Recipient</label>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x…"
            className="w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Amount / pull</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Interval (sec)</label>
            <input
              value={intervalSec}
              onChange={(e) => setIntervalSec(e.target.value)}
              className="w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50"
              inputMode="numeric"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {!isConnected ? "Connect wallet" : busy ? "Confirm…" : "Create plan"}
        </button>
      </form>

      <div className="mt-4 border-t border-card-border pt-4">
        <label className="mb-1 block text-xs text-muted">Plan ID (0, 1, 2…)</label>
        <input
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          className="mb-2 w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onPull}
            disabled={busy}
            className="cursor-pointer rounded-xl border border-card-border px-3 py-2 text-xs font-medium text-foreground hover:border-accent/40 disabled:opacity-40"
          >
            Pull now
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="cursor-pointer rounded-xl border border-danger/40 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-40"
          >
            Cancel + refund
          </button>
        </div>
        <p className="mt-2 text-[10px] text-muted">
          First plan is usually ID 0. Pull only works after the interval has passed.
        </p>
      </div>

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