"use client";

import { Box, Fuel, Wallet, Activity } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import StatCard from "@/components/dashboard/StatCard";

export default function DashboardOverview() {
  const { state } = useDashboard();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Live Block Number */}
      <StatCard
        label="Latest Block"
        value={state.network.block}
        hint={state.network.status === "live" ? "Arc Mainnet (5042)" : "Syncing RPC..."}
        icon={Box}
        spark={[12, 14, 15, 18, 20, 22, 25, 28]}
        delay={0.05}
      />

      {/* Live Gas Price in USDC */}
      <StatCard
        label="USDC Gas Price"
        value={`${state.network.gasGwei} Gwei`}
        hint="Sub-second finality"
        trend="Native USDC Gas"
        trendUp={true}
        icon={Fuel}
        spark={[4, 5, 4, 6, 5, 4, 4, 4]}
        delay={0.1}
      />

      {/* Wallet Balance */}
      <StatCard
        label="USDC Balance"
        value={`${state.user.usdcBalance} USDC`}
        hint={state.user.address ? `${state.user.address.slice(0, 6)}...${state.user.address.slice(-4)}` : "Wallet disconnected"}
        icon={Wallet}
        spark={[100, 105, 110, 108, 120, 125, 130]}
        delay={0.15}
      />

      {/* Session Activity */}
      <StatCard
        label="Recent Activity"
        value={`${state.activity.recentTxs.length} Txns`}
        hint="Recorded this session"
        icon={Activity}
        spark={state.activity.volumeSeries}
        delay={0.2}
      />
    </div>
  );
}
