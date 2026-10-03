import { test, expect } from '@playwright/test';

const PRIMER_KEY = 'geogeek.orient.primer.v1';

async function markPrimerSeen(page) {
  await page.addInitScript(key => {
    localStorage.setItem(key, JSON.stringify({ version: 'orient-primer-1', seen: true }));
    localStorage.removeItem('geogeek.play.trace.v1');
    localStorage.removeItem('geogeek.orient.active.v1');
  }, PRIMER_KEY);
}

async function commitKeyboardTrial(page, shell, confidenceKey = '2') {
  const map = shell.locator('.orient-map');
  await map.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press(confidenceKey);
  await expect(shell.getByRole('button', { name: 'COMMIT' })).toBeEnabled();
  await page.keyboard.press('Enter');
  await expect(shell.locator('.play-readout')).toContainText('RESIDUAL');
}

test('ORIENT Spatial Trace preserves five individual evidence records before session summaries', async ({ page }) => {
  await markPrimerSeen(page);
  await page.goto('/lab.html?flowMode=release&instrument=locate&orientSeed=trace-browser-contract#l07', { waitUntil: 'domcontentloaded' });
  const shell = page.locator('.play-shell[data-play-kind="orient"]');
  await expect(shell).toBeVisible({ timeout: 20_000 });

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
  await expect(shell).toHaveAttribute('data-orient-trace-view-version', 'orient-trace-view-1', { timeout: 5_000 });
  await expect(shell.locator('.orient-trace-card')).toHaveCount(5);
  await expect(shell.locator('.orient-trace-mini')).toHaveCount(5);
  await expect(shell.locator('.orient-trace-map-point')).toHaveCount(5);
  await expect(shell.locator('.orient-residual-map')).toBeVisible();

  const readout = shell.locator('.play-readout');
  await expect(readout).toContainText('SESSION OBSERVATION');
  await expect(readout).toContainText('CONFIDENCE NOTE');
  await expect(readout).toContainText('CONTRAST');
  await expect(readout).toContainText('FINAL PROBE');
  await expect(readout).toContainText('NOT A CAUSAL EFFECT');
  await expect(readout).toContainText('NOT A LEARNING SCORE');
  await expect(shell).not.toContainText('SCORE');
  await expect(shell.getByRole('button', { name: 'ANOTHER FIELD' })).toBeVisible();
  await expect(shell.getByRole('button', { name: 'RETURN TO LAB' })).toBeVisible();
});
