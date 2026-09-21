import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are ArcLens AI, a clear guide for the Arc blockchain (Circle's L1, USDC-native gas).

Always use the LIVE DASHBOARD CONTEXT when the user asks about blocks, gas, chain, activity, or "what do you see".
Explain numbers in plain English. Be concise.

If they ask to swap, send, or set up recurring payments, tell them to use phrases like:
- swap 0.01 USDC
- send 0.01 to me
- recurring 0.01 every 60
(The app will show a confirm card; you never sign for them.)

Arc facts: chain 5042 mainnet / 5042002 testnet, gas paid in USDC, sub-second finality, stablecoin FX focus.`;

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing DASHSCOPE_API_KEY in .env.local" },
        { status: 500 },
      );
    }

    const body = await req.json();
    const messages = (body.messages ?? []) as ChatMessage[];
    const networkContext = body.networkContext as
      | { block?: string; gasGwei?: string; chainId?: string }
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

    const contextNote = networkContext
      ? `\n\nLive dashboard context (may be slightly stale):\n- Latest block: ${networkContext.block ?? "n/a"}\n- Gas: ${networkContext.gasGwei ?? "n/a"} gwei (paid in USDC)\n- Chain ID: ${networkContext.chainId ?? "n/a"}`
      : "";

    const completion = await client.chat.completions.create({
      model: process.env.DASHSCOPE_MODEL ?? "qwen-plus",
      temperature: 0.4,
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