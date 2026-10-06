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

  const chinesePanel = body.locator('[data-book-lang-panel="zh"]');
  await expect(chinesePanel).toContainText('读《光荣与梦想》之前');
  await expect(chinesePanel).toContainText('繁盛从来不是一个所有人同时抵达的季节');
  await expect(chinesePanel).toContainText('昨日的结局也不会照着旧稿再写一次');

  const shiftSection = chinesePanel.locator('.book-record-section').nth(2);
  const labelBox = await shiftSection.locator('.book-record-section-label').boundingBox();
  const paragraphBoxes = await shiftSection.locator(':scope > p').evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top };
    }),
  );
  const leftEdges = paragraphBoxes.map((box) => box.left);
  const topEdges = paragraphBoxes.map((box) => box.top);
  expect(labelBox).not.toBeNull();

  const viewportWidth = page.viewportSize()?.width ?? 1280;
  if (viewportWidth <= 600) {
    const labelBottom = labelBox.y + labelBox.height;
    expect(Math.min(...topEdges)).toBeGreaterThanOrEqual(labelBottom);
    expect(Math.abs(Math.min(...leftEdges) - labelBox.x)).toBeLessThan(2);
  } else {
    const labelRight = labelBox.x + labelBox.width;
    expect(Math.min(...leftEdges)).toBeGreaterThan(labelRight + 10);
  }
  expect(Math.max(...leftEdges) - Math.min(...leftEdges)).toBeLessThan(2);
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
