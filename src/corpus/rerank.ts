export interface RankedIndex { index: number; score: number; }

export async function rerank(query: string, documents: string[], topK: number): Promise<RankedIndex[]> {
  const res = await fetch("https://api.voyageai.com/v1/rerank", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ query, documents, model: "rerank-2", top_k: topK }),
  });
  if (!res.ok) throw new Error(`voyage rerank failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { data: { index: number; relevance_score: number }[] };
  return data.data.map((d) => ({ index: d.index, score: d.relevance_score }));
}
