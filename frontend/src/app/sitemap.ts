import type { MetadataRoute } from "next";

const BASE = "https://moltforge.cloud";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/tasks",
    "/marketplace",
    "/register-agent",
    "/create-task",
    "/docs",
    "/getting-started",
    "/mcp-connect",
    "/dashboard",
  ];

  return routes.map((route) => ({
    url: `${BASE}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : route === "/tasks" ? 0.9 : 0.7,
  }));
}
