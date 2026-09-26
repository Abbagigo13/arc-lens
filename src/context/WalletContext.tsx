"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ARC_MAINNET } from "@/lib/arc";
import { toWeiHex } from "@/lib/contracts";

// Minimal EIP-1193 provider shape — covers what this app actually calls
// (request/on/removeListener) without resorting to `any`.
export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: <Args extends unknown[]>(event: string, handler: (...args: Args) => void) => void;
  removeListener?: <Args extends unknown[]>(event: string, handler: (...args: Args) => void) => void;
}

export interface EIP6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: Eip1193Provider;
}

export interface CustomWalletOption {
  id: string;
  name: string;
  icon?: string;
  provider: Eip1193Provider;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export interface WalletContextType {
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
  const [activeProvider, setActiveProvider] = useState<Eip1193Provider | null>(null);

  const arcChainHex =
    "chainId" in ARC_MAINNET && typeof ARC_MAINNET.chainId === "string"
      ? ARC_MAINNET.chainId
      : "chainIdDecimal" in ARC_MAINNET
      ? `0x${Number(ARC_MAINNET.chainIdDecimal).toString(16)}`
      : "0x13b2";

  useEffect(() => {
    const handleAnnounce = (event: CustomEvent<EIP6963ProviderDetail>) => {
      setProviders((prev) => {
        if (prev.some((p) => p.info.uuid === event.detail.info.uuid)) return prev;
        return [...prev, event.detail];
      });
    };

    window.addEventListener(
      "eip6963:announceProvider",
      handleAnnounce as EventListener
    );

    window.dispatchEvent(new Event("eip6963:requestProvider"));

    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((result) => {
          const accounts = result as string[];
          if (accounts && accounts.length > 0) {
            setAccount(accounts[0]);
            setActiveProvider(window.ethereum ?? null);
          }
        })
        .catch(console.error);

      window.ethereum
        .request({ method: "eth_chainId" })
        .then((result) => setChainId(result as string))
        .catch(console.error);
    }

    return () => {
      window.removeEventListener(
        "eip6963:announceProvider",
        handleAnnounce as EventListener
      );
    };
  }, []);

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
      const accounts = (await detail.provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setActiveProvider(detail.provider);
        const cid = (await detail.provider.request({ method: "eth_chainId" })) as string;
        setChainId(cid);
      }
    } catch (err: unknown) {
      console.error("Wallet connection error:", err);
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
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

    // Exact decimal-string math — avoids float rounding error that
    // Math.floor(parseFloat(amountEth) * 1e18) introduced for real amounts.
    const weiValue = toWeiHex(amountEth, 18);
    const hash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: account,
          to,
          value: weiValue,
        },
      ],
    });
    return hash as string;
  };

  const sendContractTx = async (to: string, data: string, valueWei: string = "0x0") => {
    const provider = activeProvider || (typeof window !== "undefined" ? window.ethereum : null);
    if (!provider || !account) throw new Error("Wallet not connected");

    const hash = await provider.request({
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
    return hash as string;
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

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
}