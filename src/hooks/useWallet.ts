"use client";

import { useState, useEffect } from "react";

export interface EIP6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: any;
}

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [providers, setProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // 1. Listen for EIP-6963 provider announcements
    const handleAnnounce = (event: CustomEvent<EIP6963ProviderDetail>) => {
      setProviders((prev) => {
        if (prev.some((p) => p.info.uuid === event.detail.info.uuid)) return prev;
        return [...prev, event.detail];
      });
    };

    window.addEventListener(
      "eip6963:announceProvider" as any,
      handleAnnounce as EventListener
    );

    // 2. Request providers to announce themselves
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    // 3. Fallback check for existing account
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
          }
        })
        .catch(console.error);
    }

    return () => {
      window.removeEventListener(
        "eip6963:announceProvider" as any,
        handleAnnounce as EventListener
      );
    };
  }, []);

  const connectWithProvider = async (detail: EIP6963ProviderDetail) => {
    setIsConnecting(true);
    try {
      const accounts = await detail.provider.request({
        method: "eth_requestAccounts",
      });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
  };

  return {
    account,
    providers,
    isConnecting,
    connectWithProvider,
    disconnectWallet,
  };
}
