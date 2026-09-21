"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_ARC } from "@/lib/arc";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
  isOkxWallet?: boolean;
  isCoinbaseWallet?: boolean;
  providers?: EthereumProvider[];
};

export type WalletOption = {
  id: string;
  name: string;
  provider: EthereumProvider;
};

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function toWeiHex(amountStr: string, decimals = 18): string {
  const cleaned = amountStr.trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) throw new Error("Invalid amount");
  const [whole, frac = ""] = cleaned.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const wei = BigInt(whole + fracPadded);
  return "0x" + wei.toString(16);
}

function isAddress(a: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(a.trim());
}

function nameFor(p: EthereumProvider): string {
  if (p.isMetaMask) return "MetaMask";
  if (p.isOkxWallet) return "OKX Wallet";
  if (p.isCoinbaseWallet) return "Coinbase Wallet";
  return "Browser Wallet";
}

function discoverWallets(): WalletOption[] {
  if (typeof window === "undefined") return [];
  const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
  if (!eth) return [];

  const list: EthereumProvider[] = [];
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    list.push(...eth.providers);
  } else {
    list.push(eth);
  }

  const seen = new Set<string>();
  const options: WalletOption[] = [];
  list.forEach((p, i) => {
    const name = nameFor(p);
    if (seen.has(name)) return;
    seen.add(name);
    options.push({ id: `${name}-${i}`, name, provider: p });
  });
  return options;
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletOption[]>(() => discoverWallets());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<EthereumProvider | null>(null);

  const bindProvider = useCallback((eth: EthereumProvider) => {
    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAddress(accounts?.[0] ?? null);
    };
    const onChain = (...args: unknown[]) => {
      const cid = args[0] as string;
      setChainId(parseInt(cid, 16));
    };
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  useEffect(() => {
    if (!activeProvider) return;
    return bindProvider(activeProvider);
  }, [activeProvider, bindProvider]);

  const ensureArcNetwork = useCallback(async (eth: EthereumProvider) => {
    const target = DEFAULT_ARC;
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: target.chainId }],
      });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 4902) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: target.chainId,
              chainName: target.chainName,
              nativeCurrency: target.nativeCurrency,
              rpcUrls: [...target.rpcUrls],
              blockExplorerUrls: [...target.blockExplorerUrls],
            },
          ],
        });
      } else {
        throw err;
      }
    }
  }, []);

  const connectWith = useCallback(
    async (option: WalletOption) => {
      setConnecting(true);
      setError(null);
      setPickerOpen(false);
      try {
        const eth = option.provider;
        setActiveProvider(eth);
        const accounts = (await eth.request({
          method: "eth_requestAccounts",
        })) as string[];
        setAddress(accounts[0] ?? null);
        await ensureArcNetwork(eth);
        const cid = (await eth.request({ method: "eth_chainId" })) as string;
        setChainId(parseInt(cid, 16));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Connection failed";
        setError(msg);
      } finally {
        setConnecting(false);
      }
    },
    [ensureArcNetwork],
  );

  const connect = useCallback(async () => {
    const found = discoverWallets();
    setWallets(found);
    if (found.length === 0) {
      setError("No wallet found. Install MetaMask or OKX.");
      return;
    }
    if (found.length === 1) {
      await connectWith(found[0]);
      return;
    }
    setPickerOpen(true);
  }, [connectWith]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
    setActiveProvider(null);
  }, []);

  const sendNativeUsdc = useCallback(
    async (to: string, amountUsdc: string) => {
      if (!activeProvider || !address) {
        throw new Error("Connect a wallet first");
      }
      if (!isAddress(to)) throw new Error("Invalid recipient address");
      const value = toWeiHex(amountUsdc, 18);
      await ensureArcNetwork(activeProvider);
      const txHash = (await activeProvider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: address,
            to: to.trim(),
            value,
          },
        ],
      })) as string;
      return txHash;
    },
    [activeProvider, address, ensureArcNetwork],
  );

  const payUnlock = useCallback(async () => {
    if (!activeProvider || !address) {
      throw new Error("Connect a wallet first");
    }
    await ensureArcNetwork(activeProvider);
    const { unlockTxRequest } = await import("@/lib/unlocker");
    const tx = unlockTxRequest(address);
    const txHash = (await activeProvider.request({
      method: "eth_sendTransaction",
      params: [tx],
    })) as string;
    return txHash;
  }, [activeProvider, address, ensureArcNetwork]);
    const sendContractTx = useCallback(
    async (to: string, data: string, valueWeiHex: string = "0x0") => {
      if (!activeProvider || !address) {
        throw new Error("Connect a wallet first");
      }
      await ensureArcNetwork(activeProvider);
      const txHash = (await activeProvider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: address,
            to,
            data,
            value: valueWeiHex,
          },
        ],
      })) as string;
      return txHash;
    },
    [activeProvider, address, ensureArcNetwork],
  );

  const onArc =
    chainId === DEFAULT_ARC.chainIdDecimal ||
    chainId === 5042 ||
    chainId === 5042002;

  return {
    address,
    shortAddress: address ? shortAddress(address) : null,
    chainId,
    onArc,
    connecting,
    error,
    connect,
    connectWith,
    disconnect,
    isConnected: Boolean(address),
    wallets,
    pickerOpen,
    setPickerOpen,
    sendNativeUsdc,
    payUnlock,
    sendContractTx,
  };
}