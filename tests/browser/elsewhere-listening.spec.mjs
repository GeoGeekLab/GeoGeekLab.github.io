import { test, expect } from '@playwright/test';

test('Elsewhere exposes LISTENING as the Sound as landscape collection', async ({ page }) => {
  await page.goto('/elsewhere.html#e03');

  const listening = page.locator('#e03[data-collection-entry="true"]');
  await expect(listening).toBeVisible();
  await expect(listening.locator('.eyebrow')).toHaveText('LISTENING');
  await expect(listening.locator('h2')).toHaveText('Sound as landscape');
  await expect(listening.locator('.elsewhere-entry-lede')).toHaveText('What has no coordinate can still give direction.');

  const index = listening.locator('.listening-unit');
  await expect(index).toHaveAttribute('data-listening-count', '0');
  await expect(index.locator('.listening-unit-head')).toContainText('LISTENING INDEX');
  await expect(index.locator('.listening-unit-head')).toContainText('00 RECORDS');
  await expect(index.locator('.listening-unit-empty')).toHaveText('No listening records yet.');
  await expect(index.locator('.listening-unit-row')).toHaveCount(0);
});
