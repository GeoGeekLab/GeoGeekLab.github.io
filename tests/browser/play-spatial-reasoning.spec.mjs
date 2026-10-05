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
  const expectedState = kind === 'connect' ? 'planning' : kind === 'project' ? 'predicting' : 'judge';
  await expect(shell).toHaveAttribute('data-play-state', expectedState, { timeout:5_000 });
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

  const france = shell.getByRole('button', { name:'France' });
  await expect(shell).toHaveAttribute('data-play-state', 'routeReady');
  await expect(france).toHaveAttribute('tabindex', '0');
  await expect(france).toHaveAttribute('aria-disabled', 'false');

  const lock = shell.getByRole('button', { name:'LOCK ROUTE' });
  await expect(lock).toBeEnabled();
  await lock.click();
  await expect(shell.locator('.connect-v2-overlay-panel')).toContainText('4 HOPS');
  await expect(france).toHaveAttribute('tabindex', '-1');
  await expect(france).toHaveAttribute('aria-disabled', 'true');

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

test('PROJECT lets the player scrub continuously from Mercator to Equal Earth before revealing area', async ({ page }) => {
  const shell = await openPlay(page, 'project', 'project');
  const land = shell.locator('.project-v2-land');
  const initialPath = await land.getAttribute('d');

  await shell.getByRole('button', { name:'GREENLAND' }).click();
  await expect(shell).toHaveAttribute('data-play-state', 'transforming');

  const scrubber = shell.locator('.project-v2-scrubber');
  const reveal = shell.getByRole('button', { name:'REVEAL AREA' });
  await expect(scrubber).toBeVisible();
  await expect(reveal).toBeDisabled();

  await scrubber.fill('50');
  const middlePath = await land.getAttribute('d');
  expect(middlePath).not.toBe(initialPath);

  await scrubber.fill('100');
  const equalEarthPath = await land.getAttribute('d');
  expect(equalEarthPath).not.toBe(middlePath);
  await expect(reveal).toBeEnabled();
  await reveal.click();

  await expect(shell).toHaveAttribute('data-play-state', 'revealed');
  await expect(shell.locator('.project-v2-panel')).toContainText('INDIA');
  await expect(shell.locator('.project-v2-panel')).toContainText('IS LARGER');
  await expect(shell.locator('.project-v2-panel')).toContainText('THE MAP CHANGED.');
  await expect(shell.locator('.project-v2-panel')).toContainText("THE AREA DIDN'T.");

  const resultScrubber = shell.locator('.project-v2-scrubber');
  await resultScrubber.fill('0');
  const returnedPath = await land.getAttribute('d');
  expect(returnedPath).not.toBe(equalEarthPath);
});