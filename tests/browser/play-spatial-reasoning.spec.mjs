import { test, expect } from '@playwright/test';

async function openPlay(page, instrument, kind) {
  if (instrument === 'locate') {
    await page.addInitScript(() => {
      localStorage.setItem('geogeek.orient.primer.v1', JSON.stringify({ version: 'orient-primer-1', seen: true }));
    });
  }
  await page.goto(`/lab.html?instrument=${instrument}`, { waitUntil:'domcontentloaded' });
  const shell = page.locator(`.play-shell[data-play-kind="${kind}"], .play-v2-shell[data-play-kind="${kind}"]`);
  await expect(shell).toBeVisible({ timeout:20_000 });
  await expect(page.locator('#instrumentDialog')).toHaveAttribute('open', '');
  await expect(shell).toHaveAttribute('data-play-state', kind === 'connect' ? 'planning' : 'judge', { timeout:5_000 });
  return shell;
}

test('ORIENT commits a keyboard spatial judgment with confidence and reveals separate residuals', async ({ page }) => {
  const shell = await openPlay(page, 'locate', 'orient');
  const map = shell.locator('.orient-map');
  await map.focus();
  await page.keyboard.press('ArrowRight');
  await expect(shell.getByRole('button', { name:'COMMIT' })).toBeDisabled();
  await page.keyboard.press('2');
  await expect(shell.getByRole('button', { name:'COMMIT' })).toBeEnabled();
  await page.keyboard.press('Enter');
  await expect(shell.locator('.play-readout')).toContainText('RESIDUAL');
  await expect(shell.locator('.play-readout')).toContainText('DISTANCE');
  await expect(shell.locator('.play-readout')).toContainText('BEARING');
  await expect(shell.locator('.play-readout')).toContainText('CONFIDENCE');
  await expect(shell).not.toContainText('SCORE');
});

test('BOUND holds threshold constant while one observation condition changes', async ({ page }) => {
  const shell = await openPlay(page, 'zone', 'bound');
  await shell.getByRole('button', { name:'COMMIT' }).click();
  await expect(shell.locator('.play-readout')).toContainText('CONDITION MET');
  const threshold = await shell.locator('.bound-slider').inputValue();
  await shell.getByRole('button', { name:'CHANGE ONE CONDITION →' }).click();
  await expect(shell.locator('.play-readout')).toContainText('EFFECT');
  await expect(shell.locator('.play-conditions')).toContainText('UNCHANGED');
  await expect(shell.locator('.play-conditions')).toContainText(Number(threshold).toFixed(3));
});

test('CONNECT builds a route, changes the rule, and requires adaptation', async ({ page }) => {
  const shell = await openPlay(page, 'path', 'connect');
  await expect(shell.locator('.connect-v2-stat').last()).toContainText('LAND BORDERS');

  for (const name of ['Spain', 'France', 'Germany', 'Poland']) {
    const node = shell.getByRole('button', { name });
    await node.focus();
    await page.keyboard.press('Enter');
  }

  const lock = shell.getByRole('button', { name:'LOCK ROUTE' });
  await expect(lock).toBeEnabled();
  await lock.click();
  await expect(shell.locator('.connect-v2-overlay-panel')).toContainText('4 HOPS');

  await shell.getByRole('button', { name:'CHANGE THE RULE' }).click();
  await expect(shell).toHaveAttribute('data-play-state', 'transforming');
  await expect(shell.locator('.connect-v2-stat').last()).toContainText('DISTANCE ≤ 1200 KM');
  await expect(shell).toHaveAttribute('data-play-state', 'adapting', { timeout:3_000 });

  for (const name of ['France', 'Germany', 'Poland']) {
    const node = shell.getByRole('button', { name });
    await node.focus();
    await page.keyboard.press('Enter');
  }

  await shell.getByRole('button', { name:'LOCK ROUTE' }).click();
  await expect(shell).toHaveAttribute('data-play-state', 'result');
  await expect(shell.locator('.connect-v2-overlay-panel')).toContainText('3 HOPS');
  await expect(shell.locator('.connect-v2-overlay-panel')).toContainText('OPTIMAL');
  await expect(shell.locator('.connect-v2-overlay-panel')).toContainText("THE PLACES DIDN'T MOVE");
  await expect(shell.locator('.connect-v2-overlay-panel')).toContainText('THE RELATION DID');
});

test('PROJECT traverses area, keyboard route, and viewpoint representation changes', async ({ page }) => {
  const shell = await openPlay(page, 'project', 'project');

  await shell.getByRole('button', { name:'INDIA' }).click();
  await expect(shell.locator('.play-readout')).toContainText('SURFACE AREA');
  await expect(shell.locator('.play-conditions')).toContainText('MERCATOR → EQUAL EARTH');
  await shell.getByRole('button', { name:'NEXT REPRESENTATION →' }).click();

  const routeHit = shell.locator('.project-hit');
  await expect(routeHit).toHaveAttribute('tabindex', '0');
  await routeHit.focus();
  await page.keyboard.press('ArrowUp');
  const routeCommit = shell.getByRole('button', { name:'COMMIT ROUTE' });
  await expect(routeCommit).toBeEnabled();
  await page.keyboard.press('Enter');
  await expect(shell.locator('.play-readout')).toContainText('GEODESIC');
  await shell.getByRole('button', { name:'CHANGE REPRESENTATION →' }).click();
  await expect(shell.locator('.play-readout')).toContainText('THE ROUTE DID NOT CHANGE');
  await shell.getByRole('button', { name:'NEXT REPRESENTATION →' }).click();

  await shell.getByRole('button', { name:'COMMIT VIEW' }).click();
  await expect(shell.locator('.play-readout')).toContainText('VISIBLE HEMISPHERE');
  await shell.getByRole('button', { name:'CHANGE ONE CONDITION →' }).click();
  await expect(shell.locator('.play-readout')).toContainText('THE WORLD STAYED');
  await shell.getByRole('button', { name:'VIEW TRACE →' }).click();
  await expect(shell.locator('.play-trace-title')).toContainText('PROJECT');
  await expect(shell.locator('.play-conditions')).toContainText('SCORE');
  await expect(shell.locator('.play-conditions')).toContainText('NONE');
});