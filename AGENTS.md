# AI contributor instructions

This repository is a growing library of independently interactive HTML reports, served by GitHub Pages. Read README.md before adding or changing a report.

The public name is **ATLAS**, its subtitle is **Interactive Library**, and the landing list is **Collections**. Use `← ATLAS` for report navigation back to the library and `<report title> | ATLAS` for report page titles. Preserve the existing `showcase` repository/URLs, deployment command names, and published report slugs.

Read DESIGN.md before authoring or restyling a report. The shared visual language is a quiet, light document surface with dark text and teal accents, matching the landing page. Registered reports must load `../../assets/theme.v1.css`; use its tokens instead of inventing a new palette. Shared theme styles and the ATLAS favicon are exceptions to per-report self-containment. Keep individual scripts, data, 3D models, and third-party library versions in the report folder.

HTML is chosen primarily for interactivity. Make important structures and comparisons explorable: rotate/select/isolate geometry, select a result to reveal its numbers and corresponding structure, compare states, and use meaningful parameter controls where supported by actual data. Do not substitute a static screenshot for a working interaction, add decorative controls, imply a fresh simulation when selecting existing results, or interpolate uncomputed frequencies. Preserve readable defaults, keyboard controls, selection states, mobile usability, and a way to return to the overview.

The same static content is also deployable in FreeBSD/Bastille. `deploy/freebsd/README.md` documents the update command, Nginx setup, and rollback. Keep reports portable across both hosts. Deployment-tool changes require the integration tests in `tests/test_freebsd_update.py`; distinguish CI/POSIX testing from installation on the user's actual jail.

- Add each report in `reports/<slug>/index.html`, with all of its runtime assets inside that folder. Preserve its existing 3D, charts, animation, and input controls.
- Register exactly one entry in root `reports.json`. The landing page generates cards from that file. Do not hard-code new cards or rewrite the landing page to add a report.
- Use a unique lowercase kebab-case slug. Keep published slugs stable; do not overwrite an unrelated report.
- Keep URLs relative, including a visible `../../` link back to the report library. Never publish file://, Windows paths, localhost URLs, credentials, or unrelated workspace contents.
- Each report owns its library versions to avoid breaking other reports. Bundle necessary assets and preserve dependency licenses. Python is needed only for validation/packaging, not for running a report.
- Preserve numerical evidence, units, sources, and the distinction between measured, simulated, assumed, and unverified results. Publishing is not a reason to strengthen a conclusion.
- After changes run `python scripts/validate.py`, then serve with `python -m http.server 8000`. Test landing card → report → back, all runtime assets, 3D/interactive controls, and mobile layout. Static validation does not execute JavaScript or validate scientific conclusions.
- A main-branch push triggers validated GitHub Pages deployment. For authorized publishing, verify the Actions result and the live report URL before claiming it is live. Never force-push or delete other reports as routine cleanup.
