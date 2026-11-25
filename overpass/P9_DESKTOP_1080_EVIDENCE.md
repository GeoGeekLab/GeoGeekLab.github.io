# P9 real desktop historical MP4 evidence

Observed 2026-11-14T12:08:48.202Z on GitHub Actions Ubuntu 24.04,
Playwright desktop Chromium (1920 × 1080 browser viewport).

- Workflow run: https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/43593076788
- Artifact: p9-real-desktop-1080-evidence (ZIP; retention 14 days)
- Source ref at test run: 4cf4efaef097a96cac847518db278e333074ba82
- Historical images: 8 real Sentinel-2 frames, Singapore, 2017–2026
- Provider observations: 77 HTTP responses, all 2xx
- Exported MP4: 1080 × 1080, 11.4 seconds, VP9, 10,396,372 bytes
- Export duration from browser Video click to download event: 125,482 ms
- Provisional max export duration: 540,000 ms; result: PASS
- Required width: at least 1,080 px; result: PASS
- SHA-256 of MP4: e5a0cf4cc1df759ca9b9b4d00b0d36b5b315f3ae32139d4fcb91cf2e8c87df4f
- mp4-evidence.json: recorded by test and retained in the Actions ZIP
- Production approval reported by test: false

The exported bytes and ffprobe codec/dimensions/duration were independently
checked against the downloaded GitHub Actions artifact during this review.

The pinned Watched video encoder tries H.264/AVC before VP9/AV1. Linux Chromium
selected VP9 in this run; the result is NOT proof of macOS or iPhone Safari
playback/export. Obtain native Apple-device test results or explicit approval
of a documented incompatibility before any public release.

This evidence closes only the provisional desktop Chromium 1080px performance
and real-historical-archive export subcheck in #205. It does **not** authorize
staging, live rollback, provider terms, backend scope or public publication.
