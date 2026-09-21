"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  hint?: string;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  delay?: number;
  spark?: number[];
};

export default function StatCard({
  label,
  value,
  hint,
  trend,
  trendUp = true,
  icon: Icon,
  delay = 0,
  spark = [4, 8, 6, 10, 7, 12, 9, 14],
}: Props) {
  const max = Math.max(...spark, 1);
  const w = 64;
  const h = 28;
  const points = spark
    .map((v, i) => {
      const x = (i / (spark.length - 1)) * w;
      const y = h - (v / max) * (h - 4);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="card-surface rounded-2xl border border-slate-800 p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
          {label}
        </p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent border border-accent/20">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          {trend ? (
            <p
              className={`text-xs font-semibold ${
                trendUp ? "text-success" : "text-danger"
              }`}
            >
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          ) : null}
          {hint ? <p className="text-[11px] font-medium text-slate-400">{hint}</p> : null}
        </div>
        <svg width={w} height={h} className="opacity-90" aria-hidden>
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-accent"
            points={points}
          />
        </svg>
      </div>
    </motion.div>
  );
}
