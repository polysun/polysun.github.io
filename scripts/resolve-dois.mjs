import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../content/publications.json', import.meta.url);
const publications = JSON.parse(await readFile(file, 'utf8'));

const extraTitles = [
  'Budgeted Neuro-Symbolic Decision for Industrial Online Repair Under Expensive Verification',
  'Enhancing Resilience of Urban Cold Chain Logistics: A Predict-and-Prescribe Approach',
  'Multilateral Network Transformation for Transport Mode Selection of Multimodal Transportation',
  'PCCA: A Hypothesis-Driven Prompt-Conditioned Causal Auditing Framework for Industrial Knowledge Graphs',
  'Causal Effects of Flooding on Urban Transport Resilience: A Double Machine Learning Approach with Satellite-Derived Flood Maps'
];

const excluded = /(proceedings|international conference|congress on evolutionary|ieee ieem|ieee-case|ijcnn|cie['’]?49|aiccc|journal of cleaner production)/i;
const titles = [...extraTitles, ...publications.filter((item) => !excluded.test(item.venue)).map((item) => item.title)];

const normalize = (value) => String(value ?? '')
  .normalize('NFKD')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function tokenScore(a, b) {
  const left = new Set(normalize(a).split(' ').filter(Boolean));
  const right = new Set(normalize(b).split(' ').filter(Boolean));
  const intersection = [...left].filter((token) => right.has(token)).length;
  return intersection / Math.max(left.size, right.size, 1);
}

async function crossref(title) {
  const url = new URL('https://api.crossref.org/works');
  url.searchParams.set('query.title', title);
  url.searchParams.set('rows', '5');
  url.searchParams.set('select', 'DOI,title,container-title,published,type,URL');
  url.searchParams.set('mailto', 'poly.zhsun@outlook.com');
  const response = await fetch(url, {
    headers: { 'User-Agent': 'PolySun-publication-page/1.0 (mailto:poly.zhsun@outlook.com)' },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Crossref ${response.status}`);
  const items = (await response.json()).message.items ?? [];
  return items.map((item) => ({
    doi: item.DOI,
    title: item.title?.[0] ?? '',
    venue: item['container-title']?.[0] ?? '',
    type: item.type,
    score: tokenScore(title, item.title?.[0] ?? '')
  })).sort((a, b) => b.score - a.score)[0];
}

const results = [];
for (const [index, title] of titles.entries()) {
  try {
    const match = await crossref(title);
    results.push({ inputTitle: title, ...match, accepted: Boolean(match?.doi && match.type === 'journal-article' && match.score >= 0.9) });
  } catch (error) {
    results.push({ inputTitle: title, error: error.message, accepted: false });
  }
  if ((index + 1) % 10 === 0) console.error(`Resolved ${index + 1}/${titles.length}`);
  await new Promise((resolve) => setTimeout(resolve, 120));
}

const output = `${JSON.stringify(results, null, 2)}\n`;
await writeFile(new URL('../content/doi-candidates.json', import.meta.url), output, 'utf8');
process.stdout.write(output);
