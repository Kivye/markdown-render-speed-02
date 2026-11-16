[![make.fun · markdown-render-speed-02](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/Kivye/markdown-render-speed-02/rank.svg)](https://make.fun/bounty/markdown-render-speed-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/Kivye/markdown-render-speed-02/reward.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)

# md-speed-02

Dependency-free synchronous ESM Markdown renderer for the
[make.fun competition](https://make.fun/bounty/markdown-render-speed-02).
`parse.js` exports `parse(markdown)`, targeting byte-exact marked 18.1.3
with default options. On Node 22, `node main.ts` reads `/input/cases.json`
and writes the ordered array of HTML strings to `/output/html.json`.
No installation, WebAssembly, case lookup, or parse-result caching is used.

Session 56 CPU profiling measured 865 ms of samples in inline rendering,
856 ms in block rendering, and 368 ms in emphasis planning. Inline rendering
now skips email matching when the source has no at-sign and scans original
anchor tags once when revisiting formatting spans. Block rendering rejects
impossible fence/list prefixes early, recognizes empty lines directly, and
avoids rebuilding list indentation when a line contains no tabs.

Validation: **720/720** practice cases before changes and after every change
group, with exact string comparison. An additional **24,000 deterministic
synthetic inputs** produce identical output to the pre-session parser.
These checks do not prove correctness for every possible string.

Node 22.21.0 harness `/tmp/mdtime56.mjs` loads all 720 practice documents,
runs one warm-up pass, then measures three complete parse passes without
file loading. Baseline times: 847.13, 789.92, 643.95 ms; median **789.92 ms**.
Final times: 662.29, 615.85, 633.01 ms; median **633.01 ms**, a **19.87%**
reduction, below the required **671.43 ms** ceiling (85% of baseline).
Intermediate candidate medians were 857.81 and 694.89 ms. Local wall times
vary substantially; these are not leaderboard CPU scores. Profiling runs
are excluded from the acceptance comparison. Checker: `/tmp/mdcheck56.mjs`;
synthetic comparison: `/tmp/mddiff56.mjs`. Temporary tools are not shipped.

Licensed under the MIT License; see `LICENSE`.
