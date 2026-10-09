# PLAY Desktop V2 — Baseline Audit

Recorded: 2026-10-09  
Repository: `GeoGeekLab/GeoGeekLab.github.io`  
Main baseline commit: `f453201c1fbae979b2f3369fedb01c4894653067`  
Lab release marker: `20261009v102`  
Current implementation: six modules under `site/play/`  
Evidence level: source review plus six provided desktop screenshots. No instrument was operated in a browser during this audit.

## 1. Visual evidence

Six desktop screenshots were supplied for the initial review. They are all 1920×869 PNG images and show initial or early interaction states. They are reference captures, not automated Playwright screenshots. The original binaries are retained with the project handoff bundle; they have not been added to the source branch.

| Instrument | Screenshot file | SHA-256 prefix | State observed |
| --- | --- | --- | --- |
| Project | `project.png` | `2bb0ec6b8210547f` | Area prediction; world projection vertically compressed |
| Light | `light.png` | `b247bb7a90857426` | First sky-scattering prediction; panel overlaps scene/spectrum area |
| Swath | `swath.png` | `f171fc7dddfe5b` | FOV prediction; center geometry competing with panel and metrics |
| Orient | `orient.png` | `60dc06729eeae390` | Cape Town → Istanbul judgment; dark globe and low-contrast conditions |
| Bound | `bound.png` | `3a155b6b32a28e4e` | Flood-risk guided region; oversized decision panel blocks field |
| Connect | `connect.png` | `0722413956f385df` | Portugal → Poland planning; subdued nodes and network edges |

Keep raw screenshot images out of `site/` unless they are intentionally made into site assets. Store the capture manifest and compare against future reproducible screenshots. Desktop retakes are required before accepting visual regression in STEP 12.

## 2. Architectural inventory

```text
site/lab.html
  ├── site/lab-copy-preinit.js           collection, record grouping
  ├── site/play/play-bootstrap.js        six PLAY card records/metadata
  ├── site/play/play-runtime.js          dynamic loader, open/close
  ├── site/play/play-shell.js            shared shells
  │     ├── create()                     Orient legacy shell
  │     └── createV2()                   Bound/Connect/Project/Light/Swath
  ├── site/play/play*.css                common and interaction styles
  ├── site/lab-page.css                  dialog base styles
  ├── site/lab-fullpage.js/.css          existing Observatory fullscreen system
  └── site/play/{module}/               instrument logic and presentation
```

Instrument-to-entry mapping:

| Card key | Instrument | Runtime | Visual state |
| --- | --- | --- | --- |
| `locate` | Orient | `site/play/orient/orient.js` | Legacy `.play-shell`; absolute four-corner overlays |
| `zone` | Bound | `site/play/bound/bound.js` | V2 canvas/SVG risk field; decision panel |
| `path` | Connect | `site/play/connect/connect.js` | V2 geographic graph and route overlay |
| `project` | Project | `site/play/project/project.js` | V2 continuous projection transform |
| `light` | Light | `site/play/light/light.js` | V2 sky/water/light path and spectral plot |
| `swath` | Swath | `site/play/swath/swath.js` | V2 sensor geometry and metric overlays |

Cross-cutting files: `site/play/play-core.js`, `site/play/play-trace.js`, `site/play/play-v2.css`, `site/play/play-feedback.css`, `site/play/play-signature.css`, `site/play/play-collection.css`, `site/play/play-liveness.css`.

The existing fullpage system applies to `world`, `figure`, `orbit`, `earth`, `flow`, `pulse`, `water`. PLAY has a separate opening and presentation path. Changes at STEP 04 must keep these sets isolated unless a shared abstraction is covered by tests.

## 3. Baseline issues

### P0 — Project geometry
- **Observed:** Initial map appears as a very narrow vertical strip despite a large SVG viewport.
- **Evidence:** screenshot plus `site/play/project/project-morph.js`.
- **Candidate cause:** raw Mercator approaches pole singularity at the current near-±90° clamp, while `fitExtent(extent, sphere)` fits the extreme projected boundary.
- **Required next check:** reproduce at 1920×1080 and 1366×768; inspect path bounds/scale and transitions to Equal Earth and Tokyo-centered azimuthal. Do not assert the root cause until checked.
- **Owner:** STEP 01.

### P0 — Light chart comparability
- **Observed in code:** `pathD(values)` computes its own maximum separately for `chart.before` and `chart.after`.
- **Effect:** a magnitude-only difference may appear unchanged when both paths are normalized separately.
- **Required next check:** common within-experiment Y domain; zero signals; valid quantities and units; screen explanation of reference 550 nm readout.
- **Owner:** STEP 02.

### P1 — Intrusive panels and weak hierarchy
- **Bound:** task panel masks risk field and the decision boundary.
- **Light:** scene and plot share the viewport with a dense lower-left panel.
- **Swath:** model, predictions and metrics compete for the same visual attention.
- **Orient:** task typography and conditions overpower the interactive globe.
- **Connect:** the clearest composition but low network-state contrast and minimal legend.
- **Project:** too much unused canvas while map geometry is defective.
- **Owner:** STEPS 03–10.

### P1 — Split shell and workspace contracts
- Orient uses `.play-shell`; the other five use `.play-v2-shell`.
- Desktop workbench grid and immersive viewport need a PLAY-specific integration contract, rather than broad selectors that change non-PLAY instruments.
- `site/play/play-v2.css` uses absolute overlays and rounded corners; this conflicts with the proposed permanent task/evidence rails.
- **Owner:** STEP 04.

### P2 — Documentation / test-contract drift
- Root `README.md` still describes PLAY / 04, whereas runtime and collection define six PLAY instruments.
- `playwright.config.mjs` includes both `desktop-chromium` and `mobile-chromium`. The redesign should scope its own checks to desktop rather than deleting legacy mobile CI jobs.
- Some browser tests assert exact current shell geometry or wording. Update those expectations only when the new design contract is implemented; keep scientific assertions intact.
- **Owner:** document in STEP 00; revisit at STEPS 04 and 12.

## 4. Testing and screenshot baseline

Current toolchain:
- Build: `npm run build`.
- Node QA: `npm run qa` (Orient, Bound, Connect, Light, Swath, Water, World, shared scripts).
- Link QA: `npm run qa:links`.
- Playwright: `npm run qa:browser`; config starts `scripts/quality-server.mjs` at `http://127.0.0.1:4173`.

Targeted desktop coverage:
```bash
npx playwright test tests/browser/play-spatial-reasoning.spec.mjs --project=desktop-chromium
npx playwright test tests/browser/play-v2-presentation.spec.mjs tests/browser/play-signature-moments.spec.mjs --project=desktop-chromium
npx playwright test tests/browser/play-entry-pointer.spec.mjs tests/browser/light-play.spec.mjs tests/browser/swath-play.spec.mjs --project=desktop-chromium
npx playwright test tests/browser/lab-fullpage-workspace.spec.mjs --project=desktop-chromium
```

For desktop visual baseline captures, use 1920×1080 (primary), 1440×900, 1366×768 and 1920×1080 at 125% page zoom. Capture each instrument at: entry, judgment, committed state, condition change, result. Use the release-marked URL and record the commit SHA, actual viewport, pixel ratio, browser version and state transitions. Tests that have not been run must be recorded as **NOT RUN**, not passed.

## 5. Execution limitations at STEP 00

This step establishes source and visual observations only. No project build, Node QA, browser test or automated screenshot was run against the baseline checkout. The repository was inspected through its remote source interface; a local source checkout and networked browser environment were unavailable.

This is acceptable for the STEP 00 documentation gate but **not** evidence of a passing runtime baseline. Capture actual browser baselines before claiming STEP 01 or STEP 12 visual/regression completion.
