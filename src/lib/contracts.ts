/** Arc Mainnet — ArcLensHub Contract */
export const HUB_ADDRESS =
  (process.env.NEXT_PUBLIC_HUB_ADDRESS as `0x${string}`) ||
  "0xFb430BbC236b2FAcDB11c81d79eE551DFad14AF7";

export const MINI_SWAP_ADDRESS =
  "0xFb430BbC236b2FAcDB11c81d79eE551DFad14AF7" as const;

export const RECURRING_BUY_ADDRESS =
  "0xFb430BbC236b2FAcDB11c81d79eE551DFad14AF7" as const;

export const SELECTORS = {
  unlock: "0xa87131b0",
  swap: "0x8119c065",
  redeem: "0x0b006a75",
  createPlan: "0xe95fc90f",
  deposit: "0xb6b55f25",
  pull: "0x4d0392a8",
  cancel: "0x40e58ee5",
  creditOf: "0x75807250",
  withdrawOwed: "0x39a72c5c",
} as const;

export function toWeiHex(amountStr: string, decimals = 18): string {
  const cleaned = amountStr.trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) throw new Error("Invalid amount");
  const [whole, frac = ""] = cleaned.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return "0x" + BigInt(whole + fracPadded).toString(16);
}

export function padAddress(addr: string): string {
  return addr.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

export function padUint(n: bigint): string {
  return n.toString(16).padStart(64, "0");
}

export async function readCreditOf(
  user: string,
  rpcUrl: string,
): Promise<string> {
  const data = SELECTORS.creditOf + padAddress(user);
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: MINI_SWAP_ADDRESS, data }, "latest"],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? "creditOf failed");
  const wei = BigInt(json.result || "0x0");
  const whole = wei / BigInt(10 ** 18);
  const frac = (wei % BigInt(10 ** 18)).toString().padStart(18, "0").slice(0, 4);
  return `${whole}.${frac}`;
}
