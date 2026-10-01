import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');

const routes = [
  '/',
  '/field-notes.html',
  '/lab.html',
  '/atlas.html',
  '/elsewhere.html',
  '/earth/',
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

test('Round 3 scale uses a dedicated disclosure button rather than an interactive wrapper', async ({ page }) => {
  await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
  const scale = page.locator('.scale-ui');
  const disclosure = scale.locator(':scope > .scale-disclosure');
  await expect(disclosure).toHaveCount(1);
  await expect(disclosure).toHaveAttribute('aria-controls', 'informationScaleLegend');
  await expect(scale).not.toHaveAttribute('role', 'button');
  await expect(scale).not.toHaveAttribute('tabindex', /.+/);
  await disclosure.focus();
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

test('Round 3 Lab first response removes synchronous style discovery', async ({ page }) => {
  const response = await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
  const source = await response.text();
  expect(source).toContain('data-round3-lab-critical');
  expect(source).not.toMatch(/src=["'][^"']*ux-preinit\.js/);
  expect(source).toMatch(/geo-interactions\.css[^>]*media=["']print["'][^>]*onload=/);
  expect(source).toMatch(/geo-interactions\.js[^>]*\bdefer\b/);
  expect(source).toMatch(/lab-real-previews\.js[^>]*\bdefer\b/);
});
