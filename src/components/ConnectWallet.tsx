"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Wallet, X } from "lucide-react";
import { useWallet, CustomWalletOption } from "@/hooks/useWallet";

export default function ConnectWallet() {
  const {
    isConnected,
    shortAddress,
    onArc,
    connecting,
    error,
    connectWith,
    disconnect,
    wallets,
    pickerOpen,
    setPickerOpen,
  } = useWallet();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; right: number }>({
    top: 0,
    right: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (pickerOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right - window.scrollX,
      });
    }
  }, [pickerOpen]);

  if (isConnected && shortAddress) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={disconnect}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-card-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
          title="Click to disconnect"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              onArc ? "bg-success" : "bg-accent-warm"
            }`}
          />
          {shortAddress}
        </button>
        {!onArc ? (
          <span className="text-[10px] text-accent-warm">Switch wallet to Arc</span>
        ) : (
          <span className="text-[10px] text-success">Arc connected</span>
        )}
        {error ? (
          <span className="max-w-50 text-[10px] text-danger">{error}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-end gap-1">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setPickerOpen(!pickerOpen)}
        disabled={connecting}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-card-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 disabled:opacity-50"
      >
        <Wallet className="h-4 w-4 text-accent" aria-hidden />
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>

      {error ? (
        <span className="max-w-55 text-[10px] text-danger">{error}</span>
      ) : null}

      {pickerOpen && mounted
        ? createPortal(
            <div
              style={{
                top: `${coords.top}px`,
                right: `${coords.right}px`,
              }}
              className="fixed z-[9999] w-56 overflow-hidden rounded-xl border border-card-border bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-card-border px-3 py-2">
                <span className="text-xs font-medium text-foreground">Choose wallet</span>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="cursor-pointer rounded p-0.5 text-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <ul className="py-1">
                {wallets && wallets.length > 0 ? (
                  wallets.map((w: CustomWalletOption) => (
                    <li key={w.id}>
                      <button
                        type="button"
                        onClick={() => connectWith(w)}
                        className="flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-white/5"
                      >
                        <div className="flex items-center gap-2">
                          {w.icon ? (
                            <img
                              src={w.icon}
                              alt={w.name}
                              className="h-4 w-4 object-contain rounded"
                            />
                          ) : (
                            <Wallet className="h-4 w-4 text-accent" />
                          )}
                          <span>{w.name}</span>
                        </div>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-3 text-center text-xs text-muted">
                    No wallets detected
                  </li>
                )}
              </ul>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
