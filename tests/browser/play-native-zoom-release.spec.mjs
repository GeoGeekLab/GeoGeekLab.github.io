import {test, expect, chromium} from '@playwright/test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const instruments = [
  ['locate', 'orient'], ['zone', 'bound'], ['path', 'connect'],
  ['project', 'project'], ['light', 'light'], ['swath', 'swath']
];

test('STEP 12: native Chromium 125% zoom preserves six PLAY workspaces', async ({}, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'Native desktop page zoom only');
  test.setTimeout(240_000);
  const root = await mkdtemp(join(tmpdir(), 'geogeek-native-zoom-'));
  const extension = join(root, 'zoom-extension');
  await mkdir(extension);
  await writeFile(join(extension, 'manifest.json'), JSON.stringify({
    manifest_version: 3,
    name: 'GeoGeek Native Browser Zoom QA',
    version: '1.0.0',
    permissions: ['tabs'],
    host_permissions: ['http://127.0.0.1:4173/*'],
    background: {service_worker: 'background.js'}
  }));
  await writeFile(join(extension, 'background.js'),
    'chrome.runtime.onInstalled.addListener(() => {});');
  let browser;
  try {
    // This uses Chrome's actual tab zoom API, not CSS zoom or viewport emulation.
    browser = await chromium.launchPersistentContext(join(root, 'user-data'), {
      channel: 'chromium',
      headless: true,
      viewport: { width: 1920, height: 1080 },
      baseURL: 'http://127.0.0.1:4173',
      args: [
        `--disable-extensions-except=${extension}`,
        `--load-extension=${extension}`
      ]
    });
    const worker = browser.serviceWorkers().find(w => w.url().startsWith('chrome-extension://'))
      || await browser.waitForEvent('serviceworker', { timeout: 20_000 });
    const page = await browser.newPage();
    await page.addInitScript(() => localStorage.setItem('geogeek.orient.primer.v1',
      JSON.stringify({version:'orient-primer-1', seen:true})));
    await page.goto('/lab.html?instrument=project', {waitUntil:'domcontentloaded'});
    const applied = await worker.evaluate(async () => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(t => t.url?.includes('127.0.0.1:4173/lab.html'));
      if (!tab) throw Error('Cannot find target Lab tab for native browser zoom.');
      await chrome.tabs.setZoom(tab.id, 1.25);
      return chrome.tabs.getZoom(tab.id);
    });
    expect(applied).toBeCloseTo(1.25, 2);

    for (const size of [
      {width:1920,height:1080},
      {width:1440,height:900},
      {width:1366,height:768}
    ]) {
      await page.setViewportSize(size);
      for (const [instrument, kind] of instruments) {
        await page.goto(`/lab.html?instrument=${instrument}`, {waitUntil:'domcontentloaded'});
        const shell = page.locator(
          `.play-shell[data-play-kind="${kind}"], .play-v2-shell[data-play-kind="${kind}"]`);
        await expect(shell).toBeVisible({ timeout: 20_000 });
        const bounds = await shell.evaluate(root => {
          const dialog = document.getElementById('instrumentDialog');
          const r = element => element.getBoundingClientRect();
          const shell = r(root), modal = r(dialog);
          return {
            innerWidth, innerHeight, docWidth: document.documentElement.scrollWidth,
            shellWidth:shell.width, shellHeight:shell.height,
            modalWidth:modal.width, modalHeight:modal.height
          };
        });
        // Native 125% zoom reduces CSS layout pixels inside the same browser viewport.
        expect(bounds.innerWidth).toBeGreaterThan(size.width * 0.74);
        expect(bounds.innerWidth).toBeLessThan(size.width * 0.84);
        expect(bounds.innerHeight).toBeLessThan(size.height);
        expect(Math.abs(bounds.modalWidth - bounds.innerWidth)).toBeLessThanOrEqual(2);
        expect(Math.abs(bounds.modalHeight - bounds.innerHeight)).toBeLessThanOrEqual(2);
        expect(Math.abs(bounds.shellWidth - bounds.modalWidth)).toBeLessThanOrEqual(2);
        expect(bounds.docWidth).toBeLessThanOrEqual(bounds.innerWidth + 2);
        await info.attach(`step12-native125-${kind}-${size.width}`, {
          body: await page.screenshot({ animations:'disabled' }),
          contentType: 'image/png'
        });
      }
    }
  } finally {
    await browser?.close();
    await rm(root, {recursive:true, force:true});
  }
});
