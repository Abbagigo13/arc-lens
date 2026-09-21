"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { DEFAULT_ARC } from "@/lib/arc";

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

  // Poll RPC for live metrics
  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      try {
        const res = await fetch(DEFAULT_ARC.rpcUrls[0], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([
            { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] },
            { jsonrpc: "2.0", id: 2, method: "eth_gasPrice", params: [] },
          ]),
        });
        const [blockRes, gasRes] = await res.json();
        if (cancelled) return;

        const block = parseInt(blockRes.result, 16).toLocaleString();
        const gwei = Number(BigInt(gasRes.result)) / 1e9;

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

  return (
    <DashboardContext.Provider value={{ state, updateUser, addTx }}>
      {children}
    </DashboardContext.Provider>
  );
}

export const useDashboard = () => useContext(DashboardContext);
