import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const sourceLabUrl = new URL('../../site/lab.html', import.meta.url);
const legacyPreviewUrl = new URL('../../site/previews.js', import.meta.url);

const routes = [
  '/',
  '/field-notes.html',
  '/lab.html',
  '/atlas.html',
  '/elsewhere.html',
  '/origin/'
];

async function seriousAxeViolations(page) {
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => {
    const results = await window.axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
      },
      resultTypes: ['violations']
    });
    return results.violations.filter(item => item.impact === 'serious' || item.impact === 'critical');
  });
  return violations;
}

for (const route of routes) {
  test(`Round 3 ${route} has no serious axe violations`, async ({ page }, testInfo) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    await page.waitForTimeout(450);
    const violations = await seriousAxeViolations(page);
    await testInfo.attach('round3-serious-axe.json', {
      body: Buffer.from(JSON.stringify(violations, null, 2)),
      contentType: 'application/json'
    });
    const summary = violations.map(item => `${item.impact}:${item.id}[${item.nodes.length}]`);
    expect(summary, `Serious/critical axe findings on ${route}`).toEqual([]);
  });
}

test('Round 3 Lab source has no legacy preview runtime', () => {
  const source = readFileSync(sourceLabUrl, 'utf8');
  expect(source).not.toMatch(/<script\b[^>]*src=["'](?:\.?\/)?previews\.js(?:\?[^"']*)?["']/i);
  expect(source).not.toMatch(/earth-observatory\.jpg/i);
  expect(existsSync(legacyPreviewUrl)).toBe(false);
});

test('Round 3 scale uses a dedicated disclosure button rather than an interactive wrapper', async ({ page }, testInfo) => {
  await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
  const scale = page.locator('.scale-ui');
  const disclosure = scale.locator(':scope > .scale-disclosure');
  await expect(disclosure).toHaveCount(1);
  await expect(disclosure).toHaveAttribute('aria-controls', 'informationScaleLegend');
  await expect(scale).not.toHaveAttribute('role', 'button');
  await expect(scale).not.toHaveAttribute('tabindex', /.+/);

  if (testInfo.project.name === 'mobile-chromium') {
    await expect(scale).toBeHidden();
    await expect(disclosure).toBeHidden();
    return;
  }

  await expect(disclosure).toBeVisible();
  await disclosure.focus();
  await expect(disclosure).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
});

test('Round 3 Atlas node controls expose at least a 24px hit box', async ({ page }) => {
  await page.goto('/atlas.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#atlasStage .atlas-node');
  const sizes = await page.locator('#atlasStage .atlas-node').evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { ref: node.getAttribute('data-record-ref'), width: rect.width, height: rect.height };
  }));
  expect(sizes.length).toBeGreaterThan(10);
  const undersized = sizes.filter(item => item.width < 24 || item.height < 24);
  expect(undersized).toEqual([]);
});

test('Round 3 Lab keeps only noncritical interaction enhancement off the first-view path', async ({ page }) => {
  const response = await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
  const source = await response.text();
  expect(source).toContain('data-round3-lab-critical');
  expect(source).not.toMatch(/src=["'][^"']*ux-preinit\.js/);
  expect(source).toMatch(/geo-interactions\.css[^>]*media=["']print["'][^>]*onload=/);
  expect(source).toContain('data-round3-lab-postload');
  expect(source).not.toMatch(/<script\b[^>]*src=["'][^"']*geo-interactions\.js/i);
  expect(source).toMatch(/<script\b[^>]*src=["']\/lab-real-previews\.js\?v=capture-[a-f0-9]{12}["'][^>]*\bdefer\b[^>]*data-round3-lab-previews=["']authoritative["']/i);
  expect(source).not.toMatch(/<script\b[^>]*src=["'](?:\.?\/)?previews\.js/i);
  expect(source).not.toMatch(/earth-observatory\.jpg/i);
  expect(source).toContain('requestIdleCallback');
  expect(source).toContain("addEventListener('load'");
});

test('Round 3 Lab first painted Observatory frame already uses authoritative captures', async ({ page }) => {
  await page.addInitScript(() => {
    window.__labFirstPaint = new Promise(resolve => {
      let scheduled = false;
      const capture = () => {
        const list = document.getElementById('labList');
        const observatory = list?.querySelector(':scope > .lab-group-observatory');
        if (!list || !observatory || list.querySelectorAll('.project-card').length !== 10 || observatory.querySelectorAll('.project-card').length !== 6 || scheduled) return false;
        scheduled = true;
        requestAnimationFrame(() => {
          const captureImages = [...observatory.querySelectorAll('.project-visual > img')]
            .map(img => img.getAttribute('src') || '')
            .filter(src => src.includes('/assets/lab/previews/'));
          resolve({
            captureImages,
            legacyArtCount: observatory.querySelectorAll('.preview-art, .live-earth-preview, .live-pulse-layer, .orbit-live-point').length
          });
        });
        return true;
      };
      const observer = new MutationObserver(() => {
        if (capture()) observer.disconnect();
      });
      observer.observe(document, { childList: true, subtree: true });
      capture();
    });
  });

  await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
  const firstPaint = await page.evaluate(() => window.__labFirstPaint);
  expect(firstPaint.legacyArtCount).toBe(0);
  expect(firstPaint.captureImages).toHaveLength(6);
  for (const src of firstPaint.captureImages) {
    expect(src).toMatch(/^\/assets\/lab\/previews\/(?:orbit|earth|flow|pulse|figure|world)\.jpg\?v=capture-[a-f0-9]{12}$/);
  }
});
