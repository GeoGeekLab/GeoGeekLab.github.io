import { test, expect } from '@playwright/test';

test('Elsewhere exposes LISTENING as a thirteen-record Sound as landscape collection', async ({ page }) => {
  await page.goto('/elsewhere.html#e03');

  const listening = page.locator('#e03[data-collection-entry="true"]');
  await expect(listening).toBeVisible();
  await expect(listening.locator('.eyebrow')).toHaveText('LISTENING');
  await expect(listening.locator('h2')).toHaveText('Sound as landscape');
  await expect(listening.locator('.elsewhere-entry-lede')).toHaveText('What has no coordinate can still give direction.');

  const index = listening.locator('.listening-unit');
  await expect(index).toHaveAttribute('data-listening-count', '13');
  await expect(index.locator('.listening-unit-head')).toContainText('LISTENING INDEX');
  await expect(index.locator('.listening-unit-head')).toContainText('13 RECORDS');

  const rows = index.locator('.listening-unit-row');
  await expect(rows).toHaveCount(13);
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

  await expect(rows.nth(0)).toHaveAttribute('href', 'records/elsewhere-listening-001.html');
  await expect(rows.nth(12)).toHaveAttribute('href', 'records/elsewhere-listening-013.html');
  await expect(index.locator('.listening-unit-empty')).toHaveCount(0);
});

test('LISTENING preserves original or first-release title language and supplied source embeds', async ({ page }) => {
  await page.goto('/records/elsewhere-listening-001.html');
  await expect(page.locator('#recordTitle')).toHaveText('稻香');
  await expect(page.locator('#recordTitle')).toHaveAttribute('lang', 'zh-Hant');
  await expect(page.locator('.listening-record-note')).toContainText('指挥老师为了给大家惊喜');
  await expect(page.locator('.listening-record-embed iframe')).toHaveAttribute(
    'src',
    'https://player.bilibili.com/player.html?isOutside=true&aid=792267262&bvid=BV1wC4y1Q7aT&cid=1367471689&p=1'
  );

  await page.goto('/records/elsewhere-listening-004.html');
  await expect(page.locator('#recordTitle')).toHaveText('海闊天空');
  await expect(page.locator('#recordTitle')).toHaveAttribute('lang', 'zh-Hant');

  await page.goto('/records/elsewhere-listening-008.html');
  await expect(page.locator('#recordTitle')).toHaveText('学猫叫');
  await expect(page.locator('#recordTitle')).toHaveAttribute('lang', 'zh-Hans');

  await page.goto('/records/elsewhere-listening-011.html');
  await expect(page.locator('#recordTitle')).toHaveText('稍息立正站好 + おどるポンポコリン');
  await expect(page.locator('#recordTitle')).toHaveAttribute('lang', 'mul');

  await page.goto('/records/elsewhere-listening-012.html');
  await expect(page.locator('#recordTitle')).toHaveText('倔強');
  await expect(page.locator('#recordTitle')).toHaveAttribute('lang', 'zh-Hant');

  await page.goto('/records/elsewhere-listening-010.html');
  await expect(page.locator('#recordTitle')).toHaveText('Poker Face');
  await expect(page.locator('.listening-record-embed iframe')).toHaveAttribute(
    'src',
    'https://www.youtube.com/embed/CpjYMtZMaPc?si=mNcb_lTkRkMCrorE'
  );
});
