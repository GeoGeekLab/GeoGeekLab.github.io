import { test, expect } from '@playwright/test';

const CASES = [
  ['locate', 'orient'],
  ['zone', 'bound'],
  ['path', 'connect'],
  ['project', 'project']
];

async function primeOrient(page) {
  await page.addInitScript(() => {
    localStorage.setItem('geogeek.orient.primer.v1', JSON.stringify({ version:'orient-primer-1', seen:true }));
  });
}

async function openDirect(page, instrument, kind) {
  if (instrument === 'locate') await primeOrient(page);
  await page.goto(`/lab.html?instrument=${instrument}`, { waitUntil:'domcontentloaded' });
  const shell = page.locator(`.play-shell[data-play-kind="${kind}"], .play-v2-shell[data-play-kind="${kind}"]`);
  await expect(shell).toBeVisible({ timeout:20_000 });
  return shell;
}

for (const [instrument, kind] of CASES) {
  test(`Lab card opens ${kind} through the real entry button`, async ({ page }) => {
    if (instrument === 'locate') await primeOrient(page);
    await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
    const trigger = page.locator(`[data-instrument="${instrument}"]`).first();
    await expect(trigger).toBeVisible({ timeout:10_000 });
    await trigger.click();
    await expect(page.locator('#instrumentDialog')).toHaveAttribute('open', '', { timeout:20_000 });
    await expect(page.locator(`.play-shell[data-play-kind="${kind}"], .play-v2-shell[data-play-kind="${kind}"]`)).toBeVisible({ timeout:20_000 });
  });
}

test('BOUND accepts an actual pointer-drawn region', async ({ page }) => {
  const shell = await openDirect(page, 'zone', 'bound');
  const hit = shell.locator('.bound-v2-hit');
  const box = await hit.boundingBox();
  expect(box).toBeTruthy();
  const pts = [
    [0.34,0.30],[0.62,0.30],[0.70,0.54],[0.58,0.72],[0.32,0.66],[0.26,0.44],[0.34,0.30]
  ];
  await page.mouse.move(box.x + box.width*pts[0][0], box.y + box.height*pts[0][1]);
  await page.mouse.down();
  for (const [x,y] of pts.slice(1)) {
    await page.mouse.move(box.x + box.width*x, box.y + box.height*y, { steps:4 });
  }
  await page.mouse.up();
  await expect(shell).toHaveAttribute('data-play-state', 'ready');
  await expect(shell.getByRole('button', { name:'COMMIT REGION' })).toBeEnabled();
});

test('CONNECT accepts real pointer clicks on route nodes', async ({ page }) => {
  const shell = await openDirect(page, 'path', 'connect');
  for (const name of ['Spain', 'France', 'Germany', 'Poland']) {
    await shell.getByRole('button', { name }).click();
  }
  await expect(shell).toHaveAttribute('data-play-state', 'routeReady');
  await expect(shell.getByRole('button', { name:'LOCK ROUTE' })).toBeEnabled();
});

test('PROJECT range responds to a real pointer click near its end', async ({ page }) => {
  const shell = await openDirect(page, 'project', 'project');
  await shell.getByRole('button', { name:'GREENLAND' }).click();
  const scrubber = shell.locator('.project-v2-scrubber');
  await expect(scrubber).toBeVisible();
  const box = await scrubber.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.click(box.x + box.width - 3, box.y + box.height/2);
  await expect(shell.getByRole('button', { name:'REVEAL AREA' })).toBeEnabled();
});

test('ORIENT accepts a real pointer judgment before confidence', async ({ page }) => {
  const shell = await openDirect(page, 'locate', 'orient');
  const map = shell.locator('.orient-map');
  const box = await map.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.click(box.x + box.width*0.62, box.y + box.height*0.48);
  await expect(shell.getByRole('button', { name:'COMMIT' })).toBeDisabled();
  const confidence = shell.locator('.orient-confidence-option').nth(1);
  await confidence.click();
  await expect(shell.getByRole('button', { name:'COMMIT' })).toBeEnabled();
});
