import { test, expect } from '@playwright/test';

test('a failed readiness runtime cannot conceal the static document', async ({page}) => {
  await page.route('**/visual-readiness.js*', route=>route.abort());
  await page.goto('/field-notes.html', {waitUntil:'domcontentloaded'});
  await expect(page.locator('main')).toBeVisible({timeout:6000});
  await expect(page.locator('html')).toHaveAttribute('data-geogeek-boot','ready');
  await expect(page.locator('[data-static-note-list] a')).toHaveCount(23);
});

test('articles remain readable when JavaScript is disabled', async ({browser}) => {
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  try {
    await page.goto('http://127.0.0.1:4173/field-notes/limits-of-ai-geospatial-foundation-models/');
    await expect(page.locator('[data-static-body]')).toBeVisible();
    await expect(page.locator('[data-static-body]')).toContainText(/AlphaEarth|geospatial/i);
  } finally { await context.close(); }
});

test('legacy Lab records select the canonical navigation destination', async ({page}) => {
  await page.goto('/record.html?ref=lab%3Al13');
  await expect(page.locator('#primaryNav a[aria-current="page"]')).toHaveText('Lab');
  await expect(page.locator('#primaryNav a[aria-current="page"]')).toHaveAttribute('href','lab.html');
});

test('home discovery and local observation scope are explicit', async ({page}) => {
  await page.goto('/');
  await expect(page.getByRole('link',{name:'Explore the Lab'})).toBeVisible();
  await expect(page.locator('#observationScope')).toContainText('not shared publicly');
  await page.locator('#now').scrollIntoViewIfNeeded();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const size=await page.locator('.coord-readout-meta').evaluate(node=>parseFloat(getComputedStyle(node).fontSize));
  expect(size).toBeGreaterThanOrEqual(11);
});
