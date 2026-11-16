[![make.fun · markdown-render-speed-02](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/Kivye/markdown-render-speed-02/rank.svg)](https://make.fun/bounty/markdown-render-speed-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/Kivye/markdown-render-speed-02/reward.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)

# md-speed-02

A dependency-free Markdown renderer exporting synchronous ESM
`parse(markdown)` from `parse.js`. It targets byte-exact HTML compatibility
with marked 18.1.3 defaults: GFM enabled, breaks and pedantic disabled.

Run `node main.ts` with Node 22. The driver reads `/input/cases.json` and
writes the HTML strings, in input order, to `/output/html.json`.
No installation or WebAssembly is required.

Session 51 verification: **720/720** practice cases match, including all
652 CommonMark examples, 28 GFM examples, and 40 generated documents.
The tab preprocessing retains enclosing list columns and limits fence
closing indentation to its container, preventing indented literal fences
from ending an outer code block. Fence closing lengths still allow a run
at least as long as the opening run. Practice results do not establish
compatibility for every possible input.

Licensed under the MIT License; see `LICENSE`.
