import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parse } from './parse.js';

// Render each input independently and preserve its position in the output.
const cases: Array<{ id: string; markdown: string }> = JSON.parse(
  await readFile('/input/cases.json', 'utf8'),
);
const html = new Array<string>(cases.length);
for (let index = 0; index < cases.length; index++) {
  html[index] = parse(cases[index].markdown);
}
await mkdir('/output', { recursive: true });
await writeFile('/output/html.json', JSON.stringify(html), 'utf8');
