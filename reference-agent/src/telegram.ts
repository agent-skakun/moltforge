import { Telegraf } from "telegraf";
import { Config } from "./config";
import { executeResearch, ResearchResult } from "./agent";

interface LLMConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  groqApiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// ─── Direct LLM chat (system prompt + optional search context → LLM → reply) ──
async function chatWithLLM(
  userMessage: string,
  systemPrompt: string,
  searchResults: ResearchResult[],
  llm: LLMConfig,
): Promise<string | null> {
  // Build user turn: question + search context if available
  let userTurn = userMessage;
  if (searchResults.length > 0) {
    const ctx = searchResults.slice(0, 5).map((r, i) =>
      `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`
    ).join("\n\n");
    userTurn = `${userMessage}\n\nSearch context:\n${ctx}`;
  }

  const sysMsg = systemPrompt || "You are a helpful AI agent. Answer the user's question concisely and accurately.";

  // OpenAI / Groq
  const openaiKey = llm.openaiApiKey || llm.groqApiKey;
  const isGroq = !llm.openaiApiKey && !!llm.groqApiKey;
  if (openaiKey) {
    const baseUrl = isGroq ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1";
    const model = llm.model || (isGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini");
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: sysMsg },
            { role: "user",   content: userTurn },
          ],
          temperature: llm.temperature ?? 0.7,
          max_tokens: Math.min(llm.maxTokens ?? 800, 800),
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) { console.log(`[telegram] LLM reply via ${isGroq ? "Groq" : "OpenAI"}`); return text; }
      } else {
        const err = await res.text();
        console.error(`[telegram] ${isGroq ? "Groq" : "OpenAI"} error ${res.status}:`, err.slice(0, 200));
      }
    } catch (e) {
      console.error("[telegram] OpenAI/Groq fetch error:", (e as Error).message);
    }
  }

  // Anthropic
  if (llm.anthropicApiKey) {
    const model = llm.model || "claude-3-5-sonnet-20241022";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": llm.anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: Math.min(llm.maxTokens ?? 800, 800),
          system: sysMsg,
          messages: [{ role: "user", content: userTurn }],
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const data = await res.json() as { content?: Array<{ text?: string }> };
        const text = data.content?.[0]?.text?.trim();
        if (text) { console.log("[telegram] LLM reply via Anthropic"); return text; }
      } else {
        const err = await res.text();
        console.error(`[telegram] Anthropic error ${res.status}:`, err.slice(0, 200));
      }
    } catch (e) {
      console.error("[telegram] Anthropic fetch error:", (e as Error).message);
    }
  }

  return null;
}

function hasLLMKey(llm: LLMConfig): boolean {
  return !!(llm.openaiApiKey || llm.anthropicApiKey || llm.groqApiKey);
}

export function startTelegramBot(config: Config, llmConfig: LLMConfig) {
  if (!config.telegramBotToken) return;

  const bot = new Telegraf(config.telegramBotToken);
  const agentName = config.agentName ?? "MoltForge Agent";
  const systemPrompt = config.systemPrompt ?? `You are ${agentName}, a helpful AI agent on MoltForge.`;

  // Log LLM config status on startup (no key values, just presence)
  console.log(`[telegram] LLM keys present: openai=${!!llmConfig.openaiApiKey} anthropic=${!!llmConfig.anthropicApiKey} groq=${!!llmConfig.groqApiKey}`);

  // /start
  bot.start((ctx) => {
    ctx.reply(
      `👋 Hi! I'm **${agentName}**, your AI agent on MoltForge.\n\n` +
      `Send me any task or question and I'll answer it for you.\n\n` +
      `_Powered by MoltForge — AI Agent Labor Marketplace_`,
      { parse_mode: "Markdown" }
    );
  });

  // /help
  bot.help((ctx) => {
    ctx.reply(
      `🤖 **${agentName}**\n\n` +
      `Just send me a message with your task. Examples:\n` +
      `• "What is the current ETH price and trend?"\n` +
      `• "Research the latest news on Base blockchain"\n` +
      `• "Explain AI agent reputation systems"\n\n` +
      `I'll process it and send back a response.`,
      { parse_mode: "Markdown" }
    );
  });

  // Any text message → search → LLM → reply
  bot.on("text", async (ctx) => {
    const query = ctx.message.text;
    if (query.startsWith("/")) return; // skip unknown commands

    const thinking = await ctx.reply("⚙️ Working on it…");

    try {
      // 1. Run web search for context
      const report = await executeResearch(query, { systemPrompt });
      const searchResults = report.results ?? [];

      // 2. Call LLM with system prompt + search context
      let replyText: string;
      if (hasLLMKey(llmConfig)) {
        const llmReply = await chatWithLLM(query, systemPrompt, searchResults, llmConfig);
        if (llmReply) {
          replyText = llmReply;
        } else {
          // LLM call failed — fallback to search summary
          replyText = report.summary ?? "I couldn't process your request.";
          if (searchResults.length > 0) {
            replyText += "\n\n" + searchResults.slice(0, 3).map((r, i) =>
              `${i + 1}. ${r.title}${r.url ? `\n   ${r.url}` : ""}`
            ).join("\n\n");
          }
        }
      } else {
        // No LLM key — return search results only with a note
        console.warn("[telegram] No LLM API key configured — returning raw search results");
        replyText = `${report.summary ?? "No results."}\n\n⚠️ _No LLM key configured. Set ANTHROPIC\\_API\\_KEY, OPENAI\\_API\\_KEY, or GROQ\\_API\\_KEY for AI responses._`;
        if (searchResults.length > 0) {
          replyText += "\n\n" + searchResults.slice(0, 3).map((r, i) =>
            `${i + 1}. *${r.title ?? ""}*${r.url ? `\n   [Link](${r.url})` : ""}`
          ).join("\n\n");
        }
      }

      await ctx.telegram.editMessageText(
        ctx.chat.id, thinking.message_id, undefined,
        replyText.slice(0, 4000), // Telegram limit
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      console.error("[telegram] handler error:", (err as Error).message);
      await ctx.telegram.editMessageText(
        ctx.chat.id, thinking.message_id, undefined,
        `❌ Error: ${(err as Error).message}`
      );
    }
  });

  bot.launch().then(() => {
    console.log(`[telegram] Bot started for @${agentName}`);
  }).catch((err) => {
    console.error("[telegram] Failed to start bot:", err.message);
  });

  // Graceful stop
  process.once("SIGINT",  () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
