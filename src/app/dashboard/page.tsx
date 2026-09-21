"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  LayoutDashboard,
  Send,
  Bot,
  Unlock,
  ArrowDownUp,
  Repeat,
} from "lucide-react";
import NetworkStats from "@/components/dashboard/NetworkStats";
import VolumeChart from "@/components/dashboard/VolumeChart";
import AiPanel from "@/components/dashboard/AiPanel";
import SendUsdc from "@/components/dashboard/SendUsdc";
import ConnectWallet from "@/components/ConnectWallet";
import SwapPanel from "@/components/dashboard/SwapPanel";
import RecurringPanel from "@/components/dashboard/RecurringPanel";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "send", label: "Send", icon: Send },
  { id: "swap", label: "Swap", icon: ArrowDownUp },
  { id: "recurring", label: "Recurring", icon: Repeat },
  { id: "ai", label: "AI", icon: Bot },
  { id: "unlock", label: "Unlock", icon: Unlock },
];

export default function DashboardPage() {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

      <div className="relative flex min-h-screen">
        {/* Left rail */}
        <aside className="hidden w-52 shrink-0 flex-col border-r border-card-border bg-background/80 p-4 backdrop-blur-xl md:flex">
          <Link href="/" className="mb-8 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-accent">
              <Activity className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-sm font-semibold text-foreground">
              Arc<span className="text-accent">Lens</span>
            </span>
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground"
              >
                <item.icon className="h-4 w-4 text-accent" aria-hidden />
                {item.label}
              </a>
            ))}
          </nav>
          <Link
            href="/"
            className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </aside>

              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-card-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
            <div className="md:hidden">
              <span className="text-sm font-semibold text-foreground">
                Arc<span className="text-accent">Lens</span>
              </span>
            </div>
            <p className="hidden text-xs text-muted sm:block">
              Insights · USDC native · AI unlock on Arc
            </p>
            <ConnectWallet />
          </header>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {/* Center column */}
            <main className="min-w-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
              <motion.div
                id="overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  Network dashboard
                </h1>
                <p className="mt-0.5 text-sm text-muted">
                  Live Arc signals · pay USDC to unlock AI explanations
                </p>
              </motion.div>

              <NetworkStats />
              <VolumeChart />

              <div id="send" className="scroll-mt-4">
                <SendUsdc />
              </div>

              <div
                id="swap"
                className="grid scroll-mt-4 gap-4 lg:grid-cols-2"
              >
                <SwapPanel />
                <RecurringPanel />
              </div>
            </main>

            {/* Right AI rail */}
            <aside
              id="ai"
              className="w-full shrink-0 border-t border-card-border p-4 lg:w-90 lg:max-w-90 lg:border-l lg:border-t-0 lg:overflow-y-auto"
            >
              <div
                id="unlock"
                className="flex min-h-120 flex-col lg:min-h-[calc(100vh-4.5rem)]"
              >
                <AiPanel />
              </div>
            </aside>
          </div>
        </div>
            </div>
          </div>
        );
      }