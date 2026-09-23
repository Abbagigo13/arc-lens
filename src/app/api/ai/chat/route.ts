import { NextResponse } from "next/server";
import { HUB_ADDRESS, SELECTORS } from "@/lib/contracts";
import { DEFAULT_ARC } from "@/lib/arc";

const walletUsageMap = new Map<string, number>();
const guestIpUsageMap = new Map<string, number>();

const MAX_FREE_MESSAGES = 3;

async function checkOnChainUnlock(address: string): Promise<boolean> {
  try {
    const cleanAddress = address.replace("0x", "").padStart(64, "0");
    const data = `${SELECTORS.unlock}${cleanAddress}`;

    const rpcUrl =
      process.env.NEXT_PUBLIC_ARC_RPC_URL || DEFAULT_ARC.rpcUrls[0];
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: HUB_ADDRESS, data }, "latest"],
      }),
    });

    const json = await res.json();
    return (
      json.result && json.result !== "0x" && BigInt(json.result) === BigInt(1)
    );
  } catch (err) {
    console.error("Error verifying on-chain status:", err);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const { messages, snapshot } = await req.json();
    const userAddress = snapshot?.address?.toLowerCase();
    const clientIp = req.headers.get("x-forwarded-for") || "anonymous_ip";

    let isUnlocked = false;

    if (userAddress) {
      isUnlocked = await checkOnChainUnlock(userAddress);

      if (!isUnlocked) {
        const usageCount = walletUsageMap.get(userAddress) || 0;
        if (usageCount >= MAX_FREE_MESSAGES) {
          return NextResponse.json(
            {
              error: "PAYWALL_LOCKED",
              reply:
                "You've reached the 3-message free limit for this wallet. Unlock permanent AI access by paying 0.01 USDC on Arc.",
            },
            { status: 402 }
          );
        }
        walletUsageMap.set(userAddress, usageCount + 1);
      }
    } else {
      const ipCount = guestIpUsageMap.get(clientIp) || 0;
      if (ipCount >= MAX_FREE_MESSAGES) {
        return NextResponse.json(
          {
            error: "PAYWALL_LOCKED",
            reply:
              "You've reached your 3 free visitor queries. Connect your wallet and pay 0.01 USDC on Arc to unlock unlimited AI features.",
          },
          { status: 402 }
        );
      }
      guestIpUsageMap.set(clientIp, ipCount + 1);
    }

    const apiKey = process.env.DASHSCOPE_API_KEY;
    const systemPrompt = `You are ArcLens AI, an intelligent agent on Arc Network (Chain ID: ${snapshot?.chainId || "5042"}).
Current Network Snapshot:
- Latest Block: ${snapshot?.block || "Unknown"}
- Gas Price: ${snapshot?.gasGwei || "Unknown"} Gwei
- Connected Wallet: ${userAddress || "Not Connected"}
- USDC Balance: ${snapshot?.usdcBalance || "0"}

You can answer questions or propose actions in JSON blocks like:
{"type": "SWAP", "fromToken": "USDC", "toToken": "EURC", "amount": "0.01"}
{"type": "REDEEM", "amount": "0.01"}
{"type": "SEND", "recipient": "0x...", "amount": "0.01", "token": "USDC"}
{"type": "RECURRING", "amount": "0.01", "intervalSeconds": 60, "recipient": "0x..."}

Use REDEEM when the user wants to convert their synthetic EURC credit back to USDC.`;

    const apiRes = await fetch(
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen-plus",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
        }),
      }
    );

    const data = await apiRes.json();
    const replyContent =
      data.choices?.[0]?.message?.content || "No response received.";

    let intent = null;
    const jsonMatch = replyContent.match(
      /\{[\s\S]*"type"\s*:\s*"(SWAP|REDEEM|SEND|RECURRING)"[\s\S]*\}/
    );
    if (jsonMatch) {
      try {
        intent = JSON.parse(jsonMatch[0]);
      } catch (e) {
        // ignore parse errors
      }
    }

    return NextResponse.json({
      reply: replyContent,
      intent,
      isUnlocked,
      remainingFree: userAddress
        ? Math.max(
            0,
            MAX_FREE_MESSAGES - (walletUsageMap.get(userAddress) || 0)
          )
        : Math.max(0, MAX_FREE_MESSAGES - (guestIpUsageMap.get(clientIp) || 0)),
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        reply: "Sorry, I ran into an error processing that request.",
      },
      { status: 500 }
    );
  }
}