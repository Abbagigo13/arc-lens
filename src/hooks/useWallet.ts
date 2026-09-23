"use client";

import { useWalletContext } from "@/context/WalletContext";
export type { EIP6963ProviderDetail, CustomWalletOption } from "@/context/WalletContext";

export function useWallet() {
  return useWalletContext();
}
