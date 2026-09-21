"use client";

import { motion } from "framer-motion";

const SERIES = [42, 55, 48, 70, 62, 88, 75, 95, 80, 110, 98, 120];
const BARS = [
  { label: "Transfers", value: 92 },
  { label: "Contract calls", value: 68 },
  { label: "Unlocks", value: 44 },
  { label: "Failed", value: 18 },
];

export default function VolumeChart() {
  const max = Math.max(...SERIES);
  const w = 400;
  const h = 160;
  const pad = 8;
  const points = SERIES.map((v, i) => {
    const x = pad + (i / (SERIES.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  const area = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
        className="card-surface rounded-2xl p-5 lg:col-span-3"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Network activity</h2>
            <p className="text-xs text-slate-400">Live block indexing & throughput</p>
          </div>
          <span className="text-xs font-semibold text-success bg-success/10 px-2.5 py-0.5 rounded-full border border-success/20">
            ↑ Active
          </span>
        </div>
        <div className="w-full overflow-hidden">
          <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full" aria-hidden>
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((t) => (
              <line
                key={t}
                x1={pad}
                x2={w - pad}
                y1={pad + t * (h - pad * 2)}
                y2={pad + t * (h - pad * 2)}
                stroke="currentColor"
                className="text-card-border"
                strokeWidth="1"
              />
            ))}
            <polygon fill="url(#areaFill)" points={area} />
            <polyline
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              points={points}
            />
            <circle
              cx={points.split(" ").at(-1)?.split(",")[0]}
              cy={points.split(" ").at(-1)?.split(",")[1]}
              r="4"
              fill="#22d3ee"
            />
          </svg>
        </div>
        <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-400">
          <span>−12 blocks</span>
          <span>Latest block</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.18 }}
        className="card-surface rounded-2xl p-5 lg:col-span-2"
      >
        <h2 className="text-sm font-semibold text-foreground">App usage mix</h2>
        <p className="mb-4 text-xs text-slate-400">Transaction category breakdown</p>
        <ul className="space-y-3.5">
          {BARS.map((b) => (
            <li key={b.label}>
              <div className="mb-1 flex justify-between text-xs font-medium">
                <span className="text-slate-300">{b.label}</span>
                <span className="font-mono text-foreground font-semibold">{b.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-900 border border-card-border/60">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${b.value}%` }}
                  transition={{ duration: 0.6, delay: 0.25 }}
                  className={`h-full rounded-full ${
                    b.label === "Failed"
                      ? "bg-danger"
                      : "bg-gradient-to-r from-primary to-accent"
                  }`}
                />
              </div>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}
