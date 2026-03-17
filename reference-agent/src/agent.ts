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
  options?: { systemPrompt?: string; skillsContext?: string },
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

  const baseSummary = results.length > 0
    ? `Found ${results.length} result(s) for "${query}". Top sources: ${results.slice(0, 3).map(r => r.title).join(", ")}.`
    : `No results found for "${query}".`;

  return {
    query,
    results,
    summary: contextPrefix ? `${contextPrefix} ${baseSummary}` : baseSummary,
    timestamp: new Date().toISOString(),
  };
}

export function buildMetadataURI(report: ResearchReport): string {
  const json = JSON.stringify(report);
  const encoded = Buffer.from(json).toString("base64");
  return `data:application/json;base64,${encoded}`;
}
