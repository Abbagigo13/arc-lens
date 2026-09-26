"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { DEFAULT_ARC, rpcRequest } from "@/lib/arc";
import { useWalletContext } from "@/context/WalletContext";

// Action Intent type definitions for AI automation hooks
export type ActionIntent =
  | { type: "SWAP"; fromToken: string; toToken: string; amount: string }
  | { type: "SEND"; recipient: string; amount: string; token: string }
  | { type: "RECURRING"; amount: string; intervalSeconds: number; recipient?: string };

export type DashboardState = {
  network: {
    block: string;
    gasGwei: string;
    chainId: string;
    status: "loading" | "live" | "error";
  };
  user: {
    address: string | null;
    usdcBalance: string;
    eurcCredit: string | null;
    isUnlocked: boolean;
  };
  activity: {
    recentTxs: Array<{ hash: string; type: string; timestamp: number }>;
    volumeSeries: number[];
  };
};

const defaultState: DashboardState = {
  network: { block: "—", gasGwei: "—", chainId: "5042", status: "loading" },
  user: { address: null, usdcBalance: "0", eurcCredit: null, isUnlocked: false },
  activity: { recentTxs: [], volumeSeries: [42, 55, 48, 70, 62, 88, 75, 95] },
};

const DashboardContext = createContext<{
  state: DashboardState;
  updateUser: (user: Partial<DashboardState["user"]>) => void;
  addTx: (tx: { hash: string; type: string }) => void;
}>({
  state: defaultState,
  updateUser: () => {},
  addTx: () => {},
});

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DashboardState>(defaultState);

  const updateUser = (user: Partial<DashboardState["user"]>) => {
    setState((prev) => ({ ...prev, user: { ...prev.user, ...user } }));
  };

  const addTx = (tx: { hash: string; type: string }) => {
    setState((prev) => ({
      ...prev,
      activity: {
        ...prev.activity,
        recentTxs: [{ ...tx, timestamp: Date.now() }, ...prev.activity.recentTxs.slice(0, 4)],
      },
    }));
  };

  // Poll RPC for live metrics (now with failover across DEFAULT_ARC.rpcUrls)
  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      try {
        const [blockHex, gasHex] = await Promise.all([
          rpcRequest("eth_blockNumber"),
          rpcRequest("eth_gasPrice"),
        ]);
        if (cancelled) return;

        const block = parseInt(blockHex, 16).toLocaleString();
        const gwei = Number(BigInt(gasHex)) / 1e9;

        setState((prev) => ({
          ...prev,
          network: {
            block,
            gasGwei: gwei < 0.001 ? "<0.001" : gwei.toFixed(4),
            chainId: String(DEFAULT_ARC.chainIdDecimal),
            status: "live",
          },
        }));
      } catch {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            network: { ...prev.network, status: "error" },
          }));
        }
      }
    }

    fetchStats();
    const id = setInterval(fetchStats, 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Keep the wallet's native USDC balance in sync — previously this never
  // updated at all, so the "USDC Balance" stat and the AI's snapshot always
  // saw a hardcoded "0".
  const { address } = useWalletContext();

  useEffect(() => {
    if (!address) {
      return;
    }
    let cancelled = false;

    async function fetchBalance() {
      try {
        const result = await rpcRequest("eth_getBalance", [address, "latest"]);
        if (cancelled) return;
        const wei = BigInt(result || "0x0");
        const whole = wei / BigInt(10 ** 18);
        const frac = (wei % BigInt(10 ** 18)).toString().padStart(18, "0").slice(0, 4);
        updateUser({ usdcBalance: `${whole}.${frac}`, address });
      } catch {
        // leave the last known balance on a transient RPC error
      }
    }

    fetchBalance();
    const id = setInterval(fetchBalance, 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [address]);

  const dashboardState: DashboardState = address
    ? state
    : {
        ...state,
        user: {
          ...state.user,
          address: null,
          usdcBalance: "0",
        },
      };

  return (
    <DashboardContext.Provider value={{ state: dashboardState, updateUser, addTx }}>
      {children}
    </DashboardContext.Provider>
  );
}

export const useDashboard = () => useContext(DashboardContext);