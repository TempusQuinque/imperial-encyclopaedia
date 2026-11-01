# Eastern Front Model 1941–42

A month-by-month model of the German–Soviet war from June 1941 to December 1942, built for the Halifax alternate-history scenario, in which Britain makes peace in 1940 and Germany invades on 1 June 1941 with more men, tanks and aircraft, against a Red Army alerted beforehand and without Lend-Lease.

Each month the model carries forward men, tanks and aircraft on both sides, the German railheads and supply reach on three axes, and the Soviet production base, and moves the front by a dozen mechanisms: pace from the force ratio, capped by supply reach and cut by mud and frost; pockets; attrition; production, mobilization and replacements; the winter counter-offensive; the Moscow defences; Stalingrad and the November counter-offensive. Decisions are levers: when Typhoon opens, whether Moscow is attacked first in 1942, when Blue starts, and four Soviet choices.

Its constants are calibrated so that the real decisions reproduce the real dates of fourteen events within days to three weeks, and the real losses and strengths of 1941 and 1942 within about 12 per cent. Each uncertain mechanism's strength is drawn from a range that acts only on departures from reality; the weather and the margins at Stalingrad and in the November counter-offensive are drawn for every run, so the real settings give a spread around the calibrated run; results are the middle of 600 runs with the 10th to 90th percentile.

The page has an English and a Russian version; the switch is at the top right, and the choice is remembered in the browser.

## Files

| File | What it is |
|---|---|
| `index.html` | The page. |
| `model.js` | The model; runs in the browser (`window.EFModel`) and in Node. |
| `tools/calibration.js` | The real run against the real checkpoints: `node tools/calibration.js` (`-v` prints the months). |
| `tools/scenario.js` | Reality and the scenario through the Monte Carlo: `node tools/scenario.js`. |
| `tools/levers.js` | Moves each lever one at a time from the scenario and prints the main outcomes: `node tools/levers.js`. |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are. |

## Publishing on GitHub Pages

1. Create a repository and upload all the files in this folder to its top level, keeping `tools/` as a folder and including `.nojekyll`.
2. In **Settings → Pages**, set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, and save.
3. After a minute or two the page is live at `https://<your-user-name>.github.io/<repository>/`.

## Limits

Two judgements are not calibrated against anything real: how fast a set-piece attack on a defended front moves (set so that the real 1942 German army would take Moscow about half the time at the default defences), and the threshold at which Moscow falls in 1941 (80 km beyond the real halt). The model does not take Leningrad by assault, and it does not decide; the decisions are levers. It checks the scenario's internal consistency; it does not forecast.

## Sources

Krivosheev (Soviet losses by operation and quarter); Halder and Stahel (German casualties); Bekker (Luftwaffe losses); Zaloga (tank stocks); Glantz and House (strengths); the real dates of the operations.
