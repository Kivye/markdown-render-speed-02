[![make.fun · markdown-render-speed-02](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/Kivye/markdown-render-speed-02/rank.svg)](https://make.fun/bounty/markdown-render-speed-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/Kivye/markdown-render-speed-02/reward.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
# Markdown renderer
A dependency-free JavaScript Markdown renderer with a Node.js batch driver.

`parse.js` exports `parse(markdown)`, returning HTML synchronously with no runtime dependencies. `main.ts` reads `/input/cases.json` and writes the ordered HTML array to `/output/html.json` using Node.js 22 with native TypeScript support.

The implementation was written from scratch and checked against all 720 supplied practice cases, including all 40 generated documents. Passing this corpus is not a proof of equivalence on every possible Markdown string.
