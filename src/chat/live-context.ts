export interface LiveFact {
  title: string;
  url: string;
  snippet: string;
  published: string | null;
}

export async function searchLiveContext(query: string): Promise<LiveFact[]> {
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
    headers: { "X-Subscription-Token": process.env.BRAVE_SEARCH_KEY ?? "" },
  });
  if (!res.ok) throw new Error(`live search failed: ${res.status}`);
  const data = (await res.json()) as { results?: { title: string; url: string; snippet?: string; published?: string }[] };
  return (data.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.snippet ?? "",
    published: r.published ?? null,
  }));
}
