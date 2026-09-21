import { DEFAULT_ARC } from "@/lib/arc";

/** Unlocker on Arc Mainnet (from Arc Studio) */
export const UNLOCKER_ADDRESS =
  "0xFb430BbC236b2FAcDB11c81d79eE551DFad14AF7" as const;

/** 0.01 USDC (18 decimals) in wei */
export const UNLOCK_PRICE_WEI = BigInt("10000000000000000"); // 0.01 * 10^18

/** unlock() */
export const UNLOCK_CALLDATA = "0xa69df4b5";

/**
 * unlocked(address) public getter
 * selector = first 4 bytes of keccak256("unlocked(address)")
 */
export const UNLOCKED_OF_SELECTOR = "0xd1846d0c";

export function unlockTxRequest(from: string) {
  return {
    from,
    to: UNLOCKER_ADDRESS,
    value: "0x" + UNLOCK_PRICE_WEI.toString(16),
    data: UNLOCK_CALLDATA,
  };
}

/** eth_call data for unlocked(user) */
export function unlockedCallData(userAddress: string): string {
  const addr = userAddress.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  return UNLOCKED_OF_SELECTOR + addr;
}

export function explorerTxUrl(hash: string) {
  const base =
    DEFAULT_ARC.blockExplorerUrls[0] ?? "https://explorer.mainnet.arc.io";
  return `${base}/tx/${hash}`;
}

export async function readUnlocked(
  userAddress: string,
  rpcUrl: string = DEFAULT_ARC.rpcUrls[0],
): Promise<boolean> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [
        {
          to: UNLOCKER_ADDRESS,
          data: unlockedCallData(userAddress),
        },
        "latest",
      ],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? "eth_call failed");
  const result = json.result as string;
  // bool: last byte non-zero
  return BigInt(result || "0x0") !== BigInt(0);
}