"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import FeatureCards from "@/components/landing/FeatureCards";
import HowItWorks from "@/components/landing/HowItWorks";

const ArcScene = dynamic(() => import("@/components/landing/ArcScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-90 w-full items-center justify-center sm:h-110 lg:h-130">
      <div className="h-24 w-24 animate-pulse rounded-full bg-primary/20" />
    </div>
  ),
});

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
      <Navbar />

      <main className="relative pt-16">
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-card-border bg-card/80 px-3 py-1 text-xs font-medium text-accent">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Arc · USDC-native · AI actions on-chain
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              See Arc clearly.
              <span className="block text-gradient">Act with USDC.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg"
            >
              ArcLens is a live network dashboard for Circle&apos;s Arc chain — with an AI that
              explains the numbers and can propose{" "}
              <span className="text-foreground">send</span>,{" "}
              <span className="text-foreground">swap</span>, and{" "}
              <span className="text-foreground">recurring</span> flows. You always confirm in
              your wallet. Unlock is a real USDC payment on Arc.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Link
                href="/dashboard"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Launch dashboard
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a
                href="#features"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-card-border bg-card/50 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
              >
                See features
              </a>
            </motion.div>

            <motion.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-10 grid max-w-lg grid-cols-2 gap-4 sm:grid-cols-4"
            >
              {[
                { label: "Gas token", value: "USDC" },
                { label: "Testnet", value: "5042002" },
                { label: "Mainnet", value: "5042" },
                { label: "Finality", value: "Sub-sec" },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="text-xs text-muted">{stat.label}</dt>
                  <dd className="mt-1 font-mono text-sm font-semibold text-foreground">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            <ArcScene />
          </motion.div>
        </section>

        <FeatureCards />
        <HowItWorks />

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card-surface relative overflow-hidden rounded-3xl px-8 py-12 text-center sm:px-12"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
            <h2 className="relative text-2xl font-semibold text-foreground sm:text-3xl">
              Ready to read — and act on — the network?
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-sm text-muted">
              Open the dashboard, connect on Arc, unlock AI with USDC, then try chat actions like
              &quot;swap 0.01 USDC&quot; or &quot;recurring 0.01 every 60&quot;.
            </p>
            <Link
              href="/dashboard"
              className="relative mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Go to dashboard
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-card-border py-8 text-center text-xs text-muted">
        ArcLens · Built for Arc · USDC payments on-chain · Not financial advice
      </footer>
    </div>
  );
}