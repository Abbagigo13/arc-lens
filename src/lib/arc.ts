export const ARC_MAINNET = {
  chainId: "0x13b2", // 5042
  chainIdDecimal: 5042,
  chainName: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: ["https://rpc.mainnet.arc.io", "https://rpc.arc.network"],
  blockExplorerUrls: ["https://explorer.arc.io"],
} as const;

export const ARC_TESTNET = {
  chainId: "0x4cef52", // 5042002
  chainIdDecimal: 5042002,
  chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: ["https://rpc.testnet.arc.network", "https://rpc.testnet.arc.io"],
  blockExplorerUrls: ["https://explorer.testnet.arc.io", "https://testnet.arcscan.app"],
} as const;

/** Testing = Mainnet */
export const DEFAULT_ARC = ARC_MAINNET;

/**
 * JSON-RPC helper with automatic failover. Tries each URL in `urls` in
 * order and only throws once every endpoint has failed — so a single
 * bad RPC node doesn't take the whole app down.
 */
export async function rpcRequest(
  method: string,
  params: unknown[] = [],
  urls: readonly string[] = DEFAULT_ARC.rpcUrls,
): Promise<string> {
  let lastError: unknown;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "RPC error");
      return json.result as string;
    } catch (err) {
      lastError = err; // try the next URL in the list
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All RPC endpoints failed");
}