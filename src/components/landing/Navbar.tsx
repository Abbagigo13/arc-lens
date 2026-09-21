"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";

export default function Navbar() {
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-accent">
            <Activity className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-wide text-foreground">
            Arc<span className="text-accent">Lens</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted sm:flex">
          <a href="#features" className="cursor-pointer transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#how" className="cursor-pointer transition-colors hover:text-foreground">
            How it works
          </a>
          <Link href="/dashboard" className="cursor-pointer transition-colors hover:text-foreground">
            Dashboard
          </Link>
        </nav>

        <Link
          href="/dashboard"
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Open dashboard
        </Link>
      </div>
    </motion.header>
  );
}
