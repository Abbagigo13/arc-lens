"use client";

import { useState } from "react";
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
  Menu,
  X,
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
  { id: "ai", label: "AI Guide", icon: Bot },
  { id: "unlock", label: "Unlock", icon: Unlock },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

      <div className="relative flex min-h-screen w-full">
        {/* Desktop Sidebar Rail */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-card-border bg-background/80 p-5 backdrop-blur-xl md:flex">
          <Link href="/" className="mb-8 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-accent">
              <Activity className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">
              Arc<span className="text-accent">Lens</span>
            </span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1.5">
            {NAV.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                    isActive
                      ? "bg-primary/15 font-medium text-accent border border-primary/20"
                      : "text-muted hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${isActive ? "text-accent" : "text-muted"}`} aria-hidden />
                  {item.label}
                </a>
              );
            })}
          </nav>

          <Link
            href="/"
            className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </aside>

        {/* Main Interface */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Header */}
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-card-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
            <div className="flex items-center gap-3 md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-card-border bg-card/60 text-foreground"
                aria-label="Toggle Navigation"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <span className="text-base font-semibold text-foreground">
                Arc<span className="text-accent">Lens</span>
              </span>
            </div>

            <p className="hidden text-xs text-muted sm:block">
              Insights · USDC native · AI unlock on Arc
            </p>

            <div className="flex items-center gap-3">
              <ConnectWallet />
            </div>
          </header>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="border-b border-card-border bg-card/95 p-4 backdrop-blur-xl md:hidden">
              <nav className="grid grid-cols-2 gap-2">
                {NAV.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 rounded-lg border border-card-border/50 bg-background/50 p-2.5 text-xs text-foreground"
                  >
                    <item.icon className="h-4 w-4 text-accent" />
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          )}

          {/* Dashboard Split View */}
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {/* Center Content Column */}
            <main className="w-full flex-1 space-y-6 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <motion.div
                id="overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  Network dashboard
                </h1>
                <p className="mt-1 text-xs text-muted sm:text-sm">
                  Live Arc signals · pay USDC to unlock AI explanations
                </p>
              </motion.div>

              <NetworkStats />
              <VolumeChart />

              <div id="send" className="scroll-mt-6">
                <SendUsdc />
              </div>

              <div id="swap" className="grid scroll-mt-6 gap-6 lg:grid-cols-2">
                <SwapPanel />
                <RecurringPanel />
              </div>
            </main>

            {/* Right AI Rail */}
            <aside
              id="ai"
              className="w-full shrink-0 border-t border-card-border p-4 sm:p-6 lg:w-[380px] lg:border-l lg:border-t-0 lg:overflow-y-auto"
            >
              <div id="unlock" className="flex h-full min-h-[500px] flex-col">
                <AiPanel />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
