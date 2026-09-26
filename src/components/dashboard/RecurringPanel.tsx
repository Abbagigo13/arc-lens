"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Repeat, ExternalLink } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useDashboard } from "@/context/DashboardContext";
import {
  RECURRING_BUY_ADDRESS,
  SELECTORS,
  toWeiHex,
  padAddress,
  padUint,
} from "@/lib/contracts";
import { DEFAULT_ARC, rpcRequest } from "@/lib/arc";

// keccak256("PlanCreated(uint256,address,address,uint256,uint256,uint256)")
const PLAN_CREATED_TOPIC =
  "0xebe8faacda26f3794e66a5bb47309bc3d2ca1350d36c8d0b71d2cbd2c2722041";

type TxReceipt = {
  blockNumber?: string;
  logs?: { address: string; topics: string[]; data: string }[];
};

// Poll for the tx receipt (it isn't mined instantly) and pull the real
// planId out of the PlanCreated event log, instead of leaving the user to
// guess — plan IDs are a global counter, so "0" is only right for the
// very first plan ever created on this contract.
async function findCreatedPlanId(hash: string): Promise<string | null> {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const receipt = await rpcRequest<TxReceipt | null>("eth_getTransactionReceipt", [hash]);
      if (receipt && receipt.logs) {
        const log = receipt.logs.find(
          (l) => l.topics && l.topics[0]?.toLowerCase() === PLAN_CREATED_TOPIC,
        );
        if (log) {
          return BigInt(log.topics[1]).toString();
        }
        if (receipt.blockNumber) return null; // mined but no matching log — give up
      }
    } catch {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

export default function RecurringPanel() {
  const { isConnected, onArc, connect, sendContractTx } = useWallet();
  const { addTx } = useDashboard();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [intervalSec, setIntervalSec] = useState("60");
  const [planId, setPlanId] = useState("0");
  const [topUpAmount, setTopUpAmount] = useState("0.01");
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdPlanId, setCreatedPlanId] = useState<string | null>(null);
  const [lookingUpPlanId, setLookingUpPlanId] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTxHash(null);
    setCreatedPlanId(null);

    if (!isConnected) {
      connect();
      return;
    }

    if (!onArc) {
      setError("Switch to Arc Network (chain 5042) first.");
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient.trim())) {
      setError("Invalid recipient address format.");
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
      addTx({ hash, type: "Create plan" });
      setBusy(false);

      // Look up the real plan ID in the background so Pull/Cancel/Top Up
      // point at the plan you actually just created, not a guess.
      setLookingUpPlanId(true);
      const foundId = await findCreatedPlanId(hash);
      setLookingUpPlanId(false);
      if (foundId !== null) {
        setCreatedPlanId(foundId);
        setPlanId(foundId);
      }
      return;
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

    if (!onArc) {
      setError("Switch to Arc Network (chain 5042) first.");
      return;
    }

    setBusy(true);
    try {
      const id = BigInt(planId || "0");
      const data = SELECTORS.pull + padUint(id);
      const hash = await sendContractTx(RECURRING_BUY_ADDRESS, data, "0x0");
      setTxHash(hash);
      addTx({ hash, type: "Pull due" });
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

    if (!onArc) {
      setError("Switch to Arc Network (chain 5042) first.");
      return;
    }

    setBusy(true);
    try {
      const id = BigInt(planId || "0");
      const data = SELECTORS.cancel + padUint(id);
      const hash = await sendContractTx(RECURRING_BUY_ADDRESS, data, "0x0");
      setTxHash(hash);
      addTx({ hash, type: "Cancel plan" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDeposit() {
    setError(null);
    setTxHash(null);

    if (!isConnected) {
      connect();
      return;
    }

    if (!onArc) {
      setError("Switch to Arc Network (chain 5042) first.");
      return;
    }

    setBusy(true);
    try {
      const id = BigInt(planId || "0");
      const amountWei = BigInt(toWeiHex(topUpAmount, 18));
      const data = SELECTORS.deposit + padUint(id);
      const hash = await sendContractTx(
        RECURRING_BUY_ADDRESS,
        data,
        "0x" + amountWei.toString(16),
      );
      setTxHash(hash);
      addTx({ hash, type: "Plan top-up" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Top-up failed");
    } finally {
      setBusy(false);
    }
  }

  const explorer = DEFAULT_ARC.blockExplorerUrls[0];
  const isInvalidForm =
    !recipient.trim() ||
    !amount.trim() ||
    Number(amount) <= 0 ||
    isNaN(Number(amount)) ||
    !intervalSec.trim();

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-surface rounded-2xl p-6"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/20">
          <Repeat className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Recurring Buy</h2>
          <p className="text-xs text-slate-400">Scheduled USDC stream flows</p>
        </div>
      </div>

      <form onSubmit={onCreate} className="space-y-3.5">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">Recipient</label>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x…"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Amount / pull</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Interval (sec)</label>
            <input
              value={intervalSec}
              onChange={(e) => setIntervalSec(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              inputMode="numeric"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy || (isConnected && isInvalidForm)}
          className="w-full cursor-pointer rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          {!isConnected
            ? "Connect Wallet"
            : !onArc
              ? "Switch to Arc Network"
              : busy
                ? "Confirm in Wallet…"
                : "Create Plan"}
        </button>

        {lookingUpPlanId && (
          <p className="mt-2 text-xs text-slate-400">
            Confirming on-chain and finding your plan ID…
          </p>
        )}
        {createdPlanId !== null && (
          <p className="mt-2 text-xs text-success">
            Plan created — ID <span className="font-mono">{createdPlanId}</span> (auto-filled below).
          </p>
        )}
      </form>

      <div className="mt-5 border-t border-slate-800 pt-4">
        <label className="mb-1.5 block text-xs font-medium text-slate-300">
          Manage Plan ID (0, 1, 2…)
        </label>
        <input
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm font-mono text-foreground outline-none focus:border-accent"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onPull}
            disabled={busy || (isConnected && planId === "")}
            className="cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-foreground hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Processing…" : "Pull Due"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy || (isConnected && planId === "")}
            className="cursor-pointer rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Processing…" : "Cancel Plan"}
          </button>
        </div>

        <label className="mb-1.5 mt-3 block text-xs font-medium text-slate-300">
          Top up plan balance
        </label>
        <div className="flex gap-2">
          <input
            value={topUpAmount}
            onChange={(e) => setTopUpAmount(e.target.value)}
            placeholder="Amount to add"
            inputMode="decimal"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm font-mono text-foreground outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={onDeposit}
            disabled={busy || (isConnected && (planId === "" || !topUpAmount.trim()))}
            className="cursor-pointer whitespace-nowrap rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Processing…" : "Top Up"}
          </button>
        </div>
      </div>

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