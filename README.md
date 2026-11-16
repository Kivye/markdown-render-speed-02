[![make.fun · markdown-render-speed-02](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/Kivye/markdown-render-speed-02/rank.svg)](https://make.fun/bounty/markdown-render-speed-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/Kivye/markdown-render-speed-02/reward.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)

# md-speed-02

Dependency-free synchronous ESM Markdown renderer for the
[make.fun competition](https://make.fun/bounty/markdown-render-speed-02).
`parse.js` exports `parse(markdown)` and targets byte-exact marked 18.1.3
HTML with default options (GFM enabled, breaks and pedantic disabled).

Run `node main.ts` on Node 22. The driver reads `/input/cases.json` and writes
an ordered array of HTML strings to `/output/html.json`. No installation,
external dependencies, WebAssembly, or cached document results are used.

Session 52: **720/720** practice cases match before and after optimization.
The CPU profile identified inline parsing and escaping as hotspots. Escaping
now uses one replacement pass; individual literal characters use the same
escape table directly. Entity and URL regexes first check the initial
character, and email matching first checks the existing eligibility rules.

Using Node 22.21.0, `/tmp/mdtime52.mjs` loads all 720 practice documents,
runs one full warm-up, then measures three complete parse passes with
`performance.now()` (input loading is excluded). Median total parse time
fell from **3059.90 ms** to **1696.82 ms**, a **44.55%** reduction, exceeding
the required 15% improvement. These are local measurements, not grader CPU
scores. `/tmp/mdcheck52.mjs` checks every HTML string against the reference;
10,000 additional synthetic samples also match the pre-change parser.
Practice and differential checks do not prove compatibility for every input.

Licensed under the MIT License; see `LICENSE`.
