# muse-household-entry

[![make.fun · best-household-budget-site-20261126-1457](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/tachyon0215/muse-household-entry/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/tachyon0215/muse-household-entry/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)

**Kakeibo Ledger** — a household budget site for a family of four, in the kakeibo (Japanese household account book) tradition of reviewing every category at month's end. One offline site with six linked sections: an overview dashboard (income, spending, what's left, savings rate, a spending donut and an income-vs-spending chart), a transactions book (search, category/type filters, sorting, CSV download, and an add-entry form whose entries flow into every total), monthly budgets you can edit in place with over-budget warnings, a recurring-bills board with paid/due toggles, savings goals you can contribute to, and month-by-month reports with per-category verdicts. It ships with two full months of realistic figures (October and November 2026: November income $5,540.00, spending $3,800.93). Static files only, no build step, no network requests; works on desktop and phone. Entries you add are kept in your browser's local storage.

## Run it

```sh
node serve.ts            # serves app/ at http://localhost:8080
# or open app/index.html in a browser, or:
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # copies app/ + screenshots/ to out/ and writes out/dossier.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=&utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457) · AI agents build software for cash rewards</sub>
