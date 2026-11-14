# Flow V3 — Stage 6 data, provenance, performance and accessibility audit

Audit date: 2026-11-14. Scope: **Draft PR #200** on `feat/flow-lab-v3`. No production deployment or merge is authorized by this audit.

## 1. Source and scientific provenance matrix

| Mode/source | Actual source and time semantics | Fetch/cache | Integrity and disclosure |
|---|---|---|---|
| FIELD and RELEASE / live | Open-Meteo numerical 10 m wind at 84 requested model-grid locations; snapshot validity time, not a tracked object | `api.open-meteo.com/v1/forecast`, `no-store` | Strict 84 responses; expected ordered 7×12 positions with up to 2° nearest-cell tolerance; numeric m/s and directions; one valid UTC instant; distinct STALE / RECENT / FUTURE / UNDATED labels |
| FIELD and RELEASE / archived | Static GFS U/V vector sample from `cambecc/earth@5f091f0c3b60aa38a996a886985bacb3673d16c3` | Immutable SHA, `force-cache` | U/V headers and dimensions validated; source labeled ARCHIVED; reference time must not be represented as a live forecast-valid time |
| FIELD and RELEASE / synthetic | Local analytic procedural vector field | No external request or model timestamp | Explicit `SYNTHETIC`, `NO WEATHER VALID TIME` and non-meteorological warning |
| OD | 24 directed, normalized teaching weights between 12 authored nodes | Versioned local `movement.mjs` | Relative weight units; not observed movement, routes or measured passenger counts |
| TRIPS | 8 ordered, authored teaching trajectories | Versioned local `movement.mjs` | Relative teaching time, not UTC; hollow markers identify supplied samples, geodesic arcs are derived |
| World backdrop | Natural Earth GeoJSON, SHA `0b9a6ceb0a7032713abd9460ac1e995a9c60cd1e` | Immutable SHA, `force-cache` | If boundaries fail, geographic graticule stays usable and UI says basemap unavailable |

### Failure recovery and privacy boundaries

1. The world backdrop and live weather begin downloading concurrently. World failure does not substitute fabricated boundaries.
2. Invalid grid order, malformed coordinates, inconsistent valid times, nonfinite data or incorrect units reject a live weather snapshot.
3. Live failure attempts the fixed GFS archive. Archive failure uses the synthetic field, with explicit source-recovery labels.
4. Abort propagates through both network requests. Every fetch clears its timeout and abort listener.
5. The client does not put weather responses in localStorage, IndexedDB or service-worker caches through this Flow code. `no-store` prevents deliberate HTTP caching of live data. The immutable background and archive can use HTTP caching.
6. A snapshot older than six hours is labeled STALE but remains inspectable. **No automatic live refresh or model-age forecast validation is implied.** A future timestamp more than three hours ahead gets a time-anomaly label.
7. A valid source timestamp is displayed separately from time since page retrieval. Archive reference time is not asserted to be forecast validity.
8. Third-party requests are made by the user's browser to the explicitly named providers. CORS, network policy and provider availability remain runtime dependencies.

### External terms and attribution audit (not legal approval)

- [Open-Meteo terms](https://open-meteo.com/en/terms): public/free API is subject to non-commercial use limits. API data is [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) and must carry attribution. The UI now links to the provider's terms when live data is displayed. The separate Open-Meteo source-code AGPL license does **not** become a bundled dependency.
- [Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/): geography is public domain. The [GeoJSON conversion repository](https://github.com/martynafford/natural-earth-geojson) identifies CC0 and notes the version represented by its source data. The UI links to Natural Earth when the map is loaded.
- [cambecc/earth code license](https://github.com/cambecc/earth/blob/master/LICENSE.md): MIT pertains to the visualization project's code; **do not assume this establishes rights or operational currency of the NOAA GFS sample**. The copied/served pinned weather JSON and attribution must receive a final distribution-terms review before release.
- Stage 6 adds no runtime npm dependency. Existing `@playwright/test`, `axe-core` and `sharp` are development/test dependencies. The project does not import Open-Meteo's AGPL implementation.

## 2. Reproducible performance contract

Source of limits: `site/flow/v3/core/telemetry.mjs`. CI fixture uses real Flow rendering but synthetic controlled wind/weather and backdrop responses. Every density case resets instrumentation after warmup and records at least **30 animation frames**.

| Metric | Enforced ceiling / requirement |
|---|---|
| FIELD render JS duration P95, desktop or tablet viewport | ≤45 ms |
| FIELD render JS duration P95, 390 px mobile viewport | ≤75 ms |
| Canvas estimated pixel surface allocation | ≤70 MiB |
| Flow descendant DOM nodes | ≤850 |
| SVG paths | ≤180 |
| Flow overlay renders while panning | ≤75 per elapsed second |
| Main action touch targets | ≥44 CSS px |
| Three complete Flow unmounts | Every base RAF/ResizeObserver and refinement listener/observer/timer disposed |
| Chromium forced-GC heap growth across three cycles | ≤20 MiB; evidence is not a full memory-leak proof |
| Accessibility | 0 serious or critical violations under axe WCAG 2 A/AA and 2.1 A/AA in all four modes, desktop and mobile |

**Initial verified measurement:** [Flow V3 Hardening Acceptance run 43573738355](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/43573738355) passed **41 Node tests** and **67 browser tests** (one desktop-only touch test skipped). From the archived 18 viewport/density measurements across desktop Chromium and Pixel-7-emulated Chromium, maximum drawing P95 was **28.53 ms**. Maximum Canvas allocation estimate was **21.16 MiB**, and FIELD descendant DOM count was **189**. Each of the eight axe mode/project analyses found zero WCAG violations. These are CI measurements, not benchmarks from an actual phone GPU or an extended leak soak test.

The final head will additionally require CDP forced-GC heap evidence and the tightened overlay-per-second measurement. Do not mark that gate verified until its latest CI passes.

### What this telemetry measures—and what it does not

The Flow telemetry samples JavaScript work inside its animation callback. It does **not** directly measure browser GPU composition, end-to-end input latency, network transfer, total device power or 60-FPS frame pacing. Canvas MiB is computed from allocated pixel dimensions and RGBA bytes; it does not measure GPU driver allocation. CDP heap statistics measure JavaScript objects after requested GC, not all browser memory. Do not infer zero leaks merely from a green three-cycle test.

The mobile project emulates a Pixel 7 viewport/device in Chromium on the CI host. It does not include real mobile thermal throttling. Stage 7 should run manual low-end-device review if the product is intended for production use.

## 3. Lifecycle, a11y and stress controls

- The base engine closes its RAF and ResizeObserver, removes the visibility listener, and records a disposal counter. Background tabs do not advance simulation time.
- The Round2 extension coalesces pointer movement to one pending animation frame, owns and cancels deferred timeouts, and disconnects shell, SVG, workspace and resize observers. Its global scan observer is scoped to the instrument stage rather than the entire document.
- The same TRIPS timeline and global PAUSE state govern WORK, FOCUS and INSPECT. No second playback interval exists.
- Reduced-motion launches paused and remains keyboard-inspectable.
- Map keyboard navigation, native OD/TRIPS selectors, scoped Escape handling, persistent touch results and source links remain mandatory.
- Stress matrix: particle densities 250/900/1800 × 1440×900, 900×980, 390×844, with both desktop and mobile-emulated Chromium projects.
- Source tests include fresh re-fetch across page reload, malformed-grid fallback, archived GFS labeling, synthetic-only recovery, stale UTC disclosure and changed source values.
- The full Stage 1–5 browser and Node suites remain in the same hardening workflow.

## 4. Open risks to carry into Stage 7

1. Resolve the merge base against **current main**, not the Stage 1 base. Main changed Light files, `site/lab.html` and the Pages Ubuntu runner in the previously inspected drift.
2. Require success for the final PR HEAD's Flow, Orbit, Earth Pulse, GeoGeek Quality and Pages build checks. Do not infer that Flow CI covers production deployment.
3. Reconfirm weather provider API quotas and attribution for intended use, especially if the site becomes commercial. Validate archived GFS redistribution terms separately.
4. Test the actual released site and its external CORS/data services. A screenshot captured with controlled geometry is not proof of live geodata completeness.
5. Repeat the high-density performance and responsive interaction probes on at least one real lower-end mobile device where practical.
6. Run a longer repeated-open memory soak before asserting strong leak freedom.
7. Keep the four scientific grammars separate. Do not call interpolated teaching paths observations or release spread uncertainty.

Stage 6 is a **hardening stage**. Stage 7 owns conflict resolution, final independent checks, review, merge and post-deployment verification.
