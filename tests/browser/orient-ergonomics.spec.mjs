import { test, expect } from '@playwright/test';

const PRIMER_KEY = 'geogeek.orient.primer.v1';

async function markPrimerSeen(page) {
  await page.addInitScript(key => {
    localStorage.setItem(key, JSON.stringify({ version: 'orient-primer-1', seen: true }));
    localStorage.removeItem('geogeek.orient.active.v1');
    localStorage.removeItem('geogeek.play.trace.v1');
  }, PRIMER_KEY);
}

async function openOrient(page, seed) {
  await page.goto(`/lab.html?flowMode=release&instrument=locate&orientSeed=${seed}#l07`, { waitUntil: 'domcontentloaded' });
  const shell = page.locator('.play-shell[data-play-kind="orient"]');
  await expect(shell).toBeVisible({ timeout: 20_000 });
  await expect(shell).toHaveAttribute('data-orient-ergonomics-version', 'orient-ergonomics-1', { timeout: 10_000 });
  // The shell mounts before world/session assets finish loading. Tests that use
  // the active session must wait for the session contract, not only the shell.
  await expect(shell).toHaveAttribute('data-orient-session-id', /\S+/, { timeout: 20_000 });
  return shell;
}

test('ORIENT mobile fine controls reuse the same judgment path and invalidate stale confidence', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await markPrimerSeen(page);
  const shell = await openOrient(page, 'mobile-fine-contract');
  const map = shell.locator('svg.orient-map:not(.orient-primer-map)');

  await expect(map).toHaveAttribute('role', 'group');
  await expect(map).toHaveAttribute('aria-describedby', 'orientInputHelp');
  await expect(map).toHaveAttribute('aria-keyshortcuts', /ArrowLeft/);
  await expect(shell.locator('.play-readout')).toHaveAttribute('role', 'status');
  await expect(shell.locator('.play-field-note')).toHaveAttribute('aria-hidden', 'true');
  expect(await shell.locator('.play-field-note').getAttribute('aria-live')).toBeNull();

  const fine = shell.locator('.orient-fine-controls');
  await expect(fine).toBeVisible();
  const clockwise = fine.getByRole('button', { name: 'Adjust bearing 2 degrees clockwise' });
  const longer = fine.getByRole('button', { name: 'Increase estimated distance by 250 kilometres' });
  await expect(clockwise).toBeDisabled();

  await map.focus();
  await page.keyboard.press('ArrowRight');
  await expect(clockwise).toBeEnabled();
  const point = shell.locator('.orient-judgment-point');
  const before = { x: await point.getAttribute('cx'), y: await point.getAttribute('cy') };
  await clockwise.click();
  const after = { x: await point.getAttribute('cx'), y: await point.getAttribute('cy') };
  expect(`${after.x},${after.y}`).not.toBe(`${before.x},${before.y}`);

  await shell.getByRole('button', { name: 'MEDIUM' }).click();
  await expect(shell.getByRole('button', { name: 'COMMIT' })).toBeEnabled();
  await longer.click();
  await expect(shell.getByRole('button', { name: 'COMMIT' })).toBeDisabled();
  await expect(shell.locator('.play-field-note')).toContainText('SET CONFIDENCE');
});

test('ORIENT repeated open requests keep one mounted shell and preserve the active session', async ({ page }) => {
  await markPrimerSeen(page);
  const shell = await openOrient(page, 'single-mount-contract');
  const sessionId = await shell.getAttribute('data-orient-session-id');
  expect(sessionId).toBeTruthy();

  await page.evaluate(() => {
    const trigger = document.createElement('button');
    trigger.dataset.instrument = 'locate';
    trigger.textContent = 'synthetic locate trigger';
    document.body.appendChild(trigger);
    trigger.click();
    trigger.click();
    trigger.click();
  });

  await expect(page.locator('.play-shell[data-play-kind="orient"]')).toHaveCount(1);
  await expect(page.locator('.play-shell[data-play-kind="orient"]')).toHaveAttribute('data-orient-session-id', sessionId);
});

test('ORIENT reduced-motion mode preserves reveal and residual information', async ({ page }) => {
  await markPrimerSeen(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const shell = await openOrient(page, 'reduced-motion-contract');
  const map = shell.locator('svg.orient-map:not(.orient-primer-map)');
  await map.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('2');
  await page.keyboard.press('Enter');

  await expect(shell.locator('.orient-truth')).toBeVisible();
  await expect(shell.locator('.orient-target')).toBeVisible();
  await expect(shell.locator('.orient-feedback-layer')).toBeVisible({ timeout: 2_000 });
  await expect(shell.locator('.play-readout')).toContainText('DISTANCE');
  await expect(shell.locator('.play-readout')).toContainText('BEARING');
  await expect(shell.getByRole('button', { name: 'NEXT RELATION →' })).toBeVisible();
});

test('ORIENT field-load failure exposes retry and recovers with the same deep link', async ({ page }) => {
  await markPrimerSeen(page);
  let failedOnce = false;
  await page.route('**/countries-110m.json', async route => {
    if (!failedOnce) {
      failedOnce = true;
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.goto('/lab.html?flowMode=release&instrument=locate&orientSeed=recovery-contract#l07', { waitUntil: 'domcontentloaded' });
  let shell = page.locator('.play-shell[data-play-kind="orient"]');
  await expect(shell).toBeVisible({ timeout: 20_000 });
  await expect(shell.locator('.instrument-error')).toContainText('FIELD UNAVAILABLE');
  await expect(shell.getByRole('button', { name: 'RETRY FIELD' })).toBeVisible({ timeout: 5_000 });
  await expect(shell.getByRole('button', { name: 'RETURN TO LAB' })).toBeVisible();

  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    shell.getByRole('button', { name: 'RETRY FIELD' }).click()
  ]);
  shell = page.locator('.play-shell[data-play-kind="orient"]');
  await expect(shell.locator('.play-field-note')).toContainText('RELATION 1 / 5 · ORIENTATION', { timeout: 20_000 });
  expect(new URL(page.url()).searchParams.get('orientSeed')).toBe('recovery-contract');
});