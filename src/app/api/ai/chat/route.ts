import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are ArcLens AI, an intelligent agent and guide for the Arc blockchain (Circle's L1, USDC-native gas).

You have live visibility into the user's dashboard context. Always use this real-time snapshot when answering questions about live metrics, user balances, or recent transactions.

ACTION EXECUTION FORMAT:
If the user explicitly asks to swap, send, or set up recurring transfers, provide a brief explanatory sentence, and AT THE END append a JSON block formatted exactly like this:

For Swaps:
\`\`\`json
{
  "action": {
    "type": "SWAP",
    "amount": "0.01",
    "fromToken": "USDC",
    "toToken": "EURC"
  }
}
\`\`\`

For Sends:
\`\`\`json
{
  "action": {
    "type": "SEND",
    "amount": "0.01",
    "fromToken": "USDC",
    "recipient": "0x..."
  }
}
\`\`\`

For Recurring:
\`\`\`json
{
  "action": {
    "type": "RECURRING",
    "amount": "0.01",
    "intervalSeconds": 60
  }
}
\`\`\`

Arc Facts:
- Chain ID: 5042 (Mainnet) / 5042002 (Testnet)
- Gas Token: Native USDC
- Focus: Sub-second finality & stablecoin FX liquidity`;

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

type DashboardContext = {
  network?: {
    block?: string;
    gasGwei?: string;
    chainId?: string;
    status?: string;
  };
  user?: {
    address?: string | null;
    usdcBalance?: string;
    eurcCredit?: string | null;
    isUnlocked?: boolean;
  };
  activity?: {
    recentTxs?: Array<{ hash: string; type: string; timestamp: number }>;
  };
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing DASHSCOPE_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const messages = (body.messages ?? []) as ChatMessage[];
    
    const dashboardState = (body.dashboardState ?? body.networkContext) as
      | DashboardContext
      | undefined;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    const client = new OpenAI({
      apiKey,
      baseURL:
        process.env.DASHSCOPE_BASE_URL ??
        "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    });

    let contextNote = "";
    if (dashboardState) {
      const net = dashboardState.network;
      const usr = dashboardState.user;
      const act = dashboardState.activity;

      contextNote = `\n\n--- LIVE DASHBOARD SNAPSHOT ---
• Latest Block: ${net?.block ?? "N/A"}
• Gas Price: ${net?.gasGwei ?? "N/A"} Gwei (paid in USDC)
• Chain ID: ${net?.chainId ?? "N/A"}
• RPC Status: ${net?.status ?? "unknown"}
• Wallet Connected: ${usr?.address ? usr.address : "No wallet connected"}
• EURC Credit Balance: ${usr?.eurcCredit ?? "0"}
• Recent Transactions: ${
        act?.recentTxs?.length
          ? JSON.stringify(act.recentTxs)
          : "No recent transactions this session"
      }
----------------------------------`;
    }

    const completion = await client.chat.completions.create({
      model: process.env.DASHSCOPE_MODEL ?? "qwen-plus",
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + contextNote },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    const text =
      completion.choices[0]?.message?.content?.trim() ||
      "I couldn’t generate a reply. Try again.";

    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/ai/chat]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
