import { test, expect } from '@playwright/test';

async function commitKeyboardTrial(page, shell) {
  const map = shell.locator('.orient-map');
  await map.focus();
  await page.keyboard.press('ArrowRight');
  await expect(shell.getByRole('button', { name: 'COMMIT' })).toBeEnabled();
  await page.keyboard.press('Enter');
  await expect(shell.locator('.play-readout')).toContainText('RESIDUAL');
}

test('ORIENT uses a reproducible four-slot seeded session with a matched cue contrast', async ({ page }) => {
  await page.goto('/lab.html?flowMode=release&instrument=locate&orientSeed=browser-contract#l07', { waitUntil: 'domcontentloaded' });
  const shell = page.locator('.play-shell[data-play-kind="orient"]');
  await expect(shell).toBeVisible({ timeout: 20_000 });
  await expect(shell).toHaveAttribute('data-orient-session-version', 'orient-session-1', { timeout: 10_000 });
  await expect(shell).toHaveAttribute('data-orient-fallback', 'false');
  await expect(shell).toHaveAttribute('data-orient-seed', 'browser-contract');

  const initialUrl = new URL(page.url());
  expect(initialUrl.searchParams.get('flowMode')).toBe('release');
  expect(initialUrl.searchParams.get('instrument')).toBe('locate');
  expect(initialUrl.searchParams.get('orientSeed')).toBe('browser-contract');
  expect(initialUrl.hash).toBe('#l07');

  await expect(shell.locator('.play-field-note')).toContainText('RELATION 1 / 4 · ORIENTATION');
  await expect(shell.locator('.play-conditions')).toContainText('ROLE');
  await expect(shell.locator('.play-conditions')).toContainText('ORIENTATION');
  await expect(shell.locator('.play-conditions')).toContainText('DISTANCE RINGS');
  await expect(shell.locator('.play-conditions')).toContainText('ON');
  await expect(shell.locator('.orient-target')).toHaveCount(0);

  const firstFrom = (await shell.locator('.play-pair').nth(0).locator('strong').textContent())?.trim();
  const firstTo = (await shell.locator('.play-pair').nth(1).locator('strong').textContent())?.trim();
  expect(firstFrom).toBeTruthy();
  expect(firstTo).toBeTruthy();

  await page.reload({ waitUntil: 'domcontentloaded' });
  const reloaded = page.locator('.play-shell[data-play-kind="orient"]');
  await expect(reloaded).toHaveAttribute('data-orient-seed', 'browser-contract', { timeout: 20_000 });
  await expect(reloaded.locator('.play-pair').nth(0).locator('strong')).toHaveText(firstFrom);
  await expect(reloaded.locator('.play-pair').nth(1).locator('strong')).toHaveText(firstTo);
  expect(new URL(page.url()).searchParams.get('instrument')).toBe('locate');

  await commitKeyboardTrial(page, reloaded);
  await reloaded.getByRole('button', { name: 'NEXT RELATION →' }).click();
  await expect(reloaded.locator('.play-field-note')).toContainText('RELATION 2 / 4 · BASELINE');
  const baselineReference = (await reloaded.locator('.play-condition-row').filter({ hasText: 'REFERENCE' }).innerText()).replace('REFERENCE', '').trim();
  await expect(reloaded.locator('.play-condition-row').filter({ hasText: 'COAST' })).toContainText('ON');
  await expect(reloaded.locator('.play-condition-row').filter({ hasText: 'DISTANCE RINGS' })).toContainText('OFF');

  await commitKeyboardTrial(page, reloaded);
  await reloaded.getByRole('button', { name: 'NEXT RELATION →' }).click();
  await expect(reloaded.locator('.play-field-note')).toContainText('RELATION 3 / 4 · CONTRAST');
  const contrastReference = (await reloaded.locator('.play-condition-row').filter({ hasText: 'REFERENCE' }).innerText()).replace('REFERENCE', '').trim();
  expect(contrastReference).toBe(baselineReference);
  await expect(reloaded.locator('.play-condition-row').filter({ hasText: 'COAST' })).toContainText('OFF');
  await expect(reloaded.locator('.play-condition-row').filter({ hasText: 'DISTANCE RINGS' })).toContainText('OFF');
});
