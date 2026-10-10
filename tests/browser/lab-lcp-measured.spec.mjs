import { test, expect } from '@playwright/test';

// A measured-browser cross-check for Lab's Lighthouse simulated mobile LCP.
// Lighthouse's Lantern projection (~8.8 s) diverges sharply from the observed
// local trace (~0.35 s). Never label either number field/user RUM.
test('Lab records throttled browser LCP, boot reveal and Orbit request evidence', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile-only diagnostic; desktop is covered by existing regressions.');
  test.setTimeout(90_000);

  await page.addInitScript(() => {
    window.__geogeekLabLcpDiagnostic = { largestPaintEntries: [] };
    try {
      new PerformanceObserver(list => {
        const state = window.__geogeekLabLcpDiagnostic;
        for (const entry of list.getEntries()) {
          state.largestPaintEntries.push({
            startTime: entry.startTime,
            element: entry.element?.id || entry.element?.closest?.('.project-card')?.id || entry.element?.tagName || null,
            size: entry.size
          });
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // Unsupported observers are reported as missing evidence, not fabricated timings.
    }
  });

  const session = await context.newCDPSession(page);
  await session.send('Network.enable');
  // Actual Chrome throttling, rather than Lantern's post-processed simulation.
  // Approximate 4x CPU and 1.6 Mbps / 150 ms RTT, documented for comparison.
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 200_000,
    uploadThroughput: 200_000,
    connectionType: 'cellular4g'
  });

  const response = await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBe(true);
  await expect(page.locator('#labList[data-static-lab-collection="v1"] .project-card')).toHaveCount(13);
  await page.waitForFunction(() => window.__GEOGEEK_VISUAL_READY__ === true, null, { timeout: 30_000 });
  await page.waitForFunction(() => {
    const image = document.querySelector('#l04 .project-visual.is-real-output img');
    return Boolean(image?.complete && image.naturalWidth > 0);
  }, null, { timeout: 30_000 });
  // Allow the browser to emit the final buffered LCP record after image paint.
  await page.waitForTimeout(1000);

  const evidence = await page.evaluate(() => {
    const paint = performance.getEntriesByType('paint');
    const res = performance.getEntriesByType('resource');
    const orbit = res.find(e => {
      const url = new URL(e.name).pathname;
      return url.endsWith('/assets/lab/previews/orbit.jpg') ||
        url.endsWith('/assets/lab/previews/orbit.webp');
    });
    const nav = performance.getEntriesByType('navigation')[0];
    const state = window.__geogeekLabLcpDiagnostic;
    return {
      methodology: 'Chromium CDP mobile actual throttling: 4x CPU, 150 ms latency, 1.6 Mbps down/up',
      notFieldRUM: true,
      fcpMs: paint.find(e => e.name === 'first-contentful-paint')?.startTime ?? null,
      observedLcpMs: state?.largestPaintEntries?.at(-1)?.startTime ?? null,
      observedLcpElement: state?.largestPaintEntries?.at(-1)?.element ?? null,
      visualReadyAtMs: window.__GEOGEEK_VISUAL_READY_AT__ ?? null,
      domContentLoadedMs: nav?.domContentLoadedEventEnd ?? null,
      documentLoadMs: nav?.loadEventEnd ?? null,
      orbitRequestStartMs: orbit?.startTime ?? null,
      orbitResponseEndMs: orbit?.responseEnd ?? null,
      orbitTransferBytes: orbit?.transferSize ?? null,
      orbitImageFormat: orbit ? new URL(orbit.name).pathname.split('.').at(-1) : null,
      orbitDisplayedSrc: document.querySelector('#l04 img')?.currentSrc ?? null,
      staticCardCount: document.querySelectorAll('#labList .project-card').length,
      firstPreviewNaturalWidth: document.querySelector('#l04 img')?.naturalWidth ?? null,
      bootState: document.documentElement.dataset.geogeekBoot
    };
  });
  expect(evidence.staticCardCount).toBe(13);
  expect(evidence.bootState).toBe('ready');
  expect(evidence.firstPreviewNaturalWidth).toBeGreaterThan(0);
  expect(evidence.fcpMs).toBeGreaterThan(0);
  expect(evidence.visualReadyAtMs).toBeGreaterThan(0);
  expect(evidence.orbitResponseEndMs).toBeGreaterThan(0);
  expect(evidence.observedLcpMs).toBeGreaterThan(0);

  await testInfo.attach('lab-lcp-mobile-cdp-measured.json', {
    contentType: 'application/json',
    body: Buffer.from(JSON.stringify(evidence, null, 2))
  });
  console.log('LAB-LCP-CDP-MEASURED ' + JSON.stringify(evidence));
  await session.detach();
});
