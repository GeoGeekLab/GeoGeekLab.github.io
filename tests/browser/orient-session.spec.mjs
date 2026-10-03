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

test('ORIENT persists immutable Trace v2 evidence and resumes the next uncommitted slot', async ({ page }) => {
  await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.removeItem('geogeek.play.trace.v1');
    localStorage.removeItem('geogeek.orient.active.v1');
    localStorage.removeItem('geogeek.play.orient.history.v1');
  });
  await page.goto('/lab.html?flowMode=release&instrument=locate&orientSeed=storage-browser-contract#l07', { waitUntil: 'domcontentloaded' });

  const shell = page.locator('.play-shell[data-play-kind="orient"]');
  await expect(shell).toBeVisible({ timeout: 20_000 });
  await expect(shell.locator('.play-field-note')).toContainText('RELATION 1 / 4 · ORIENTATION');
  const sessionId = await shell.getAttribute('data-orient-session-id');
  expect(sessionId).toBeTruthy();

  await commitKeyboardTrial(page, shell);
  const persisted = await page.evaluate(() => {
    const trace = JSON.parse(localStorage.getItem('geogeek.play.trace.v1') || '[]');
    const active = JSON.parse(localStorage.getItem('geogeek.orient.active.v1') || 'null');
    const record = trace.filter(item => item.play === 'orient').at(-1);
    return { record, active };
  });

  expect(persisted.record.version).toBe(2);
  expect(persisted.record.sessionId).toBe(sessionId);
  expect(persisted.record.recordId).toBe(`${sessionId}:t1`);
  expect(persisted.record.trial.slot).toBe(1);
  expect(persisted.record.trial.role).toBe('orientation');
  expect(persisted.record.judgment.confidence).toBeNull();
  expect(persisted.record.judgment.interaction.primary).toBe('keyboard');
  expect(Number.isFinite(persisted.record.residual.distanceLogError)).toBe(true);
  expect(persisted.record.conditions.projection).toBe('azimuthal-equidistant');
  expect(persisted.active.sessionId).toBe(sessionId);
  expect(persisted.active.currentSlot).toBe(2);
  expect(persisted.active.committedRecordIds).toEqual([`${sessionId}:t1`]);

  await page.reload({ waitUntil: 'domcontentloaded' });
  const resumed = page.locator('.play-shell[data-play-kind="orient"]');
  await expect(resumed).toHaveAttribute('data-orient-session-id', sessionId, { timeout: 20_000 });
  await expect(resumed).toHaveAttribute('data-orient-resumed', 'true');
  await expect(resumed.locator('.play-trace-title')).toHaveText('INCOMPLETE FIELD');
  await expect(resumed.getByRole('button', { name: 'CONTINUE FIELD →' })).toBeVisible();
  await resumed.getByRole('button', { name: 'CONTINUE FIELD →' }).click();

  await expect(resumed.locator('.play-field-note')).toContainText('RELATION 2 / 4 · BASELINE');
  await expect(resumed.locator('.orient-judgment-point')).toHaveAttribute('opacity', '0');
  await expect(resumed.getByRole('button', { name: 'COMMIT' })).toBeDisabled();
  const activeAfterResume = await page.evaluate(() => JSON.parse(localStorage.getItem('geogeek.orient.active.v1') || 'null'));
  expect(activeAfterResume.sessionId).toBe(sessionId);
  expect(activeAfterResume.currentSlot).toBe(2);
});
