"use client";

import { useState, useEffect } from "react";
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

export function useWallet() {
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

  const wallets: CustomWalletOption[] = providers.map((p) => ({
    id: p.info.uuid,
    name: p.info.name,
    icon: p.info.icon,
    provider: p.provider,
  }));

  const isConnected = Boolean(account);
  const address = account;
  const shortAddress = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "";
  const onArc = chainId ? chainId.toLowerCase() === arcChainHex.toLowerCase() : false;

  return {
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
  };
}
