import { test, expect } from '@playwright/test';

const PRIMER_KEY = 'geogeek.orient.primer.v1';

async function markPrimerSeen(page) {
  await page.addInitScript(key => {
    localStorage.setItem(key, JSON.stringify({ version: 'orient-primer-1', seen: true }));
  }, PRIMER_KEY);
}

async function commitKeyboardTrial(page, shell, confidenceKey = '2') {
  const map = shell.locator('.orient-map');
  await map.focus();
  await page.keyboard.press('ArrowRight');
  await expect(shell.getByRole('button', { name: 'COMMIT' })).toBeDisabled();
  await page.keyboard.press(confidenceKey);
  await expect(shell.getByRole('button', { name: 'COMMIT' })).toBeEnabled();
  await page.keyboard.press('Enter');
  await expect(shell.locator('.play-readout')).toContainText('RESIDUAL');
  await expect(shell.locator('.play-readout')).toContainText('CONFIDENCE');
}

test('ORIENT first-run primer teaches vector input without writing evidence', async ({ page }) => {
  await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(key => {
    localStorage.removeItem(key);
    localStorage.removeItem('geogeek.play.trace.v1');
    localStorage.removeItem('geogeek.orient.active.v1');
  }, PRIMER_KEY);
  await page.goto('/lab.html?flowMode=release&instrument=locate&orientSeed=primer-contract#l07', { waitUntil: 'domcontentloaded' });
  const shell = page.locator('.play-shell[data-play-kind="orient"]');
  await expect(shell).toBeVisible({ timeout: 20_000 });
  await expect(shell.locator('.play-task')).toContainText('INPUT PRIMER');
  await expect(shell.locator('.play-field-note')).toContainText('PRACTICE INPUT');
  await expect(shell.getByRole('button', { name: 'START FIELD →' })).toBeDisabled();
  const primer = shell.locator('.orient-primer-map');
  await primer.focus();
  await page.keyboard.press('ArrowRight');
  await expect(shell.getByRole('button', { name: 'START FIELD →' })).toBeEnabled();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('geogeek.play.trace.v1') || '[]').filter(item => item.play === 'orient').length);
  expect(before).toBe(0);
  await shell.getByRole('button', { name: 'START FIELD →' }).click();
  await expect(shell.locator('.play-field-note')).toContainText('RELATION 1 / 5 · ORIENTATION');
  const primerSeen = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), PRIMER_KEY);
  expect(primerSeen.seen).toBe(true);
});

test('ORIENT uses four seeded base slots then composes a fifth adaptation/confirmation from committed residuals', async ({ page }) => {
  await markPrimerSeen(page);
  await page.goto('/lab.html?flowMode=release&instrument=locate&orientSeed=browser-contract#l07', { waitUntil: 'domcontentloaded' });
  const shell = page.locator('.play-shell[data-play-kind="orient"]');
  await expect(shell).toBeVisible({ timeout: 20_000 });
  await expect(shell).toHaveAttribute('data-orient-session-version', 'orient-session-2', { timeout: 10_000 });
  await expect(shell).toHaveAttribute('data-orient-fallback', 'false');
  await expect(shell).toHaveAttribute('data-orient-seed', 'browser-contract');

  const initialUrl = new URL(page.url());
  expect(initialUrl.searchParams.get('flowMode')).toBe('release');
  expect(initialUrl.searchParams.get('instrument')).toBe('locate');
  expect(initialUrl.searchParams.get('orientSeed')).toBe('browser-contract');
  expect(initialUrl.hash).toBe('#l07');

  await expect(shell.locator('.play-field-note')).toContainText('RELATION 1 / 5 · ORIENTATION');
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

  await commitKeyboardTrial(page, reloaded, '3');
  await reloaded.getByRole('button', { name: 'NEXT RELATION →' }).click();
  await expect(reloaded.locator('.play-field-note')).toContainText('RELATION 2 / 5 · BASELINE');
  const baselineReference = (await reloaded.locator('.play-condition-row').filter({ hasText: 'REFERENCE' }).innerText()).replace('REFERENCE', '').trim();
  await expect(reloaded.locator('.play-condition-row').filter({ hasText: 'COAST' })).toContainText('ON');
  await expect(reloaded.locator('.play-condition-row').filter({ hasText: 'DISTANCE RINGS' })).toContainText('OFF');

  await commitKeyboardTrial(page, reloaded, '2');
  await reloaded.getByRole('button', { name: 'NEXT RELATION →' }).click();
  await expect(reloaded.locator('.play-field-note')).toContainText('RELATION 3 / 5 · CONTRAST');
  const contrastReference = (await reloaded.locator('.play-condition-row').filter({ hasText: 'REFERENCE' }).innerText()).replace('REFERENCE', '').trim();
  expect(contrastReference).toBe(baselineReference);
  await expect(reloaded.locator('.play-condition-row').filter({ hasText: 'COAST' })).toContainText('OFF');

  await commitKeyboardTrial(page, reloaded, '1');
  await reloaded.getByRole('button', { name: 'NEXT RELATION →' }).click();
  await expect(reloaded.locator('.play-field-note')).toContainText('RELATION 4 / 5 · CHALLENGE');
  await commitKeyboardTrial(page, reloaded, '3');

  await expect(reloaded.locator('.play-readout')).toContainText('SESSION OBSERVATION');
  await expect(reloaded.getByRole('button', { name: 'TRY ONE MORE →' })).toBeVisible();
  const activeAfterFour = await page.evaluate(() => JSON.parse(localStorage.getItem('geogeek.orient.active.v1') || 'null'));
  expect(activeAfterFour.currentSlot).toBe(5);
  expect(activeAfterFour.plan.trials).toHaveLength(5);
  expect(['adaptation', 'confirmation']).toContain(activeAfterFour.plan.trials[4].role);
  expect(['distance', 'bearing']).toContain(activeAfterFour.plan.trials[4].adaptation.axis);
  expect(new Set(activeAfterFour.plan.trials.map(trial => trial.relationId)).size).toBe(5);

  await reloaded.getByRole('button', { name: 'TRY ONE MORE →' }).click();
  await expect(reloaded.locator('.play-field-note')).toContainText('RELATION 5 / 5');
  await expect(reloaded.locator('.play-condition-row').filter({ hasText: 'FOCUS' })).toBeVisible();
});

test('NOT FAMILIAR replaces the current relation without writing a cognitive record', async ({ page }) => {
  await markPrimerSeen(page);
  await page.goto('/lab.html?flowMode=release&instrument=locate&orientSeed=unfamiliar-contract#l07', { waitUntil: 'domcontentloaded' });
  const shell = page.locator('.play-shell[data-play-kind="orient"]');
  await expect(shell).toBeVisible({ timeout: 20_000 });
  const beforePair = await shell.locator('.play-pair strong').allTextContents();
  const beforeTrace = await page.evaluate(() => JSON.parse(localStorage.getItem('geogeek.play.trace.v1') || '[]').filter(item => item.play === 'orient').length);
  await shell.getByRole('button', { name: 'NOT FAMILIAR' }).click();
  await expect(shell.locator('.play-field-note')).toContainText('RELATION 1 / 5 · ORIENTATION');
  const afterPair = await shell.locator('.play-pair strong').allTextContents();
  expect(afterPair.join('→')).not.toBe(beforePair.join('→'));
  const after = await page.evaluate(() => ({
    trace: JSON.parse(localStorage.getItem('geogeek.play.trace.v1') || '[]').filter(item => item.play === 'orient').length,
    active: JSON.parse(localStorage.getItem('geogeek.orient.active.v1') || 'null')
  }));
  expect(after.trace).toBe(beforeTrace);
  expect(after.active.committedRecordIds).toEqual([]);
  expect(after.active.skippedRelationIds).toHaveLength(1);
});

test('ORIENT persists Trace v2 confidence and resumes the next uncommitted slot', async ({ page }) => {
  await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(key => {
    localStorage.removeItem('geogeek.play.trace.v1');
    localStorage.removeItem('geogeek.orient.active.v1');
    localStorage.removeItem('geogeek.play.orient.history.v1');
    localStorage.setItem(key, JSON.stringify({ version: 'orient-primer-1', seen: true }));
  }, PRIMER_KEY);
  await page.goto('/lab.html?flowMode=release&instrument=locate&orientSeed=storage-browser-contract#l07', { waitUntil: 'domcontentloaded' });

  const shell = page.locator('.play-shell[data-play-kind="orient"]');
  await expect(shell).toBeVisible({ timeout: 20_000 });
  await expect(shell.locator('.play-field-note')).toContainText('RELATION 1 / 5 · ORIENTATION');
  const sessionId = await shell.getAttribute('data-orient-session-id');
  expect(sessionId).toBeTruthy();

  await commitKeyboardTrial(page, shell, '3');
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
  expect(persisted.record.judgment.confidence).toBe('high');
  expect(persisted.record.judgment.interaction.primary).toBe('keyboard');
  expect(Number.isFinite(persisted.record.residual.distanceLogError)).toBe(true);
  expect(persisted.active.plan.targetSize).toBe(5);
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

  await expect(resumed.locator('.play-field-note')).toContainText('RELATION 2 / 5 · BASELINE');
  await expect(resumed.locator('.orient-judgment-point')).toHaveAttribute('opacity', '0');
  await expect(resumed.getByRole('button', { name: 'COMMIT' })).toBeDisabled();
  const activeAfterResume = await page.evaluate(() => JSON.parse(localStorage.getItem('geogeek.orient.active.v1') || 'null'));
  expect(activeAfterResume.sessionId).toBe(sessionId);
  expect(activeAfterResume.currentSlot).toBe(2);
});
