import { test, expect } from '@playwright/test';

test('ORIENT preserves its no-score residual contract with pre-reveal confidence', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('geogeek.orient.primer.v1', JSON.stringify({ version: 'orient-primer-1', seen: true }));
  });
  await page.goto('/lab.html?instrument=locate', { waitUntil: 'domcontentloaded' });
  const shell = page.locator('.play-shell[data-play-kind="orient"]');
  await expect(shell).toBeVisible({ timeout: 20_000 });
  await expect(shell).toHaveAttribute('data-play-state', 'judge', { timeout: 5_000 });

  const map = shell.locator('.orient-map');
  await map.focus();
  await page.keyboard.press('ArrowRight');
  const commit = shell.getByRole('button', { name: 'COMMIT' });
  await expect(commit).toBeDisabled();
  await page.keyboard.press('2');
  await expect(commit).toBeEnabled();
  await page.keyboard.press('Enter');

  await expect(shell.locator('.play-readout')).toContainText('RESIDUAL');
  await expect(shell.locator('.play-readout')).toContainText('DISTANCE');
  await expect(shell.locator('.play-readout')).toContainText('BEARING');
  await expect(shell.locator('.play-readout')).toContainText('CONFIDENCE');
  await expect(shell).not.toContainText('SCORE');
});
