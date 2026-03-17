import { NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "REDACTED_GITHUB_TOKEN";
const REPO = "agent-skakun/moltforge-skills";
const BASE_RAW = `https://raw.githubusercontent.com/${REPO}/main`;
const BASE_API = `https://api.github.com/repos/${REPO}`;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "list";
  const filePath = searchParams.get("path");

  const headers: Record<string, string> = {
    Authorization: `token ${GITHUB_TOKEN}`,
    "User-Agent": "MoltForge/1.0",
    Accept: "application/vnd.github.v3+json",
  };

  if (action === "list") {
    // Fetch full tree of .md files
    const res = await fetch(`${BASE_API}/git/trees/HEAD?recursive=1`, { headers });
    if (!res.ok) return NextResponse.json({ error: "GitHub API error" }, { status: res.status });
    const data = await res.json();

    interface TreeItem { type: string; path: string; sha: string }
    const mdFiles: TreeItem[] = (data.tree || []).filter(
      (f: TreeItem) => f.type === "blob" && f.path.endsWith(".md") && f.path !== "README.md"
    );

    // Group by folder
    const groups: Record<string, { id: string; label: string; path: string; category: string }[]> = {};
    for (const f of mdFiles) {
      const parts = f.path.split("/");
      const category = parts.length > 1 ? parts[0] : "general";
      const filename = parts[parts.length - 1].replace(".md", "");
      const label = filename
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      if (!groups[category]) groups[category] = [];
      groups[category].push({ id: f.path, label, path: f.path, category });
    }

    return NextResponse.json({ groups });
  }

  if (action === "file" && filePath) {
    // Fetch raw content of a skill file
    const res = await fetch(`${BASE_RAW}/${filePath}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent": "MoltForge/1.0" },
    });
    if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const content = await res.text();
    return NextResponse.json({ path: filePath, content });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
