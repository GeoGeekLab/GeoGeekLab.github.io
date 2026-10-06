import { test, expect } from '@playwright/test';

test('Elsewhere exposes LISTENING as the Sound as landscape collection', async ({ page }) => {
  await page.goto('/elsewhere.html#e03');

  const listening = page.locator('#e03[data-collection-entry="true"]');
  await expect(listening).toBeVisible();
  await expect(listening.locator('.eyebrow')).toHaveText('LISTENING');
  await expect(listening.locator('h2')).toHaveText('Sound as landscape');
  await expect(listening.locator('.elsewhere-entry-lede')).toHaveText('What has no coordinate can still give direction.');

  const index = listening.locator('.listening-unit');
  await expect(index).toHaveAttribute('data-listening-count', '1');
  await expect(index.locator('.listening-unit-head')).toContainText('LISTENING INDEX');
  await expect(index.locator('.listening-unit-head')).toContainText('01 RECORD');

  const rows = index.locator('.listening-unit-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('BV1wC4y1Q7aT');
  await expect(rows.first()).toContainText('Bilibili');
  await expect(rows.first()).toContainText('SOURCE TITLE PENDING');
  await expect(rows.first()).toHaveAttribute('href', 'records/elsewhere-listening-001.html');
  await expect(index.locator('.listening-unit-empty')).toHaveCount(0);
});

test('LISTENING 001 embeds the supplied Bilibili source without inventing a translated title', async ({ page }) => {
  await page.goto('/records/elsewhere-listening-001.html');

  await expect(page.locator('body')).toHaveAttribute('data-record-ref', 'elsewhere:listening-001');
  await expect(page.locator('#recordKicker')).toHaveText('LISTENING / RECORD');
  await expect(page.locator('#recordTitle')).toHaveText('BV1wC4y1Q7aT');
  await expect(page.locator('#recordTitle')).toHaveClass(/is-source-identifier/);
  await expect(page.locator('#recordExcerpt')).toHaveText('Source title pending verification.');
  await expect(page.locator('#recordMeta')).toContainText('SOURCE TITLE PENDING');
  await expect(page.locator('#recordMeta')).toContainText('Bilibili');
  await expect(page.locator('#recordMeta')).toContainText('BV1wC4y1Q7aT');
  await expect(page.locator('#recordDetailLabel')).toHaveText('SOURCE');

  const iframe = page.locator('.listening-record-embed iframe');
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toHaveAttribute('src', 'https://player.bilibili.com/player.html?isOutside=true&aid=792267262&bvid=BV1wC4y1Q7aT&cid=1367471689&p=1');
  await expect(page.locator('#recordBody')).not.toContainText('Untitled');
});
