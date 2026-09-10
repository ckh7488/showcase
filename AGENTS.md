# AI contributor instructions

This repository is a growing library of independently interactive HTML reports, served by GitHub Pages. Read README.md before adding or changing a report.

- Add each report in `reports/<slug>/index.html`, with all of its runtime assets inside that folder. Preserve its existing 3D, charts, animation, and input controls.
- Register exactly one entry in root `reports.json`. The landing page generates cards from that file. Do not hard-code new cards or rewrite the landing page to add a report.
- Use a unique lowercase kebab-case slug. Keep published slugs stable; do not overwrite an unrelated report.
- Keep URLs relative, including a visible `../../` link back to the report library. Never publish file://, Windows paths, localhost URLs, credentials, or unrelated workspace contents.
- Each report owns its library versions to avoid breaking other reports. Bundle necessary assets and preserve dependency licenses. Python is needed only for validation/packaging, not for running a report.
- Preserve numerical evidence, units, sources, and the distinction between measured, simulated, assumed, and unverified results. Publishing is not a reason to strengthen a conclusion.
- After changes run `python scripts/validate.py`, then serve with `python -m http.server 8000`. Test landing card → report → back, all runtime assets, 3D/interactive controls, and mobile layout. Static validation does not execute JavaScript or validate scientific conclusions.
- A main-branch push triggers validated GitHub Pages deployment. For authorized publishing, verify the Actions result and the live report URL before claiming it is live. Never force-push or delete other reports as routine cleanup.
