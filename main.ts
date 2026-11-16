import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parse } from './parse.js';
const input = await readFile('/input/cases.json', 'utf8');
type MarkdownCase = { id: string; markdown: string };
const cases: MarkdownCase[] = JSON.parse(input);
const html = new Array<string>(cases.length);
for (let i = 0; i < cases.length; i++) html[i] = parse(cases[i].markdown);
await mkdir('/output', { recursive: true });
await writeFile('/output/html.json', JSON.stringify(html));
