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