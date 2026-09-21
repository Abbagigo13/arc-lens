"use client";

import { motion } from "framer-motion";

const steps = [
  {
    step: "01",
    title: "Read the network",
    body: "Live block, gas (USDC), and chain ID from Arc RPC — the same signals the AI can explain.",
  },
  {
    step: "02",
    title: "Connect & unlock",
    body: "Connect a wallet on Arc and pay a small USDC amount on-chain to open full AI sessions.",
  },
  {
    step: "03",
    title: "Ask or act",
    body: "Get plain-English answers, or type swap / send / recurring — confirm every tx in your wallet.",
  },
  {
    step: "04",
    title: "Manage plans",
    body: "Create recurring buys, pull when due, cancel with refund. Swap and track synthetic credit.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="mb-10"
      >
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          How it works
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          From pulse to paywall to agent-style actions — always with explicit wallet confirmation.
        </p>
      </motion.div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="relative rounded-2xl border border-card-border bg-card/60 p-6"
          >
            <span className="font-mono text-sm text-accent">{s.step}</span>
            <h3 className="mt-3 text-lg font-semibold text-foreground">{s.title}</h3>
            <p className="mt-2 text-sm text-muted">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}