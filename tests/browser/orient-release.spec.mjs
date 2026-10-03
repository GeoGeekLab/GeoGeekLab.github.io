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
  await expect(shell).toHaveCount(1);
  await expect(shell).toHaveAttribute('data-play-state', 'judge', { timeout: 10_000 });
  return shell;
}

async function commitKeyboardTrial(page, shell, confidenceKey = '2') {
  const map = shell.locator('svg.orient-map:not(.orient-primer-map)');
  await map.focus();
  await page.keyboard.press('ArrowRight');
  const commit = shell.getByRole('button', { name: 'COMMIT' });
  await expect(commit).toBeDisabled();
  await page.keyboard.press(confidenceKey);
  await expect(commit).toBeEnabled();
  await page.keyboard.press('Enter');
  await expect(shell.locator('.play-readout')).toContainText('RESIDUAL');
  await expect(shell.locator('.orient-truth')).toBeVisible();
  await expect(shell.locator('.orient-feedback-layer')).toBeVisible();
}

test('ORIENT release contract preserves judgment-before-truth and accessible reveal', async ({ page }) => {
  await markPrimerSeen(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const shell = await openOrient(page, 'release-cross-browser-contract');

  const map = shell.locator('svg.orient-map:not(.orient-primer-map)');
  await expect(map).toHaveAttribute('role', 'group');
  await expect(map).toHaveAttribute('aria-describedby', 'orientInputHelp');
  await expect(shell.locator('.play-readout')).toHaveAttribute('role', 'status');
  await expect(shell.locator('.orient-truth')).toHaveCount(0);
  await expect(shell.locator('.orient-target')).toHaveCount(0);
  await expect(shell.locator('.orient-feedback-layer')).toHaveCount(0);

  await commitKeyboardTrial(page, shell, '3');

  await expect(shell.locator('.orient-target')).toBeVisible();
  await expect(shell.locator('.orient-angle')).toHaveCount(1);
  await expect(shell.locator('.orient-distance-residual')).toHaveCount(1);
  await expect(shell.locator('.play-readout')).toContainText('DISTANCE');
  await expect(shell.locator('.play-readout')).toContainText('BEARING');
  await expect(shell.locator('.play-readout')).toContainText('CONFIDENCE');
  await expect(shell.getByRole('button', { name: 'NEXT RELATION →' })).toBeVisible();
  await expect(shell).not.toContainText('TOTAL SCORE');
});

test('ORIENT release contract completes five keyboard trials into evidence-first trace', async ({ page }) => {
  await markPrimerSeen(page);
  const shell = await openOrient(page, 'release-full-session-contract');

  await commitKeyboardTrial(page, shell, '3');
  await shell.getByRole('button', { name: 'NEXT RELATION →' }).click();
  await commitKeyboardTrial(page, shell, '2');
  await shell.getByRole('button', { name: 'NEXT RELATION →' }).click();
  await commitKeyboardTrial(page, shell, '1');
  await shell.getByRole('button', { name: 'NEXT RELATION →' }).click();
  await commitKeyboardTrial(page, shell, '3');
  await expect(shell.getByRole('button', { name: 'TRY ONE MORE →' })).toBeVisible();
  await shell.getByRole('button', { name: 'TRY ONE MORE →' }).click();
  await commitKeyboardTrial(page, shell, '2');
  await expect(shell.getByRole('button', { name: 'VIEW TRACE →' })).toBeVisible();
  await shell.getByRole('button', { name: 'VIEW TRACE →' }).click();

  await expect(shell).toHaveAttribute('data-play-state', 'trace');
  await expect(shell.locator('.orient-trace-card')).toHaveCount(5);
  await expect(shell.locator('.orient-trace-map-point')).toHaveCount(5);
  await expect(shell.locator('.orient-trace-hero')).toContainText('Not a score');
  await expect(shell.locator('.play-readout')).toContainText('SESSION OBSERVATION');
  await expect(shell.locator('.play-readout')).toContainText('FINAL PROBE');
  await expect(shell.getByRole('button', { name: 'ANOTHER FIELD' })).toBeVisible();
  await expect(shell.getByRole('button', { name: 'RETURN TO LAB' })).toBeVisible();
});
