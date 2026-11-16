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

Session 55 profiling found inline rendering to be the largest remaining
hotspot: 1255 ms of CPU samples, followed by block rendering at 1213 ms.
Plain inline strings now go directly through escaping; literal runs are
consumed before syntax dispatch, and strings without an at-sign avoid the
email-boundary alternative. Escaping returns unchanged strings when safe.
Block HTML detection rejects lines without an opening angle bracket early,
and each fenced block reuses its closing expression within that block.

Validation on Node 22.21.0: **720/720** practice cases before changes and
after every change group, compared without normalization. Another **24,000
deterministic synthetic inputs** match the pre-session parser byte for byte.
These checks do not prove correctness for every possible string.

The session harness `/tmp/mdtime55.mjs` loads all 720 practice documents,
runs one warm-up pass, then measures three complete parse passes, excluding
file loading. Baseline: 837.24, 836.47, 906.24 ms; median **837.24 ms**.
Final: 1251.60, 638.41, 657.26 ms; median **657.26 ms**, a **21.50%**
reduction, below the required **711.66 ms** ceiling (85% of baseline).
Intermediate candidate medians were 927.42, 1030.87, and 806.99 ms;
wall-time variability is substantial. Profiling runs are excluded from the
acceptance comparison. These are local timings, not leaderboard CPU scores.
The checker is `/tmp/mdcheck55.mjs`; temporary tools are not shipped.

Licensed under the MIT License; see `LICENSE`.
