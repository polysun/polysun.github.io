import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../content/publications.json', import.meta.url);
const publications = JSON.parse(await readFile(file, 'utf8'));

const links = new Map([
  ['Cognitive Collaboration: A Design Methodology for Future-Oriented Intelligent Industrial Systems', 'https://doi.org/10.1016/j.jii.2026.101071'],
  ['MMSTG-Net: Multi-scale Spatiotemporal Graph Network with Cross-modal Contrastive Alignment for Multimodal Emotion Recognition', 'https://doi.org/10.1109/JBHI.2026.3667946'],
  ['Enhancing Auditory Brainstem Response Extraction from Noised EEG with Adaptive Kalman Denoising Technique', 'https://doi.org/10.1109/THMS.2026.3681602'],
  ['MentalQLM: A Lightweight Large Language Model for Mental Healthcare Based on Instruction Tuning and Dual LoRA Modules', 'https://doi.org/10.1109/JBHI.2025.3594133']
]);

function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

for (const publication of publications) {
  publication.title = cleanText(publication.title);
  publication.authors = cleanText(publication.authors)
    .replace(/\s*[*#†‡]+/g, '')
    .replace(/\s+([,.;:])/g, '$1');
  publication.venue = cleanText(publication.venue)
    .replace('(J III)', '(JIII)')
    .replace('(IEEE T ASE)', '(IEEE T-ASE)')
    .replace('(IEEE J BHI)', '(IEEE JBHI)');
  if (links.has(publication.title)) publication.href = links.get(publication.title);
}

await writeFile(file, `${JSON.stringify(publications, null, 2)}\n`, 'utf8');
