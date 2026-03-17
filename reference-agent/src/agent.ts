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

export async function executeResearch(
  query: string,
  options?: { systemPrompt?: string; skillsContext?: string },
): Promise<ResearchReport> {
  console.log(`[agent] Researching: "${query}"`);
  if (options?.systemPrompt) {
    console.log(`[agent] Using system prompt: ${options.systemPrompt.slice(0, 80)}...`);
  }
  if (options?.skillsContext) {
    console.log(`[agent] Skills context loaded (${options.skillsContext.length} chars)`);
  }

  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo search failed: ${response.status}`);
  }

  const html = await response.text();
  const results: ResearchResult[] = [];

  const resultBlocks = html.split("web-result");
  for (let i = 1; i < resultBlocks.length && results.length < 5; i++) {
    const block = resultBlocks[i];

    const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a/);
    const title = titleMatch
      ? decodeHTMLEntities(titleMatch[1].replace(/<[^>]*>/g, "").trim())
      : "";

    const urlMatch = block.match(/class="result__url"[^>]*href="([^"]*)"/);
    let resultUrl = urlMatch ? urlMatch[1].trim() : "";

    if (resultUrl.includes("uddg=")) {
      const uddgMatch = resultUrl.match(/uddg=([^&]+)/);
      if (uddgMatch) {
        resultUrl = decodeURIComponent(uddgMatch[1]);
      }
    }
    if (resultUrl && !resultUrl.startsWith("http")) {
      resultUrl = "https://" + resultUrl;
    }

    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a/);
    const snippet = snippetMatch
      ? decodeHTMLEntities(snippetMatch[1].replace(/<[^>]*>/g, "").trim())
      : "";

    if (title && resultUrl) {
      results.push({ title, url: resultUrl, snippet });
    }
  }

  const contextPrefix = [
    options?.systemPrompt ? `[Context: ${options.systemPrompt}]` : "",
    options?.skillsContext ? `[Skills loaded: ${options.skillsContext.length} chars]` : "",
  ].filter(Boolean).join(" ");

  const baseSummary =
    results.length > 0
      ? `Found ${results.length} result(s) for "${query}". Top sources: ${results
          .slice(0, 3)
          .map((r) => r.title)
          .join(", ")}.`
      : `No results found for "${query}".`;

  const summary = contextPrefix ? `${contextPrefix} ${baseSummary}` : baseSummary;

  return {
    query,
    results,
    summary,
    timestamp: new Date().toISOString(),
  };
}

export function buildMetadataURI(report: ResearchReport): string {
  const json = JSON.stringify(report);
  const encoded = Buffer.from(json).toString("base64");
  return `data:application/json;base64,${encoded}`;
}
