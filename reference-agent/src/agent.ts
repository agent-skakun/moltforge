export interface LLMConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  groqApiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ResearchReport {
  query: string;
  results: ResearchResult[];
  summary: string;
  timestamp: string;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function parseLiteDDG(html: string): ResearchResult[] {
  const results: ResearchResult[] = [];
  // lite.duckduckgo.com has table rows with links and snippets
  const rowRe = /<a[^>]+href="([^"]*)"[^>]*>([^<]+)<\/a>/g;
  const snippetRe = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/g;
  const titles: Array<{ title: string; url: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null && titles.length < 8) {
    const url = m[1];
    const title = decodeHTMLEntities(m[2].trim());
    if (url.startsWith("http") && title.length > 5 && !url.includes("duckduckgo.com")) {
      titles.push({ url, title });
    }
  }
  const snippets: string[] = [];
  while ((m = snippetRe.exec(html)) !== null) {
    snippets.push(decodeHTMLEntities(m[1].replace(/<[^>]*>/g, "").trim()));
  }
  for (let i = 0; i < Math.min(titles.length, 5); i++) {
    results.push({ ...titles[i], snippet: snippets[i] ?? "" });
  }
  return results;
}

function parseHtmlDDG(html: string): ResearchResult[] {
  const results: ResearchResult[] = [];
  const blocks = html.split("web-result");
  for (let i = 1; i < blocks.length && results.length < 5; i++) {
    const block = blocks[i];
    const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a/);
    const title = titleMatch ? decodeHTMLEntities(titleMatch[1].replace(/<[^>]*>/g, "").trim()) : "";
    const urlMatch = block.match(/class="result__url"[^>]*href="([^"]*)"/);
    let url = urlMatch ? urlMatch[1].trim() : "";
    if (url.includes("uddg=")) {
      const uddgMatch = url.match(/uddg=([^&]+)/);
      if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);
    }
    if (url && !url.startsWith("http")) url = "https://" + url;
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a/);
    const snippet = snippetMatch ? decodeHTMLEntities(snippetMatch[1].replace(/<[^>]*>/g, "").trim()) : "";
    if (title && url) results.push({ title, url, snippet });
  }
  return results;
}

export async function executeResearch(
  query: string,
  options?: { systemPrompt?: string; skillsContext?: string; llmConfig?: LLMConfig },
): Promise<ResearchReport> {
  console.log(`[agent] Researching: "${query}"`);

  let results: ResearchResult[] = [];

  // 1. Try DuckDuckGo lite (works on Railway/VPS, may be blocked on Vercel)
  try {
    const r = await fetch(
      `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "Lynx/2.8.9rel.1 libwww-FM/2.14 SSL-MM/1.4.1" }, signal: AbortSignal.timeout(6000) }
    );
    if (r.ok) {
      results = parseLiteDDG(await r.text());
    }
  } catch { /* fallthrough */ }

  // 2. Try DuckDuckGo html (Lynx UA)
  if (results.length === 0) {
    try {
      const r = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        { headers: { "User-Agent": "Lynx/2.8.9rel.1 libwww-FM/2.14 SSL-MM/1.4.1" }, signal: AbortSignal.timeout(6000) }
      );
      if (r.ok) results = parseHtmlDDG(await r.text());
    } catch { /* fallthrough */ }
  }

  // 3. Fallback: Wikipedia Search API (no IP restrictions, works everywhere)
  if (results.length === 0) {
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=5&srprop=snippet`;
      const r = await fetch(wikiUrl, { headers: { "User-Agent": "MoltForge-ResearchAgent/1.0" }, signal: AbortSignal.timeout(6000) });
      if (r.ok) {
        const data = await r.json() as { query?: { search?: Array<{ title: string; snippet: string }> } };
        const items = data.query?.search ?? [];
        results = items.map(item => ({
          title: item.title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
          snippet: item.snippet.replace(/<[^>]*>/g, ""),
        }));
        console.log(`[agent] Used Wikipedia fallback: ${results.length} results`);
      }
    } catch { /* no results */ }
  }

  const contextPrefix = [
    options?.systemPrompt ? `[Context: ${options.systemPrompt}]` : "",
    options?.skillsContext ? `[Skills: ${options.skillsContext.length} chars]` : "",
  ].filter(Boolean).join(" ");

  // Try LLM summarization if key available
  let summary = results.length > 0
    ? `Found ${results.length} result(s) for "${query}". Top sources: ${results.slice(0, 3).map(r => r.title).join(", ")}.`
    : `No results found for "${query}".`;

  if (options?.llmConfig && results.length > 0) {
    try {
      const llmSummary = await summarizeWithLLM(query, results, options.llmConfig, options.systemPrompt);
      if (llmSummary) summary = llmSummary;
    } catch (e) {
      console.warn("[agent] LLM summarization failed, using fallback:", (e as Error).message);
    }
  }

  return {
    query,
    results,
    summary: contextPrefix ? `${contextPrefix} ${summary}` : summary,
    timestamp: new Date().toISOString(),
  };
}

// ─── LLM Summarization ────────────────────────────────────────────────────────

async function summarizeWithLLM(
  query: string,
  results: ResearchResult[],
  llm: LLMConfig,
  systemPrompt?: string,
): Promise<string | null> {
  const context = results.slice(0, 5).map((r, i) =>
    `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`
  ).join("\n\n");

  const userMessage = `Research query: "${query}"\n\nSearch results:\n${context}\n\nProvide a concise, accurate summary (2-4 sentences) answering the query based on these results.`;

  const sysMsg = systemPrompt || "You are a research assistant. Summarize search results concisely and accurately.";

  // OpenAI / Groq (same API format)
  const openaiKey = llm.openaiApiKey || llm.groqApiKey;
  const isGroq = !llm.openaiApiKey && !!llm.groqApiKey;
  if (openaiKey) {
    const baseUrl = isGroq ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1";
    const model = llm.model || (isGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini");
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: sysMsg }, { role: "user", content: userMessage }],
        temperature: llm.temperature ?? 0.7,
        max_tokens: Math.min(llm.maxTokens ?? 500, 500),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) { console.log(`[agent] LLM summary via ${isGroq ? "Groq" : "OpenAI"}`); return text; }
    }
  }

  // Anthropic
  if (llm.anthropicApiKey) {
    const model = llm.model || "claude-3-5-sonnet-20241022";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": llm.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: Math.min(llm.maxTokens ?? 500, 500),
        system: sysMsg,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = await res.json() as { content?: Array<{ text?: string }> };
      const text = data.content?.[0]?.text?.trim();
      if (text) { console.log("[agent] LLM summary via Anthropic"); return text; }
    }
  }

  return null;
}

export function buildMetadataURI(report: ResearchReport): string {
  const json = JSON.stringify(report);
  const encoded = Buffer.from(json).toString("base64");
  return `data:application/json;base64,${encoded}`;
}
