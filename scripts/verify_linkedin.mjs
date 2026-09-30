import { readFile } from "node:fs/promises";

const run = JSON.parse(await readFile(new URL("../db/demo-run.json", import.meta.url), "utf8"));
const results = [];
let cursor = 0;

async function worker() {
  while (cursor < run.people.length) {
    const person = run.people[cursor++];
    try {
      const response = await fetch(person.linkedin, {
        redirect: "follow",
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
          "accept-language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(15_000),
      });
      const html = await response.text();
      const title = html.match(/<title[^>]*>([^<]+)/i)?.[1]
        || html.match(/property="og:title" content="([^"]+)/i)?.[1]
        || "";
      results.push({ name: person.name, url: person.linkedin, status: response.status, title: title.replaceAll("&amp;", "&").slice(0, 160) });
    } catch (error) {
      results.push({ name: person.name, url: person.linkedin, status: 0, error: error instanceof Error ? error.name : "Unknown error" });
    }
  }
}

await Promise.all([worker(), worker()]);
results.sort((left, right) => left.name.localeCompare(right.name));
for (const result of results) {
  const surname = result.name.toLowerCase().split(/\s+/).at(-1);
  if (result.status === 200 && result.title.toLowerCase().includes(surname)) continue;
  try {
    const query = encodeURIComponent(`site:linkedin.com/in "${result.name}"`);
    const response = await fetch(`https://www.bing.com/search?q=${query}&format=rss`, {
      headers: { "user-agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(15_000),
    });
    const xml = await response.text();
    result.searchResults = [...xml.matchAll(/<item>\s*<title>(.*?)<\/title>\s*<link>(.*?)<\/link>/gis)]
      .slice(0, 3)
      .map(match => ({ title: match[1].replace(/<!\[CDATA\[|\]\]>/g, ""), url: match[2].replace(/&amp;/g, "&") }));
  } catch (error) {
    result.searchError = error instanceof Error ? error.name : "Unknown error";
  }
}
console.log(JSON.stringify(results, null, 2));

for (const query of [
  "site:linkedin.com/in Jay Shetty author podcast On Purpose",
  "site:linkedin.com/in Lilly Singh actress producer Unicorn Island",
]) {
  const response = await fetch(`https://www.google.com/search?q=${encodeURIComponent(query)}`, {
    headers: { "user-agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15_000),
  });
  const html = await response.text();
  const links = [...html.matchAll(/https:\/\/[^\s"&]*linkedin\.com\/in\/[^\s"&?]+/gi)].map(match => match[0]);
  console.log(JSON.stringify({ query, status: response.status, links: [...new Set(links)].slice(0, 10) }, null, 2));
}
