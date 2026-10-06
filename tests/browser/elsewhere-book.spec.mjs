import { test, expect } from '@playwright/test';

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
  await expect(body).toContainText('Before reading The Glory and the Dream');
  await expect(body).toContainText('After a society passes through crisis after crisis');

  const english = body.locator('[data-book-lang-button="en"]');
  const chinese = body.locator('[data-book-lang-button="zh"]');
  await expect(english).toHaveAttribute('aria-pressed', 'true');
  await chinese.click();
  await expect(chinese).toHaveAttribute('aria-pressed', 'true');
  await expect(body.locator('[data-book-lang-panel="zh"]')).toContainText('读《光荣与梦想》之前');
});

test('Elsewhere exposes BOOK as an expandable collection index', async ({ page }) => {
  await page.goto('/elsewhere.html#e02');

  const bookCollection = page.locator('#e02[data-collection-entry="true"]');
  await expect(bookCollection).toBeVisible();
  await expect(bookCollection.locator('.book-unit-head')).toContainText('BOOK INDEX');

  const records = bookCollection.locator('.book-unit-row');
  await expect(records).toHaveCount(1);
  await expect(records.first()).toContainText('The Glory and the Dream');
  await expect(records.first()).toContainText('William Manchester');
  await expect(records.first()).toContainText('1974');
});
