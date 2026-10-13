# Water A12 independent public preview acceptance

The A12 PR is desktop-only (1280×720 and 1600×1000). It must not be merged until full CI, real captured screenshots, and **public A12 deployment** have been verified. CI localhost previews are **not** proof of public hosting.

## Deploy without touching GitHub Pages

1. Download the `a12-built-preview` artifact from the current PR-head Quality run. Extract its **exact `dist/` directory** into a new isolated hosting project, with `dist/` served as the domain root over HTTPS (for example, an authorized Vercel preview). **Do not rebuild** the site at the preview provider: the public gate hashes seven reproducible A12 JS/CSS/Water files against the CI build. Lab HTML has dynamic preview-image cache hashes and is verified semantically by release markers and the browser.
2. Use the independent preview origin only. Do not point the preview job at `geogeeklab.github.io`, redirect the main domain, or change GitHub Pages deployment settings.
3. In Actions, run **GeoGeek Quality** manually at the A12 PR branch ref, supplying its optional `preview_url` input as the bare HTTPS origin (e.g. `https://example-preview.vercel.app/`). The conditional public staging gate will run following build and upload `a12-public-preview` with `result.json` and two real desktop screenshots. The full Quality workflow must also pass.
4. Confirm `.a12-public-preview/result.json` has `status: pass`, `publicPreviewVerified: true`, seven matching SHA-256 asset hashes, zero 4xx critical resource errors and desktop checks for both resolutions. The gate exercises both cache-busted and normal-cache URLs and the original A11 shared-link query.
5. Record the public preview URL, immutable A12 PR SHA, full CI run, uploaded screenshots and exact public result in PR #184. If any check fails, leave it Draft; repair only on the PR branch and rerun. Check performance separately: standalone Water Lighthouse is not the Lab host Lighthouse (`NO_LCP` has been observed on the host).
6. Once this public preview gate and all other tests pass, make a deliberate promotion decision. GitHub Pages will still require a **post-deploy production smoke** after merge; do not declare production complete until the deployed public A12 files, normal cache and old shared URL are verified by `scripts/verify-water-quiet-release.mjs --url https://geogeeklab.github.io/` and the Pages smoke workflow.

The optional public gate is not executed when `preview_url` is absent. A green normal PR workflow therefore remains a **pre-release technical result**, not an authorization to merge.
