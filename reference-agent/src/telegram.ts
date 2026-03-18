import { Telegraf } from "telegraf";
import { Config } from "./config";
import { executeResearch } from "./agent";

interface LLMConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  groqApiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export function startTelegramBot(config: Config, llmConfig: LLMConfig) {
  if (!config.telegramBotToken) return;

  const bot = new Telegraf(config.telegramBotToken);
  const agentName = config.agentName ?? "MoltForge Agent";
  const systemPrompt = config.systemPrompt;

  // /start
  bot.start((ctx) => {
    ctx.reply(
      `👋 Hi! I'm **${agentName}**, your AI agent on MoltForge.\n\n` +
      `Send me any task or question and I'll research it for you.\n\n` +
      `_Powered by MoltForge — AI Agent Labor Marketplace_`,
      { parse_mode: "Markdown" }
    );
  });

  // /help
  bot.help((ctx) => {
    ctx.reply(
      `🤖 **${agentName}**\n\n` +
      `Just send me a message with your task. Examples:\n` +
      `• "Research the latest news on Base blockchain"\n` +
      `• "What is the current ETH price and trend?"\n` +
      `• "Summarize the MoltForge platform"\n\n` +
      `I'll process it and send back a detailed report.`,
      { parse_mode: "Markdown" }
    );
  });

  // Any text message → executeResearch
  bot.on("text", async (ctx) => {
    const query = ctx.message.text;
    if (query.startsWith("/")) return; // skip unknown commands

    const thinking = await ctx.reply("⚙️ Working on it…");

    try {
      const report = await executeResearch(query, {
        systemPrompt,
        llmConfig,
      });

      const summary = report.summary ?? "Done.";
      const results = report.results ?? [];

      let text = `✅ **${summary}**`;
      if (results.length > 0) {
        text += "\n\n";
        results.slice(0, 3).forEach((r: { title?: string; url?: string; snippet?: string }, i: number) => {
          text += `${i + 1}. *${r.title ?? ""}*`;
          if (r.url) text += `\n   [Link](${r.url})`;
          if (r.snippet) text += `\n   ${r.snippet.slice(0, 100)}`;
          text += "\n\n";
        });
      }

      await ctx.telegram.editMessageText(
        ctx.chat.id, thinking.message_id, undefined,
        text.trim(),
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      await ctx.telegram.editMessageText(
        ctx.chat.id, thinking.message_id, undefined,
        `❌ Error: ${(err as Error).message}`
      );
    }
  });

  bot.launch().then(() => {
    console.log(`  Telegram: @${agentName} bot started (long polling)`);
  }).catch((err) => {
    console.error("  Telegram: failed to start bot:", err.message);
  });

  // Graceful stop
  process.once("SIGINT",  () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
