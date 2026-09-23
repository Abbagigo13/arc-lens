"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ARC_MAINNET } from "@/lib/arc";

export interface EIP6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: any;
}

export interface CustomWalletOption {
  id: string;
  name: string;
  icon?: string;
  provider: any;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface WalletContextType {
  account: string | null;
  address: string | null;
  shortAddress: string;
  isConnected: boolean;
  onArc: boolean;
  connecting: boolean;
  isConnecting: boolean;
  error: string | null;
  providers: EIP6963ProviderDetail[];
  wallets: CustomWalletOption[];
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
  connect: () => void;
  connectWith: (wallet: CustomWalletOption) => Promise<void>;
  connectWithProvider: (detail: EIP6963ProviderDetail) => Promise<void>;
  disconnect: () => void;
  disconnectWallet: () => void;
  sendNativeUsdc: (to: string, amountEth: string) => Promise<string>;
  sendContractTx: (to: string, data: string, valueWei?: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [providers, setProviders] = useState<EIP6963ProviderDetail[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<any>(null);

  // Safely extract hex chain ID from ARC_MAINNET configuration
  const arcChainHex =
    "chainId" in ARC_MAINNET && typeof ARC_MAINNET.chainId === "string"
      ? ARC_MAINNET.chainId
      : "chainIdDecimal" in ARC_MAINNET
      ? `0x${Number(ARC_MAINNET.chainIdDecimal).toString(16)}`
      : "0x13b2";

  // Shared event setup & initial account check
  useEffect(() => {
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

    window.dispatchEvent(new Event("eip6963:requestProvider"));

    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            setActiveProvider(window.ethereum);
          }
        })
        .catch(console.error);

      window.ethereum
        .request({ method: "eth_chainId" })
        .then((cid: string) => setChainId(cid))
        .catch(console.error);
    }

    return () => {
      window.removeEventListener(
        "eip6963:announceProvider" as any,
        handleAnnounce as EventListener
      );
    };
  }, []);

  // Listen to EIP-1193 provider events for real-time account and chain sync
  useEffect(() => {
    const provider = activeProvider || (typeof window !== "undefined" ? window.ethereum : null);
    if (!provider || !provider.on) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
      } else {
        setAccount(null);
      }
    };

    const handleChainChanged = (hexChainId: string) => {
      setChainId(hexChainId);
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      if (provider.removeListener) {
        provider.removeListener("accountsChanged", handleAccountsChanged);
        provider.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [activeProvider]);

  const connectWithProvider = async (detail: EIP6963ProviderDetail) => {
    setConnecting(true);
    setError(null);
    try {
      const accounts = await detail.provider.request({
        method: "eth_requestAccounts",
      });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setActiveProvider(detail.provider);
        const cid = await detail.provider.request({ method: "eth_chainId" });
        setChainId(cid);
      }
    } catch (err: any) {
      console.error("Wallet connection error:", err);
      setError(err?.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
      setPickerOpen(false);
    }
  };

  const connectWith = async (wallet: CustomWalletOption) => {
    if (wallet.provider) {
      await connectWithProvider({
        info: { uuid: wallet.id, name: wallet.name, icon: "", rdns: "" },
        provider: wallet.provider,
      });
    }
  };

  const connect = () => {
    setPickerOpen(true);
  };

  const disconnect = () => {
    setAccount(null);
    setActiveProvider(null);
    setError(null);
  };

  const sendNativeUsdc = async (to: string, amountEth: string) => {
    const provider = activeProvider || (typeof window !== "undefined" ? window.ethereum : null);
    if (!provider || !account) throw new Error("Wallet not connected");

    const weiValue = "0x" + BigInt(Math.floor(parseFloat(amountEth) * 1e18)).toString(16);
    return await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: account,
          to,
          value: weiValue,
        },
      ],
    });
  };

  const sendContractTx = async (to: string, data: string, valueWei: string = "0x0") => {
    const provider = activeProvider || (typeof window !== "undefined" ? window.ethereum : null);
    if (!provider || !account) throw new Error("Wallet not connected");

    return await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: account,
          to,
          data,
          value: valueWei.startsWith("0x") ? valueWei : "0x" + BigInt(valueWei).toString(16),
        },
      ],
    });
  };

  const eip6963Wallets: CustomWalletOption[] = providers.map((p) => ({
    id: p.info.uuid,
    name: p.info.name,
    icon: p.info.icon,
    provider: p.provider,
  }));

  const fallbackWallet: CustomWalletOption[] =
    typeof window !== "undefined" && window.ethereum
      ? [
          {
            id: "browser-injected",
            name: "Browser Wallet",
            icon: "",
            provider: window.ethereum,
          },
        ]
      : [];

  const wallets = eip6963Wallets.length > 0 ? eip6963Wallets : fallbackWallet;

  const isConnected = Boolean(account);
  const address = account;
  const shortAddress = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "";
  const onArc = chainId ? chainId.toLowerCase() === arcChainHex.toLowerCase() : false;

  return (
    <WalletContext.Provider
      value={{
        account,
        address,
        shortAddress,
        isConnected,
        onArc,
        connecting,
        isConnecting: connecting,
        error,
        providers,
        wallets,
        pickerOpen,
        setPickerOpen,
        connect,
        connectWith,
        connectWithProvider,
        disconnect,
        disconnectWallet: disconnect,
        sendNativeUsdc,
        sendContractTx,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
