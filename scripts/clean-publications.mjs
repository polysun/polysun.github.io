import { readFile, writeFile } from 'node:fs/promises';

const publicationFile = new URL('../content/publications.json', import.meta.url);
const doiFile = new URL('../content/doi-candidates.json', import.meta.url);
const publications = JSON.parse(await readFile(publicationFile, 'utf8'));
const doiCandidates = JSON.parse(await readFile(doiFile, 'utf8'));

const additions = [
  {
    title: 'Budgeted Neuro-Symbolic Decision for Industrial Online Repair Under Expensive Verification',
    authors: 'Hongwei Jiang, Jiapeng You, Zhiyang Chen, Xinguo Ming, Poly Z.H. Sun.',
    venue: 'IEEE Transactions on Automation Science and Engineering (IEEE T-ASE), 2026.',
    year: 2026
  },
  {
    title: 'Enhancing Resilience of Urban Cold Chain Logistics: A Predict-and-Prescribe Approach',
    authors: 'Xinyi Fang, Linjun Lu, Poly Z.H. Sun.',
    venue: 'Transportation Research Part D: Transport and Environment, 2026.',
    year: 2026
  },
  {
    title: 'Multilateral Network Transformation for Transport Mode Selection of Multimodal Transportation',
    authors: 'Zhiyang Chen, Rob Law, Xin Wang, Poly Z.H. Sun.',
    venue: 'IEEE Transactions on Intelligent Transportation Systems (IEEE T-ITS), 2026.',
    year: 2026
  },
  {
    title: 'PCCA: A Hypothesis-Driven Prompt-Conditioned Causal Auditing Framework for Industrial Knowledge Graphs',
    authors: 'Hongwei Jiang, Jiapeng You, Jiayu Shi, Zhiyang Chen, Huaxing Gou, Xinguo Ming, Poly Z.H. Sun.',
    venue: 'IEEE Transactions on Industrial Informatics (IEEE T-II), 2026.',
    year: 2026
  },
  {
    title: 'Causal Effects of Flooding on Urban Transport Resilience: A Double Machine Learning Approach with Satellite-Derived Flood Maps',
    authors: 'Zhan Zhang, Bochen Cao, Alima Adalaiti, Shiwen Pan, Jiaohao Xu, Poly Z.H. Sun, Linjun Lu.',
    venue: 'IEEE Internet of Things Journal (IEEE IoT-J), 2026.',
    year: 2026
  }
];

const excludedVenue = /(proceedings|international conference|congress on evolutionary|ieee ieem|ieee-case|ijcnn|cie['’]?49|aiccc|journal of cleaner production)/i;

function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeTitle(value) {
  return cleanText(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const doiByTitle = new Map(
  doiCandidates
    .filter((candidate) => candidate.accepted && candidate.type === 'journal-article')
    .map((candidate) => [normalizeTitle(candidate.inputTitle), `https://doi.org/${candidate.doi.toLowerCase()}`])
);

const manualLinks = new Map([
  ['MentalQLM: A Lightweight Large Language Model for Mental Healthcare Based on Instruction Tuning and Dual LoRA Modules', 'https://doi.org/10.1109/JBHI.2025.3594133']
].map(([title, href]) => [normalizeTitle(title), href]));

const seen = new Set();
const cleaned = [...additions, ...publications]
  .map((publication) => {
    const title = cleanText(publication.title);
    const key = normalizeTitle(title);
    return {
      title,
      authors: cleanText(publication.authors)
        .replace(/\s*[*#†‡]+/g, '')
        .replace(/\s+([,.;:])/g, '$1'),
      venue: cleanText(publication.venue)
        .replace(/^In:\s*/i, '')
        .replace('(J III)', '(JIII)')
        .replace('(IEEE T ASE)', '(IEEE T-ASE)')
        .replace('(IEEE J BHI)', '(IEEE JBHI)'),
      year: Number(publication.year),
      href: manualLinks.get(key) ?? doiByTitle.get(key) ?? publication.href ?? null,
      key
    };
  })
  .filter((publication) => !excludedVenue.test(publication.venue))
  .filter((publication) => {
    if (seen.has(publication.key)) return false;
    seen.add(publication.key);
    return true;
  })
  .sort((a, b) => b.year - a.year)
  .map(({ key, ...publication }) => publication);

await writeFile(publicationFile, `${JSON.stringify(cleaned, null, 2)}\n`, 'utf8');

const missing = cleaned.filter((publication) => !publication.href);
if (missing.length) {
  console.error(`Missing DOI links for ${missing.length} publication(s):`);
  for (const publication of missing) console.error(`- ${publication.title}`);
  process.exitCode = 1;
} else {
  console.log(`Prepared ${cleaned.length} journal publications with verified DOI links.`);
}
