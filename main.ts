import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { parse } from './parse.js';

// Each document is parsed independently; output follows the input order.
type MarkdownCase = { id: string; markdown: string };
const input: MarkdownCase[] = JSON.parse(await readFile('/input/cases.json', 'utf8'));
const rendered: string[] = [];
for (const document of input) rendered.push(parse(document.markdown));
await mkdir('/output', { recursive: true });
await writeFile('/output/html.json', JSON.stringify(rendered), 'utf8');
