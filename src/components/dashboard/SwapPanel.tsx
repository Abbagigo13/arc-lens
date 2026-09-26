"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowDownUp, RefreshCw, Wallet, ExternalLink } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useDashboard } from "@/context/DashboardContext";
import {
  MINI_SWAP_ADDRESS,
  SELECTORS,
  toWeiHex,
  padUint,
  readCreditOf,
} from "@/lib/contracts";
import { DEFAULT_ARC } from "@/lib/arc";

export default function SwapPanel() {
  const { isConnected, onArc, address, connect, sendContractTx } = useWallet();
  const { addTx } = useDashboard();

  const [direction, setDirection] = useState<"USDC_TO_EURC" | "EURC_TO_USDC">(
    "USDC_TO_EURC"
  );
  const [amount, setAmount] = useState("0.01");
  const [balance, setBalance] = useState("0.0000");
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rpcUrl =
    process.env.NEXT_PUBLIC_ARC_RPC_URL || DEFAULT_ARC.rpcUrls[0];

  // Plain helper — no setState inside it, safe to call from anywhere
  // (the mount/address-change effect below, and the post-swap poll).
  // Memoized so it's stable across renders (only changes if rpcUrl does),
  // which lets it satisfy exhaustive-deps below without refetching on
  // every render.
  const loadCredit = useCallback(
    async (addr: string): Promise<string | null> => {
      try {
        return await readCreditOf(addr, rpcUrl);
      } catch (err) {
        console.error("Failed to read credit:", err);
        return null;
      }
    },
    [rpcUrl],
  );

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    loadCredit(address).then((bal) => {
      if (!cancelled && bal !== null) setBalance(bal);
    });
    return () => {
      cancelled = true;
    };
  }, [address, loadCredit]);

  const handleSwap = async () => {
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
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setBusy(true);
    try {
      const amountWei = BigInt(toWeiHex(amount, 18));

      let data: string;
      let value: string;

      if (direction === "USDC_TO_EURC") {
        // swap() is payable, takes NO args — send USDC as value
        data = SELECTORS.swap;
        value = "0x" + amountWei.toString(16);
      } else {
        // redeem(uint256) is nonpayable — pass amount as calldata, value = 0
        data = SELECTORS.redeem + padUint(amountWei);
        value = "0x0";
      }

      const hash = await sendContractTx(MINI_SWAP_ADDRESS, data, value);
      setTxHash(hash);
      addTx({
        hash,
        type: direction === "USDC_TO_EURC" ? "Swap USDC→EURC" : "Redeem EURC→USDC",
      });

      // Poll for the updated balance instead of guessing a single delay —
      // confirmation time isn't predictable, so check every 3s for ~18s.
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        if (address) {
          loadCredit(address).then((bal) => {
            if (bal !== null) setBalance(bal);
          });
        }
        if (attempts >= 6) clearInterval(poll);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Swap failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleDirection = () => {
    setDirection((prev) =>
      prev === "USDC_TO_EURC" ? "EURC_TO_USDC" : "USDC_TO_EURC"
    );
    setAmount("");
    setError(null);
    setTxHash(null);
  };

  const explorer = DEFAULT_ARC.blockExplorerUrls[0];
  const isInvalidForm =
    !amount.trim() || Number(amount) <= 0 || isNaN(Number(amount));

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0f1115] p-6 text-white">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 text-blue-500">
            <RefreshCw size={20} />
          </div>
          <div>
            <h3 className="font-semibold">MiniSwap</h3>
            <p className="text-xs text-slate-400">
              {direction === "USDC_TO_EURC"
                ? "USDC → synthetic EURC credit (1:1)"
                : "Synthetic EURC credit → USDC (1:1)"}
            </p>
          </div>
        </div>
        <button
          onClick={toggleDirection}
          className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-400 transition hover:text-white"
          title="Toggle direction"
          type="button"
        >
          <ArrowDownUp size={16} />
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-900/50 px-4 py-2 text-xs">
        <span className="text-slate-400">Your EURC* Credit</span>
        <span className="font-mono font-medium text-blue-400">
          {balance} EURC
        </span>
      </div>

      <div className="mb-2 rounded-xl border border-slate-800 bg-[#0a0c10] p-4">
        <div className="mb-1 flex justify-between text-xs text-slate-400">
          <span>You pay</span>
          {direction === "EURC_TO_USDC" && (
            <button
              onClick={() => setAmount(balance)}
              className="cursor-pointer text-blue-400 hover:underline"
              type="button"
            >
              Max
            </button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-slate-600"
          />
          <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium">
            {direction === "USDC_TO_EURC" ? "USDC" : "EURC*"}
          </span>
        </div>
      </div>

      <div className="relative flex justify-center py-1">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-px w-full bg-slate-800" />
        </div>
        <div className="relative z-10 rounded-full border border-slate-800 bg-[#0f1115] p-1.5 text-slate-500">
          <ArrowDownUp size={14} />
        </div>
      </div>

      <div className="mb-6 mt-2 rounded-xl border border-slate-800 bg-[#0a0c10] p-4">
        <div className="mb-1 text-xs text-slate-400">You receive</div>
        <div className="flex items-center justify-between">
          <span className="text-xl font-semibold">
            {amount ? amount : "0.00"}
          </span>
          <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium">
            {direction === "USDC_TO_EURC" ? "EURC*" : "USDC"}
          </span>
        </div>
      </div>

      <button
        onClick={handleSwap}
        disabled={busy || (isConnected && isInvalidForm)}
        type="button"
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {!isConnected ? (
          <>
            <Wallet size={18} /> Connect Wallet
          </>
        ) : !onArc ? (
          "Switch to Arc Network"
        ) : busy ? (
          "Confirm in Wallet…"
        ) : direction === "USDC_TO_EURC" ? (
          "Swap to EURC"
        ) : (
          "Redeem to USDC"
        )}
      </button>

      {error ? (
        <p className="mt-3 text-xs font-medium text-red-400">{error}</p>
      ) : null}

      {txHash ? (
        <a
          href={`${explorer}/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 underline hover:text-blue-400"
        >
          Tx {txHash.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}

      <p className="mt-3 text-center text-[10px] text-slate-500">
        *Synthetic EURC credit. Internal accounting only. Redeem 1:1 for USDC via
        the hub.
      </p>
    </div>
  );
}