# Plan: Phase 10, Ship it (approved 2026-10-24)

**Goal (roadmap):** a polished portfolio piece: a live demo anyone can open, share and embed, a strong README, a findings write-up, the devlog as a series, and a v1.0 release.

## Where things stand

| Roadmap item | Today |
|---|---|
| Landing page | None. The site (https://ge0ffr3y.github.io/evolution-sim/) opens straight into the simulator. There is a separate experiment-results page (`analysis.html`). |
| Shareable links | Partly. The address already holds the seed and the preset (`?seed=42&preset=grand-world`), so a link replays that run. It cannot hold changed settings, and there is no "copy link" button. |
| Embed | None. No compact mode for an iframe. Where the demo lives on the portfolio site is still an open question in the overview. |
| README | Exists, but its status line stops at Phase 8b. It says nothing of Phase 9 (experiments at scale, the meat-eater hunt) or living plants, and has no architecture diagram. |
| Findings write-up | The material is there, but as working notes: `docs/findings/phase-9-headline-experiments.md` (long, many numbered findings), `docs/findings/living-plants.md`, and the results page. Nothing reads well for a visitor. |
| Devlog series | 25 entries (0000 to 0024), each a markdown file. There is no index, and they are only readable on GitHub. |
| Release | Tags v0.1 to v0.4 exist; only v0.1 has a GitHub release. Versions in the code are still 0.0.0. |
| Featured presets | 46 presets. The roadmap names "Predator arms race", "Ice age" and "Two continents"; all three exist (`arms-race`, `ice-age`, `two-continents`). |

## The plan: seven steps on branch `phase-10-ship-it`

Each step is small and checkable in the browser. Tests run on GitHub. Nothing is published until you say so: pushing to main redeploys the live site.

1. **Shareable links.**
   - A "Copy link" button in the viewer.
   - Links can carry changed settings too (for example `&set=plantEvolution:1,plantToxins:1`), so a link can show any setting combination, not only presets.
   - Opening a link starts that exact world.
   - A test checks that a world built from a link plays out identically (same fingerprint) to one built directly.
   - Old links keep working.
2. **Embed mode.**
   - `?embed=1` shows a compact view (world plus the population chart, with a link out to the full viewer) for an iframe on your portfolio site.
   - A copy-paste embed snippet goes in the README.
   - It fits a narrow column and works at phone width.
3. **Landing page.**
   - A short front page at the site's address:
     - what it is, in two sentences;
     - one time-lapse GIF;
     - six featured worlds, each a one-click link that starts it in the viewer, with one line on what to watch for;
     - links to the findings, the devlog, the results page and the repo.
   - The simulator moves to its own page, and old links that open the simulator still do.
4. **Featured worlds.**
   - Pick about six and give each a friendly name, a "watch for" line and a seed that shows it well. My suggestion:
     - Food webs from nothing (the simple world);
     - Predator arms race;
     - Ice age;
     - Two continents;
     - The grand world;
     - Living plants.
   - Check each on several seeds in the cloud (a cheap run, estimated first) so none dies out on a visitor.
5. **Findings write-up.**
   - One readable page for visitors, built from the existing charts and findings:
     - what emerges;
     - what the experiments showed;
     - the meat-eater puzzle, told honestly as an open problem;
     - what living plants added.
   - It lives on the site and in the repo, and links to the detailed results page for anyone who wants numbers.
6. **Devlog as a series.**
   - An index with one line per entry, grouped by phase and with consistent titles.
   - The entries readable on the site, not only on GitHub.
7. **README and v1.0.**
   - Refresh the README: status, what emerged up to now, new GIFs, an architecture diagram, how to run it, how to run experiments (laptop and cloud), and design principles.
   - Set the version to 1.0.0 and write release notes.
   - Then, with your go-ahead: merge, tag v1.0 and publish the GitHub release.

## Proposed "Done when"

The roadmap has none for Phase 10, so I propose these:
- Opening the site shows a front page that explains the project in under a minute and starts any featured world in one click.
- A copied link opened on another computer starts the same run, with the same numbers at the same tick.
- The demo works embedded in an iframe on a test page, and at phone width.
- The README is current, with GIFs, an architecture diagram and how to run it.
- A visitor-ready findings page, honest about what did not work.
- A devlog index linking every entry in order.
- v1.0 tagged and released on GitHub.

## Cost

Mostly writing and front-end work. The only cloud run is the featured-worlds check (step 4), probably under $1, estimated before launch. Browser checks of the viewer are short, and long simulations stay in the cloud.

## Decisions for you

1. **Name.** The overview lists "Project name" as open, and the site and repo say "Evolution Sim". Keep that for v1.0, or name it now?
2. **Your portfolio site.** Where does the demo go: embedded in a page on your site (which site, and what is it built with?), or linked out to the GitHub Pages address? This sets how much the embed mode matters.
3. **Featured worlds.** Keep the six above, or swap any?
4. **Order.** Steps 1 to 7 as listed, with a check-in after the front page (step 3) so you can see it before the rest?

## The owner's decisions (2026-10-24)

1. **Name:** keep "Evolution Sim".
2. **Portfolio site:** GitHub Pages only for now. Embed mode (step 2) is left out, and the roadmap item "Embed on the portfolio site" stays open for later.
3. **Featured worlds:** the six suggested, with the grand world as the one selected by default.
4. **Order:** as listed, with a check-in after the front page.

After Phase 10, some work on the user interface.
