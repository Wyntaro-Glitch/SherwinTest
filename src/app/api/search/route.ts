import type { NextRequest } from "next/server";

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface SearchSuccessResponse {
  ok: true;
  query: string;
  results: SearchResult[];
  abstract?: string;
  source?: string;
}

export interface SearchErrorResponse {
  ok: false;
  error: string;
}

export type SearchResponse = SearchSuccessResponse | SearchErrorResponse;

const DDG_INSTANT = "https://api.duckduckgo.com/?q=%s&format=json&no_html=1&skip_disambig=1";
const DDG_HTML = "https://html.duckduckgo.com/html/?q=%s";
const USER_AGENT = "Mozilla/5.0 (compatible; SherwinMail/1.0; +https://sherwinmail.io)";

function extractBetween(text: string, start: string, end: string): string {
  const s = text.indexOf(start);
  if (s === -1) return "";
  const e = text.indexOf(end, s + start.length);
  return e === -1 ? text.slice(s + start.length) : text.slice(s + start.length, e);
}

async function searchInstantAnswer(query: string): Promise<{ abstract?: string; source?: string; results: SearchResult[] }> {
  try {
    const url = DDG_INSTANT.replace("%s", encodeURIComponent(query));
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { results: [] };

    const data = await res.json();
    const results: SearchResult[] = [];

    if (data.AbstractText) {
      return {
        abstract: data.AbstractText,
        source: data.AbstractSource,
        results: [],
      };
    }

    if (data.Answer) {
      return {
        abstract: data.Answer,
        results: [],
      };
    }

    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, 5)) {
        if (topic.Text) {
          results.push({
            title: topic.Text.split(" - ")[0] || topic.Text,
            snippet: topic.Text,
            url: topic.FirstURL || "",
          });
        }
        if (topic.Topics && Array.isArray(topic.Topics)) {
          for (const sub of topic.Topics.slice(0, 3)) {
            if (sub.Text) {
              results.push({
                title: sub.Text.split(" - ")[0] || sub.Text,
                snippet: sub.Text,
                url: sub.FirstURL || "",
              });
            }
          }
        }
      }
    }

    return { results };
  } catch {
    return { results: [] };
  }
}

async function searchHTML(query: string): Promise<SearchResult[]> {
  try {
    const url = DDG_HTML.replace("%s", encodeURIComponent(query));
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];

    const html = await res.text();
    const results: SearchResult[] = [];
    const lines = html.split("\n");
    let i = 0;

    while (i < lines.length && results.length < 5) {
      const line = lines[i];
      if (line.includes('class="result__a"')) {
        const title = extractBetween(line, '>', "</a>").replace(/<[^>]+>/g, "").trim();
        const urlMatch = line.match(/href="([^"]+)"/);
        const url = urlMatch ? urlMatch[1] : "";

        let snippet = "";
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          if (lines[j].includes('class="result__snippet"')) {
            snippet = lines[j].replace(/<[^>]+>/g, "").trim();
            break;
          }
        }

        if (title) {
          results.push({ title, snippet, url: url.startsWith("http") ? url : `https://${url}` });
        }
      }
      i++;
    }

    return results;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || !query.trim()) {
    return Response.json(
      { ok: false, error: 'Missing query parameter "q".' } satisfies SearchErrorResponse,
      { status: 400 }
    );
  }

  const trimmed = query.trim();

  const [instant, htmlResults] = await Promise.all([
    searchInstantAnswer(trimmed),
    searchHTML(trimmed),
  ]);

  const allResults: SearchResult[] = [
    ...instant.results,
    ...htmlResults,
  ];

  const seen = new Set<string>();
  const unique = allResults.filter((r) => {
    const key = r.url || r.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return Response.json({
    ok: true,
    query: trimmed,
    results: unique.slice(0, 8),
    abstract: instant.abstract,
    source: instant.source,
  } satisfies SearchSuccessResponse);
}
