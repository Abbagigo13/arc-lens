"use client";

import { useState, useEffect } from "react";
import { useAccount, useSendTransaction } from "wagmi";
import { ArrowDownUp, RefreshCw, Wallet } from "lucide-react";
import {
  MINI_SWAP_ADDRESS,
  SELECTORS,
  toWeiHex,
  padUint,
  readCreditOf,
} from "@/lib/contracts";

export function SwapPanel() {
  const { address, isConnected } = useAccount();
  const [direction, setDirection] = useState<"USDC_TO_EURC" | "EURC_TO_USDC">(
    "USDC_TO_EURC"
  );
  const [amount, setAmount] = useState("0.01");
  const [balance, setBalance] = useState("0.0000");

  const { sendTransaction, isPending } = useSendTransaction();

  const rpcUrl =
    process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.arc.network";

  const fetchBalance = async () => {
    if (!address) return;
    try {
      const bal = await readCreditOf(address, rpcUrl);
      setBalance(bal);
    } catch (err) {
      console.error("Failed to read credit:", err);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [address]);

  const handleSwap = () => {
    if (!amount || isNaN(Number(amount))) return;

    try {
      const weiHex = toWeiHex(amount, 18);
      const paddedAmount = padUint(BigInt(weiHex));

      const selector =
        direction === "USDC_TO_EURC" ? SELECTORS.swap : SELECTORS.redeem;

      sendTransaction(
        {
          to: MINI_SWAP_ADDRESS,
          data: `${selector}${paddedAmount}` as `0x${string}`,
        },
        {
          onSuccess: () => {
            setTimeout(fetchBalance, 3000);
          },
        }
      );
    } catch (err) {
      console.error("Swap error:", err);
    }
  };

  const toggleDirection = () => {
    setDirection((prev) =>
      prev === "USDC_TO_EURC" ? "EURC_TO_USDC" : "USDC_TO_EURC"
    );
    setAmount("");
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0f1115] p-6 text-white">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 text-blue-500">
            <RefreshCw size={20} />
          </div>
          <div>
            <h3 className="font-semibold">MiniSwap</h3>
            <p className="text-xs text-gray-400">
              {direction === "USDC_TO_EURC"
                ? "USDC → synthetic EURC credit (1:1)"
                : "Synthetic EURC credit → USDC (1:1)"}
            </p>
          </div>
        </div>
        <button
          onClick={toggleDirection}
          className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-400 transition hover:text-white"
          title="Toggle direction"
        >
          <ArrowDownUp size={16} />
        </button>
      </div>

      {/* EURC Balance */}
      <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-900/50 px-4 py-2 text-xs">
        <span className="text-gray-400">Your EURC* Credit</span>
        <span className="font-mono font-medium text-blue-400">
          {balance} EURC
        </span>
      </div>

      {/* Pay Input */}
      <div className="mb-2 rounded-xl border border-gray-800 bg-[#0a0c10] p-4">
        <div className="mb-1 flex justify-between text-xs text-gray-400">
          <span>You pay</span>
          {direction === "EURC_TO_USDC" && (
            <button
              onClick={() => setAmount(balance)}
              className="text-blue-400 hover:underline"
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
            className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-gray-600"
          />
          <span className="rounded-md bg-gray-800 px-2 py-1 text-xs font-medium">
            {direction === "USDC_TO_EURC" ? "USDC" : "EURC*"}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="relative flex justify-center py-1">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-px w-full bg-gray-800" />
        </div>
        <div className="relative z-10 rounded-full border border-gray-800 bg-[#0f1115] p-1.5 text-gray-500">
          <ArrowDownUp size={14} />
        </div>
      </div>

      {/* Receive Input */}
      <div className="mt-2 mb-6 rounded-xl border border-gray-800 bg-[#0a0c10] p-4">
        <div className="mb-1 text-xs text-gray-400">You receive</div>
        <div className="flex items-center justify-between">
          <span className="text-xl font-semibold">
            {amount ? amount : "0.00"}
          </span>
          <span className="rounded-md bg-gray-800 px-2 py-1 text-xs font-medium">
            {direction === "USDC_TO_EURC" ? "EURC*" : "USDC"}
          </span>
        </div>
      </div>

      {/* Action Button */}
      {!isConnected ? (
        <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-medium transition hover:bg-blue-500">
          <Wallet size={18} /> Connect Wallet
        </button>
      ) : (
        <button
          onClick={handleSwap}
          disabled={isPending || !amount || Number(amount) <= 0}
          className="w-full rounded-xl bg-blue-600 py-3 font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Confirming..."
            : direction === "USDC_TO_EURC"
              ? "Swap to EURC"
              : "Redeem to USDC"}
        </button>
      )}

      <p className="mt-3 text-center text-[10px] text-gray-500">
        *Synthetic EURC credit. Internal accounting only. Redeem 1:1 for USDC via
        the hub.
      </p>
    </div>
  );
}