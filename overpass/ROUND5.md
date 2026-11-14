# OVERPASS / P5 — Replay, historical Time-lapse and About

## Provenance and design contract

Pinned Watched upstream remains a0e53b62573655a81d48b60a35cf661df314f2b7.
No original shaders, scientific model, SGP4 pass scanner, capture search,
timelapse frame-selection algorithm, pushbroom geometry or replay clock is
removed or replaced. All modifications are deterministic build overlays in
the isolated P5 branch. The full original MIT LICENSE and THIRD_PARTY_NOTICES.md
are included in the static output.

## Static-host fixes

1. Time-lapse share URLs previously used location.origin and reopened GeoGeek
   root. The P5 overlay uses Vite BASE_URL, preserving /overpass/?q=…&tl=1.
2. The Time-lapse loader and MP4 export wordmark use OVERPASS rather than the
   original Watched glyph. Year/date, original frame pixels, encoder, tempo,
   and Copernicus photo attribution are unchanged.
3. About's full-screen navigation, layout, keyboard shortcuts and scientific
   explanation remain. The static copy corrects claims that are not true
   for a pinned GitHub Pages build: automatic six-hour catalog refresh,
   connected usage telemetry, host-specific cookies and narrow timing
   precision for old orbital-element epochs.
4. Credits explicitly distinguish original Watched authorship by
   Armaan Gupta from the GeoGeek adaptation. Scientific and imagery
   providers stay credited. Static /overpass/LICENSE and
   /overpass/THIRD_PARTY_NOTICES.md are shipped as files.

## Checks

- Run original 815 front-end/science tests and 152 backend tests before any
  build overlay. Preserve P3 and P4 checks.
- P5 unit coverage verifies actual Waterloo replay-window geometry,
  bounded scrub, pushbroom direction, Time-lapse gating, share URL,
  MP4 frame sequence and OVERPASS filename.
- Browser runs on the assembled /overpass/ tree using real catalog,
  provider requests and app UI. P5 checks About (including license links),
  selected-pass replay and the lazy Time-lapse modal on desktop and mobile.
- P5 intentionally does NOT claim a decade of valid historical frames
  without executing the full Time-lapse fetch or exporting a real MP4.
  The historical frame algorithm and video encoder retain their full
  upstream unit coverage. If the provider is unavailable, the UI must
  report the failure rather than invent an image.
- The integrated static artifact remains branch-only. No production deployment.

## Remaining gates

- Catalog refresh automation and data freshness rules (P3);
- optional /api/pan, /api/og, /api/e and /s/:id backend hosting;
- complete multi-year frame downloads and actual MP4 encoding across
  target browsers; final legal/provider notices review;
- GeoGeek Lab navigation and deployment integration (later rounds).
