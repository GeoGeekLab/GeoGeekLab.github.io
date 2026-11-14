# OVERPASS / P6 — GeoGeek Lab isolated integration

## Architectural decision

The existing GeoGeek Lab includes thirteen self-contained instruments in a
static first-paint collection, with a separate modal workspace, a JS loader,
real captured previews and relative information-scale controls. The Watched
derived OVERPASS is a full-screen React/WebGL application, not a mountable
in-Lab stage. Nesting its clock, pointer capture, keyboard shortcuts and
focus trap in the GeoGeek modal would add lifecycle and GPU conflicts.

**P6 routes OVERPASS into its own same-origin document** at \`/overpass/\`.
It is not an iframe. The appended Lab card has an ordinary anchor which
works when scripting is disabled. The small, unobtrusive \`← LAB\` link in
OVERPASS returns to \`/lab.html#l17\`. Browser Back preserves location query
strings and searches. When Watched's About or Time-lapse modal is active,
this outside link hides to preserve the original modal focus/visual hierarchy.

## Changes limited to the preview bundle

- The pinned upstream Watched commit remains
  \`a0e53b62573655a81d48b60a35cf661df314f2b7\`.
- P2–P5 overlays and full original scientific/imagery source stay intact.
- The original GeoGeek host runs \`npm run build\` first and passes its
  existing 13-card Lab and preview checks.
- \`integrate-p6.mjs\` inserts the 14th, id \`l17\`, at the end of the
  existing OBSERVATORY grid in the compiled first HTML. It keeps all thirteen
  existing card nodes and all old modal routes.
- The host JS guard is adjusted in the isolated build to recognize the
  14-card static collection. \`lab-page.js\` accepts the new
  \`data-instrument-route\` anchor without routing it through an
  \`[data-instrument]\` modal loader. Legacy Orbit, Water, Earth, Flow and Play
  handlers are not patched.
- A separate instrument record at \`/records/lab-l17.html\` states data,
  method, evidence and limits, preserves Watched MIT credit and provides
  an OPEN OVERPASS action.
- P6 captures its preview JPEG from an actual headless browser rendering
  of the P5 application; it never substitutes a stock Earth illustration.
  Its file is separate from GeoGeek's original 13-instrument preview manifest.
- The fully assembled host and OVERPASS are staged under
  \`overpass/preview-root/\` and uploaded as an artifact only. Production main
  and its GitHub Pages deployment workflow remain untouched.

## Verification

1. Node contract tests ensure P6 adds exactly one card and rejects missing
   original card IDs, invalid source shape, repeated mutation and missing
   attribution.
2. Existing Watched client/scientific, backend and P3–P5 checks run unchanged.
3. GeoGeek's original Lab preview cache contract and build are validated
   before and after the integration. No existing preview assets are replaced.
4. A JavaScript-disabled browser must see all 14 first-paint cards and a
   working normal anchor for OVERPASS.
5. Desktop and mobile tests navigate Lab → OVERPASS → Lab#l17, verify
   a real captured preview, the legacy Orbit modal, exact coordinates in
   deep links, Browser Back and About modal occlusion.
6. Every screenshot and test trace is attached to the P6 Actions run.

## Publication boundary and P7

P6 is a **preview-only postbuild adapter**, not a production-ready source
registry migration. P7 must move the l17 card into the authored GeoGeek
archive/model, extend the preview manifest and deployment workflow, confirm
freshness of the underlying orbit catalog, and review third-party notices.
The separate document route is intentional and must remain.

This round makes no claims that pinned historic orbital elements are current,
nor that a pass guarantees an image was captured. No dynamic social preview
server, 15-metre pan sharpener or complete historical MP4 acceptance is
included.
