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


test('STEP 11: real Light and Swath experiments write isolated, durable Spatial Trace evidence', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'Cross-instrument Trace contract uses the desktop PLAY workspace');
  await page.setViewportSize({ width: 1366, height: 768 });
  const readTrace = () => page.evaluate(() => {
    if (typeof window.GeoPlay?.trace?.readAll !== 'function') throw new Error('Spatial Trace is missing');
    return window.GeoPlay.trace.readAll();
  });

  await page.goto('/lab.html?instrument=light', { waitUntil: 'domcontentloaded' });
  const light = page.locator(shellFor('light'));
  await expect(light).toBeVisible({ timeout: 20_000 });
  expect(await readTrace()).toHaveLength(0);

  await light.getByRole('button', { name: 'BLACK' }).click();
  await light.getByRole('button', { name: 'COMMIT PREDICTION' }).click();
  expect(await readTrace()).toHaveLength(0); // A prediction alone must not write outcome evidence.
  await light.getByRole('button', { name: 'REMOVE SCATTERING' }).click();
  await expect.poll(async () => (await readTrace()).length).toBe(1);

  const lightRecord = (await readTrace())[0];
  expect(lightRecord.play).toBe('light');
  expect(lightRecord.judgment.prediction).toBeTruthy();
  expect(lightRecord.conditions.before.atmosphericScattering).toBe(true);
  expect(lightRecord.conditions.after.atmosphericScattering).toBe(false);
  expect(lightRecord.result.chartMode).toBe('sky');

  await page.keyboard.press('Escape');
  await expect(page.locator('#instrumentDialog')).not.toHaveAttribute('open', '');
  await page.locator('[data-instrument="swath"]').first().click();
  const swath = page.locator(shellFor('swath'));
  await expect(swath).toBeVisible({ timeout: 20_000 });
  expect(await readTrace()).toHaveLength(1);

  await swath.getByRole('button', { name: 'MORE GROUND · COARSER PIXELS' }).click();
  await swath.getByRole('button', { name: 'COMMIT PREDICTION' }).click();
  expect(await readTrace()).toHaveLength(1);
  await swath.getByRole('button', { name: 'WIDEN FOV' }).click();
  await expect.poll(async () => (await readTrace()).length).toBe(2);

  const records = await readTrace();
  expect(records.map(record => record.play)).toEqual(['light', 'swath']);
  expect(records[0]).toEqual(lightRecord);
  const swathRecord = records[1];
  expect(swathRecord.relation.variable).toBeTruthy();
  expect(swathRecord.conditions.after.fovDeg).toBeGreaterThan(swathRecord.conditions.before.fovDeg);
  expect(swathRecord.result.swathAfterKm).toBeGreaterThan(swathRecord.result.swathBeforeKm);
  for (const record of records) {
    expect(record.version).toBe(1);
    expect(record.trialId).toBeTruthy();
    expect(record.judgment).toBeTruthy();
    expect(record.conditions.before).toBeTruthy();
    expect(record.conditions.after).toBeTruthy();
    expect(Number.isNaN(Date.parse(record.timestamp))).toBe(false);
  }

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator(shellFor('swath'))).toBeVisible({ timeout: 20_000 });
  expect(await readTrace()).toEqual(records);
  await expect(page.locator('#instrumentDialog')).toHaveAttribute('data-play-workspace', 'true');
});

test('STEP 11: Spatial Trace recovers from malformed storage and caps retention at 120 records', async ({ page }) => {
  await page.goto('/lab.html?instrument=zone', { waitUntil: 'domcontentloaded' });
  await expect(page.locator(shellFor('bound'))).toBeVisible({ timeout: 20_000 });
  const result = await page.evaluate(() => {
    const trace = window.GeoPlay.trace;
    const original = localStorage.getItem(trace.STORAGE_KEY);
    try {
      localStorage.setItem(trace.STORAGE_KEY, '{invalid-json');
      const afterCorruption = trace.readAll();
      for (let index = 0; index < 123; index += 1) {
        trace.append({ play: index % 2 === 0 ? 'light' : 'bound', trialId: String(index) });
      }
      const all = trace.readAll();
      return {
        afterCorruption,
        length: all.length,
        oldest: all[0]?.trialId,
        newest: all.at(-1)?.trialId,
        lightCount: trace.forPlay('light').length,
        boundCount: trace.forPlay('bound').length
      };
    } finally {
      if (original === null) localStorage.removeItem(trace.STORAGE_KEY);
      else localStorage.setItem(trace.STORAGE_KEY, original);
    }
  });
  expect(result.afterCorruption).toEqual([]);
  expect(result.length).toBe(120);
  expect(result.oldest).toBe('3');
  expect(result.newest).toBe('122');
  expect(result.lightCount).toBe(60);
  expect(result.boundCount).toBe(60);
});
