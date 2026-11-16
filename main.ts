import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parse } from './parse.js';

// Keep one independently rendered result for each input document.
const documents: { id: string; markdown: string }[] = JSON.parse(
  await readFile('/input/cases.json', 'utf8'),
);
const html: string[] = [];
for (const document of documents) html.push(parse(document.markdown));
await mkdir('/output', { recursive: true });
await writeFile('/output/html.json', JSON.stringify(html), 'utf8');
