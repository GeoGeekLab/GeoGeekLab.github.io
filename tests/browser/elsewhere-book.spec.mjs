import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { isPublishedBook } from '../../scripts/content-contract.mjs';

const sourceRoot = new URL('../../content/elsewhere/book/', import.meta.url);
const books = readdirSync(sourceRoot, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => JSON.parse(readFileSync(new URL(`${entry.name}/record.json`, sourceRoot), 'utf8')));
const publishedBooks = books.filter(isPublishedBook);
const draftBooks = books.filter(book => !isPublishedBook(book));

test('BOOK 001 keeps BOOK metadata and authored reading response visibly readable in production', async ({ page }) => {
  await page.goto('/records/elsewhere-book-001.html');

  await expect(page.locator('body')).toHaveAttribute('data-static-record', 'true');
  await expect(page.locator('#recordKicker')).toHaveText('BOOK / RECORD');
  await expect(page.locator('#recordDetailLabel')).toHaveText('READING RESPONSE');

  const meta = page.locator('#recordMeta');
  await expect(meta).toContainText('FIELD');
  await expect(meta).toContainText('READING');
  await expect(meta).toContainText('William Manchester');
  await expect(meta).toContainText('FRAME');

  const detail = page.locator('#detail');
  await expect(detail).toHaveClass(/geo-reveal/);
  await expect.poll(() => detail.evaluate((node) => getComputedStyle(node).opacity)).toBe('1');

  const body = page.locator('#recordBody');
  const firstBook001Paragraph = body.locator('p').first();
  const book001FontSize = await firstBook001Paragraph.evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  expect(book001FontSize).toBeGreaterThanOrEqual(18);
  expect(book001FontSize).toBeLessThanOrEqual(20);
  await expect(body).toContainText('Before reading The Glory and the Dream');
  await expect(body).toContainText('After a society passes through crisis after crisis');

  const english = body.locator('[data-book-lang-button="en"]');
  const chinese = body.locator('[data-book-lang-button="zh"]');
  await expect(chinese).toHaveAttribute('aria-pressed', 'true');
  await expect(english).toHaveAttribute('aria-pressed', 'false');

  const chinesePanel = body.locator('[data-book-lang-panel="zh"]');
  const englishPanel = body.locator('[data-book-lang-panel="en"]');
  await expect(chinesePanel).toBeVisible();
  await expect(englishPanel).toBeHidden();
  await expect(chinesePanel.locator(':scope > article.book-reading-essay')).toHaveCount(1);
  await expect(chinesePanel.locator('.book-record-section')).toHaveCount(0);
  await expect(chinesePanel.locator('.book-reading-essay > p')).toHaveCount(13);
  await expect(chinesePanel).toContainText('“那幻灭的光芒究竟去了哪里？昔日的荣耀与梦想又落在了何方？”');
  await expect(chinesePanel).toContainText('在翻开这部皇皇巨著之前，二十世纪中叶的美国在我脑海中');
  await expect(chinesePanel).toContainText('历史从不曾依原样描红');
  await expect(chinesePanel).toContainText('它没有顺理成章的传世孤本，却值得在不同的时代风浪里，一次又一次翻开残页，回去追问。');
});

test('Elsewhere links only published BOOK records', async ({ page }) => {
  await page.goto('/elsewhere.html#e02');
  const collection = page.locator('#e02[data-collection-entry="true"]');
  await expect(collection).toBeVisible();
  const records = collection.locator('.book-unit-row');
  await expect(records).toHaveCount(publishedBooks.length);
  for (const book of publishedBooks) {
    await expect(collection.locator(`[data-record-ref="${book.ref}"]`)).toContainText(book.text.en.title);
  }
  for (const book of draftBooks) {
    await expect(collection.locator(`[data-record-ref="${book.ref}"]`)).toHaveCount(0);
  }
});

test('previously shared draft BOOK URLs explain the unpublished state and stay out of discovery', async ({ page, request }) => {
  const book = draftBooks[0];
  expect(book).toBeTruthy();
  const route = `/records/${book.ref.replace(':', '-')}.html`;
  await page.goto(route);
  await expect(page.getByRole('heading', { name: 'Reading response not published' })).toBeVisible();
  await expect(page.locator('main')).toContainText(book.text.en.title);
  await expect(page.getByRole('link', { name: 'Return to the published book collection' })).toHaveAttribute('href', '/elsewhere.html#e02');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('#recordBody')).toHaveCount(0);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const draft of draftBooks) expect(sitemap).not.toContain(`/records/${draft.ref.replace(':', '-')}.html`);
  const manifest = await (await request.get('/data/elsewhere-books.json')).json();
  expect(manifest.map(record => record.ref)).toEqual(publishedBooks.sort((a,b) => a.data.order - b.data.order).map(book => book.ref));
});

test('published BOOK panels keep readable authored typography', async ({ page }) => {
  await page.goto('/records/elsewhere-book-001.html');
  const panel = page.locator('[data-book-lang-panel="zh"]');
  await expect(panel).toBeVisible();
  const style = await panel.locator('.book-reading-essay > p').first().evaluate(node => {
    const computed = getComputedStyle(node);
    return { fontSize: parseFloat(computed.fontSize), lineHeight: parseFloat(computed.lineHeight), textIndent: parseFloat(computed.textIndent) };
  });
  expect(style.fontSize).toBeGreaterThanOrEqual(18);
  expect(style.fontSize).toBeLessThanOrEqual(20);
  expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize * 1.85);
  expect(style.textIndent).toBeGreaterThanOrEqual(style.fontSize * 1.9);
});
