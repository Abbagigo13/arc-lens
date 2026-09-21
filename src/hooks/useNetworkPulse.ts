"use client";

import { useEffect, useState } from "react";
import { DEFAULT_ARC } from "@/lib/arc";

export type NetworkPulse = {
  block: string;
  gasGwei: string;
  chainId: string;
  status: "loading" | "live" | "error";
  networkLabel: string;
};

export function useNetworkPulse(): NetworkPulse {
  const [pulse, setPulse] = useState<NetworkPulse>({
    block: "—",
    gasGwei: "—",
    chainId: String(DEFAULT_ARC.chainIdDecimal),
    status: "loading",
    networkLabel:
      DEFAULT_ARC.chainIdDecimal === 5042 ? "Arc Mainnet" : "Arc Testnet",
  });

  useEffect(() => {
    let cancelled = false;
    const rpcUrl = DEFAULT_ARC.rpcUrls[0];

    async function rpc(method: string) {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      return json.result as string;
    }

    async function load() {
      try {
        const [blockHex, gasHex, chainHex] = await Promise.all([
          rpc("eth_blockNumber"),
          rpc("eth_gasPrice"),
          rpc("eth_chainId"),
        ]);
        if (cancelled) return;
        const gwei = Number(BigInt(gasHex)) / 1e9;
        setPulse({
          block: parseInt(blockHex, 16).toLocaleString(),
          gasGwei: gwei < 0.001 ? "<0.001" : gwei.toFixed(4),
          chainId: String(parseInt(chainHex, 16)),
          status: "live",
          networkLabel:
            DEFAULT_ARC.chainIdDecimal === 5042 ? "Arc Mainnet" : "Arc Testnet",
        });
      } catch {
        if (!cancelled) setPulse((s) => ({ ...s, status: "error" }));
      }
    }

    load();
    const id = setInterval(load, 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return pulse;
}