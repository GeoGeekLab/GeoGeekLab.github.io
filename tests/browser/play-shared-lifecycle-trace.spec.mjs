import { test, expect } from '@playwright/test';

const instruments = [
  ['locate', 'orient'],
  ['zone', 'bound'],
  ['path', 'connect'],
  ['project', 'project'],
  ['light', 'light'],
  ['swath', 'swath']
];
const shellFor = kind =>
  `.play-shell[data-play-kind="${kind}"], .play-v2-shell[data-play-kind="${kind}"]`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('geogeek.orient.primer.v1',
      JSON.stringify({ version: 'orient-primer-1', seen: true }));
  });
});

for (const [instrument, kind] of instruments) {
  test(`STEP 11: ${kind} closes, clears workspace identity and reopens cleanly`,
    async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop-chromium',
        'Shared PLAY desktop lifecycle contract');
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto(`/lab.html?instrument=${instrument}`, { waitUntil: 'domcontentloaded' });
      const dialog = page.locator('#instrumentDialog');
      const shell = page.locator(shellFor(kind));
      await expect(shell).toBeVisible({ timeout: 20_000 });
      await expect(dialog).toHaveAttribute('data-play-workspace', 'true');
      await page.keyboard.press('Escape');
      await expect(dialog).not.toHaveAttribute('open', '');
      await expect(dialog).not.toHaveAttribute('data-play-workspace', 'true');
      await expect(shell).toHaveCount(0);
      await page.locator(`[data-instrument="${instrument}"]`).first().click();
      await expect(shell).toBeVisible({ timeout: 20_000 });
      await expect(shell).toHaveCount(1);
      await expect(dialog).toHaveAttribute('data-play-workspace', 'true');
      await info.attach(`step11-${kind}-reopen-1366`, {
        body: await page.screenshot({ animations: 'disabled' }),
        contentType: 'image/png'
      });
      await dialog.locator('#instrumentClose').click();
      await expect(dialog).not.toHaveAttribute('open', '');
      await expect(shell).toHaveCount(0);
    });
}

test('STEP 11: Spatial Trace isolates play records, retains insertion order and persists', async ({ page }) => {
  await page.goto('/lab.html?instrument=zone', { waitUntil: 'domcontentloaded' });
  await expect(page.locator(shellFor('bound'))).toBeVisible({ timeout: 20_000 });
  const result = await page.evaluate(() => {
    const trace = window.GeoPlay?.trace;
    if (!trace) throw new Error('Shared Spatial Trace API is absent.');
    const previous = localStorage.getItem(trace.STORAGE_KEY);
    try {
      localStorage.removeItem(trace.STORAGE_KEY);
      const bound = trace.append({ play: 'bound', trialId: 'step11-bound', judgment: { choice: 'keep' } });
      const light = trace.append({ play: 'light', trialId: 'step11-light', judgment: { choice: 'remove' } });
      const project = trace.append({ play: 'project', trialId: 'step11-project', judgment: { choice: 'area' } });
      const before = trace.readAll();
      const boundOnly = trace.forPlay('bound');
      trace.clearPlay('bound');
      const after = trace.readAll();
      const fromStorage = JSON.parse(localStorage.getItem(trace.STORAGE_KEY) || '[]');
      return { bound, light, project, before, boundOnly, after, fromStorage };
    } finally {
      if (previous === null) localStorage.removeItem(trace.STORAGE_KEY);
      else localStorage.setItem(trace.STORAGE_KEY, previous);
    }
  });
  expect(result.before.map(row => row.play)).toEqual(['bound', 'light', 'project']);
  expect(result.boundOnly).toHaveLength(1);
  expect(result.boundOnly[0].trialId).toBe('step11-bound');
  expect(result.after.map(row => row.play)).toEqual(['light', 'project']);
  expect(result.fromStorage).toEqual(result.after);
  for (const record of result.before) {
    expect(record.version).toBe(1);
    expect(Number.isNaN(Date.parse(record.timestamp))).toBe(false);
    expect(record.judgment).toBeTruthy();
  }
});
