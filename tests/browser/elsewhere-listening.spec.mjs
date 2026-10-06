import { test, expect } from '@playwright/test';

test('Elsewhere exposes LISTENING as a nineteen-record Sound as landscape collection using BOOK index geometry', async ({ page }) => {
  await page.goto('/elsewhere.html#e03');

  const listening = page.locator('#e03[data-collection-entry="true"]');
  await expect(listening).toBeVisible();
  await expect(listening.locator('.eyebrow')).toHaveText('LISTENING');
  await expect(listening.locator('h2')).toHaveText('Sound as landscape');
  await expect(listening.locator('.elsewhere-entry-lede')).toHaveText('What has no coordinate can still give direction.');

  const index = listening.locator('.listening-unit');
  await expect(index).toHaveAttribute('data-listening-count', '19');
  await expect(index.locator('.listening-unit-head')).toContainText('LISTENING INDEX');
  await expect(index.locator('.listening-unit-head')).toContainText('19 RECORDS');

  const rows = index.locator('.listening-unit-row');
  await expect(rows).toHaveCount(19);
  await expect(rows.nth(0)).toContainText('稻香');
  await expect(rows.nth(1)).toContainText('The Nights');
  await expect(rows.nth(2)).toContainText('We Will Rock You');
  await expect(rows.nth(3)).toContainText('海闊天空');
  await expect(rows.nth(4)).toContainText('南方姑娘');
  await expect(rows.nth(5)).toContainText('左手右手');
  await expect(rows.nth(6)).toContainText('猪猪侠');
  await expect(rows.nth(7)).toContainText('学猫叫');
  await expect(rows.nth(8)).toContainText('Canon in D');
  await expect(rows.nth(9)).toContainText('Poker Face');
  await expect(rows.nth(10)).toContainText('稍息立正站好 + おどるポンポコリン');
  await expect(rows.nth(11)).toContainText('倔強');
  await expect(rows.nth(12)).toContainText('Go West');
  await expect(rows.nth(13)).toContainText('Y_COEkYVwn4');
  await expect(rows.nth(13)).toContainText('SOURCE TITLE PENDING');
  await expect(rows.nth(14)).toContainText('Love Story');
  await expect(rows.nth(15)).toContainText('Tadow');
  await expect(rows.nth(16)).toContainText('España Cañí');
  await expect(rows.nth(17)).toContainText('Victory');
  await expect(rows.nth(18)).toContainText('4cqhC_paryE');
  await expect(rows.nth(18)).toContainText('SOURCE TITLE PENDING');

  await expect(rows.nth(0)).toHaveAttribute('href', 'records/elsewhere-listening-001.html');
  await expect(rows.nth(18)).toHaveAttribute('href', 'records/elsewhere-listening-019.html');
  await expect(index.locator('.listening-unit-empty')).toHaveCount(0);

  await expect(rows.first().locator(':scope > *')).toHaveCount(4);
  const listeningGrid = await index.locator('.listening-unit-list').evaluate((node) => getComputedStyle(node).gridTemplateColumns);
  const bookGrid = await page.locator('#e02 .book-unit-list').evaluate((node) => getComputedStyle(node).gridTemplateColumns);
  expect(listeningGrid).toBe(bookGrid);
});

test('LISTENING preserves original or first-release title language and supplied source embeds', async ({ page }) => {
  await page.goto('/records/elsewhere-listening-001.html');
  await expect(page.locator('#recordTitle')).toHaveText('稻香');
  await expect(page.locator('#recordTitle')).toHaveAttribute('lang', 'zh-Hant');
  await expect(page.locator('.listening-record-note')).toContainText('指挥老师为了给大家惊喜');

  await page.goto('/records/elsewhere-listening-004.html');
  await expect(page.locator('#recordTitle')).toHaveText('海闊天空');
  await expect(page.locator('#recordTitle')).toHaveAttribute('lang', 'zh-Hant');

  await page.goto('/records/elsewhere-listening-005.html');
  await expect(page.locator('#recordTitle')).toHaveText('南方姑娘');
  await expect(page.locator('.listening-record-embed iframe')).toHaveAttribute(
    'src',
    'https://www.youtube.com/embed/TfqJ4eL1Xio?si=dazhpJKc5SGH7I5C'
  );

  await page.goto('/records/elsewhere-listening-011.html');
  await expect(page.locator('#recordTitle')).toHaveText('稍息立正站好 + おどるポンポコリン');
  await expect(page.locator('#recordTitle')).toHaveAttribute('lang', 'mul');

  await page.goto('/records/elsewhere-listening-014.html');
  await expect(page.locator('#recordTitle')).toHaveText('Y_COEkYVwn4');
  await expect(page.locator('#recordMeta')).toContainText('SOURCE TITLE PENDING');

  await page.goto('/records/elsewhere-listening-015.html');
  await expect(page.locator('#recordTitle')).toHaveText('Love Story');
  await expect(page.locator('#recordExcerpt')).toContainText('Taylor Swift');

  await page.goto('/records/elsewhere-listening-016.html');
  await expect(page.locator('#recordTitle')).toHaveText('Tadow');
  await expect(page.locator('#recordExcerpt')).toContainText('FKJ');

  await page.goto('/records/elsewhere-listening-017.html');
  await expect(page.locator('#recordTitle')).toHaveText('España Cañí');
  await expect(page.locator('#recordTitle')).toHaveAttribute('lang', 'es');

  await page.goto('/records/elsewhere-listening-018.html');
  await expect(page.locator('#recordTitle')).toHaveText('Victory');
  await expect(page.locator('#recordExcerpt')).toContainText('Two Steps from Hell');

  await page.goto('/records/elsewhere-listening-019.html');
  await expect(page.locator('#recordTitle')).toHaveText('4cqhC_paryE');
  await expect(page.locator('#recordMeta')).toContainText('SOURCE TITLE PENDING');
});
