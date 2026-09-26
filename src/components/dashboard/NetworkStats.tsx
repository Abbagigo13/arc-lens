"use client";

import { useEffect, useState } from "react";
import { Blocks, Fuel, Activity, Link2 } from "lucide-react";
import StatCard from "./StatCard";
import { DEFAULT_ARC, rpcRequest } from "@/lib/arc";

type Stats = {
  block: string;
  gasGwei: string;
  chainId: string;
  status: "loading" | "live" | "error";
};

export default function NetworkStats() {
  const [stats, setStats] = useState<Stats>({
    block: "—",
    gasGwei: "—",
    chainId: String(DEFAULT_ARC.chainIdDecimal),
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [blockHex, gasHex, chainHex] = await Promise.all([
          rpcRequest("eth_blockNumber"),
          rpcRequest("eth_gasPrice"),
          rpcRequest("eth_chainId"),
        ]);
        if (cancelled) return;
        const block = parseInt(blockHex, 16).toLocaleString();
        const gasWei = BigInt(gasHex);
        const gwei = Number(gasWei) / 1e9;
        setStats({
          block,
          gasGwei: gwei < 0.001 ? "<0.001" : gwei.toFixed(4),
          chainId: String(parseInt(chainHex, 16)),
          status: "live",
        });
      } catch {
        if (!cancelled) setStats((s) => ({ ...s, status: "error" }));
      }
    }

    load();
    const id = setInterval(load, 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const isMainnet = Number(DEFAULT_ARC.chainIdDecimal) === 5042;
  const networkLabel = isMainnet ? "Arc Mainnet" : "Arc Testnet";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Overview</h2>
          <p className="text-xs text-slate-400">Live RPC signals · auto-refreshed (~12s)</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
            stats.status === "live"
              ? "bg-success/15 text-success border-success/30"
              : stats.status === "error"
                ? "bg-danger/15 text-danger border-danger/30"
                : "bg-muted/20 text-slate-300 border-slate-700"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              stats.status === "live"
                ? "bg-success animate-pulse"
                : stats.status === "error"
                  ? "bg-danger"
                  : "bg-muted"
            }`}
          />
          {stats.status === "live"
            ? `Live · ${networkLabel}`
            : stats.status === "error"
              ? "RPC unavailable"
              : "Connecting…"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Latest block"
          value={stats.block}
          hint="eth_blockNumber"
          trend="streaming"
          trendUp
          icon={Blocks}
          delay={0.05}
          spark={[6, 8, 7, 11, 9, 13, 10, 14]}
        />
        <StatCard
          label="Gas price"
          value={stats.gasGwei}
          hint="gwei · paid in USDC"
          trend="stable"
          trendUp
          icon={Fuel}
          delay={0.1}
          spark={[10, 10, 9, 11, 10, 10, 11, 10]}
        />
        <StatCard
          label="Chain ID"
          value={stats.chainId}
          hint={networkLabel}
          icon={Link2}
          delay={0.15}
          spark={[8, 8, 8, 8, 9, 8, 8, 8]}
        />
        <StatCard
          label="Activity"
          value={stats.status === "live" ? "Streaming" : "—"}
          hint="RPC Heartbeat"
          trend={stats.status === "live" ? "ok" : "—"}
          trendUp={stats.status === "live"}
          icon={Activity}
          delay={0.2}
          spark={[5, 9, 7, 12, 8, 14, 11, 15]}
        />
      </div>
    </div>
  );
}