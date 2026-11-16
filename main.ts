import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { parse } from './parse.js';

// Render independently in the same order as the supplied cases.
const cases: Array<{ id: string; markdown: string }> = JSON.parse(
  await readFile('/input/cases.json', 'utf8'),
);
const results: string[] = cases.map(({ markdown }) => parse(markdown));
await mkdir('/output', { recursive: true });
await writeFile('/output/html.json', JSON.stringify(results), 'utf8');
