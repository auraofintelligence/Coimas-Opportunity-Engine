# Coimas Opportunity Engine

A source-backed international opportunity workbench for the distinct current initiatives in the Aura of Intelligence ecosystem.

Project Atlas is the repository history and public directory, not the list of enterprises. Coimas uses a separately curated portfolio; each initiative can reference multiple repositories, and every engagement pathway has its own project-specific requirements. Local assets stay locally anchored. A proposal is not a registered entity or a confirmed partnership.

World Travel Patterns supplies country facts, source links and dated records. Coimas never writes to that repository. The public explorer keeps eligibility, evidence coverage, research leads and reviewed suitability distinct. Unknown facts cannot become favourable or unfavourable scores.

## Status

Initial portfolio is an editorial research draft, not founder-approved legal or commercial strategy. No private project records, personal travel windows or personal financial details are imported. The public data is regenerated deterministically using GitHub Actions; the site requires no AI API or paid worker credits.

## Initial portfolio

20 distinct initiatives including one founder-mobility research profile, 38 applicable engagement pathways and 128 project-specific requirements. The portfolio is editable in `data/portfolio.json`. Each initiative has a stable identifier independent of repository names, a stage, an anchor, public evidence sources and scoped engagement requirements. No matching entry is created solely because a repository exists.

The first version includes explicit research hypotheses for selected jurisdictions. They are not confirmed opportunities. Required gates must be supported by reviewed evidence, weighted reviewed coverage must be at least 60%, and conflicting observations block ranking. A source listing is not a legal finding.

## Build and test

With Node.js 22 and neighbouring public checkouts of Project Atlas and World Travel Patterns:

```sh
node tests.mjs
node build.mjs --atlas ../project-atlas --travel ../world-travel-patterns
python -m http.server 8000
```

The public static site reads `generated/dataset.json`. The daily GitHub Actions job checks both upstream sources, tests the engine, commits materially changed datasets and publishes an allowlisted Pages artifact. Set GitHub Pages source to GitHub Actions if it is not already configured. A failed deployment does not imply the generated dataset is absent.

Keep unpublished strategies and personal plans off the public repository. Browser review workbooks are in memory and can be saved locally. Source data is attributed; third-party rights remain unchanged.

## Public source licence

See [LICENCE.md](LICENCE.md).

## Site architecture

Nine dedicated pages: home, portfolio, project explorer, jurisdiction explorer, side-by-side comparison, budget planner, research queue, methodology and site map. Shareable query parameters carry only public initiative, pathway and jurisdiction selections. Private review observations are deliberately kept in memory and transferred only through a user-controlled JSON export/import. Each budget workspace clearly separates source-backed items from user planning allowances.
