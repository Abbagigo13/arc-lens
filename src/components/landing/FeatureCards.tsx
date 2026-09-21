"use client";

import { motion } from "framer-motion";
import { BarChart3, Bot, Wallet, ArrowDownUp, Repeat, MessageSquare } from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Live network pulse",
    body: "Block height, gas in USDC, and chain health — refreshed continuously so the dashboard always matches the chain.",
  },
  {
    icon: Bot,
    title: "AI that reads the board",
    body: "Qwen explains live metrics in plain English. Ask about the latest block, gas, or why Arc uses USDC for fees.",
  },
  {
    icon: Wallet,
    title: "USDC unlock on Arc",
    body: "Open full AI sessions with a small on-chain USDC payment. The product settles where the data lives.",
  },
  {
    icon: MessageSquare,
    title: "Chat → actions",
    body: "Type “swap 0.01 USDC” or “send 0.01 to me”. ArcLens proposes a card; you always confirm in your wallet.",
  },
  {
    icon: ArrowDownUp,
    title: "MiniSwap",
    body: "Native USDC to synthetic credit on testnet — proof of swap flow without leaving the app.",
  },
  {
    icon: Repeat,
    title: "Recurring buy",
    body: "Create plans, pull on interval, cancel with refund. Full lifecycle for scheduled USDC moves.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function FeatureCards() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45 }}
        className="mb-12 max-w-2xl"
      >
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-accent">
          Built for Arc
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Insights, payments, and an agent — in one place
        </h2>
        <p className="mt-3 text-muted">
          Not another explorer clone. ArcLens combines a live ops dashboard, USDC-native
          actions, and an AI that can explain the screen and propose the next step.
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {features.map(({ icon: Icon, title, body }) => (
          <motion.article
            key={title}
            variants={item}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="card-surface rounded-2xl p-6"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-accent">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}