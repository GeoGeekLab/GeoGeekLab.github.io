import { test, expect } from '@playwright/test';

test('ORIENT reveals visual residuals only after committed confidence', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('geogeek.orient.primer.v1', JSON.stringify({ version: 'orient-primer-1', seen: true }));
  });
  await page.goto('/lab.html?flowMode=release&instrument=locate&orientSeed=feedback-contract#l07', { waitUntil: 'domcontentloaded' });
  const shell = page.locator('.play-shell[data-play-kind="orient"]');
  await expect(shell).toBeVisible({ timeout: 20_000 });
  await expect(shell).toHaveAttribute('data-play-state', 'judge', { timeout: 5_000 });

  await expect(shell.locator('.orient-truth')).toHaveCount(0);
  await expect(shell.locator('.orient-target')).toHaveCount(0);
  await expect(shell.locator('.orient-feedback-layer')).toHaveCount(0);

  const map = shell.locator('.orient-map');
  await map.focus();
  await page.keyboard.press('ArrowRight');
  const commit = shell.getByRole('button', { name: 'COMMIT' });
  await expect(commit).toBeDisabled();
  await page.keyboard.press('2');
  await expect(commit).toBeEnabled();
  await page.keyboard.press('Enter');

  await expect(shell.locator('.orient-truth')).toHaveCount(1);
  await expect(shell.locator('.orient-target')).toHaveCount(1);
  await expect(shell.locator('.orient-feedback-layer')).toHaveCount(1, { timeout: 5_000 });
  await expect(shell.locator('.orient-angle')).toHaveCount(1);
  await expect(shell.locator('.orient-distance-residual')).toHaveCount(1);
  await expect(shell).toHaveAttribute('data-orient-feedback-version', 'orient-feedback-1');

  const readout = shell.locator('.play-readout');
  await expect(readout).toContainText('RESIDUAL');
  await expect(readout).toContainText('DISTANCE');
  await expect(readout).toContainText('BEARING');
  await expect(readout).toContainText('CONFIDENCE');
  await expect(readout.locator('.orient-feedback-key')).toContainText('ANGLE');
  await expect(readout.locator('.orient-feedback-key')).toContainText('RADIAL');
  await expect(readout.locator('.play-metric').filter({ hasText: 'DISTANCE' }).locator('strong')).toContainText(/%|NEAR/);
  await expect(readout.locator('.play-metric').filter({ hasText: 'BEARING' }).locator('strong')).toContainText(/°|ALIGNED/);
  await expect(shell).not.toContainText('SCORE');
});
