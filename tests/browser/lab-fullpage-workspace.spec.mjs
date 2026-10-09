import { test, expect } from '@playwright/test';

const instruments = [
  ['orbit', '<div class="orbit-v2 orbit-layout"><section class="orbit-stage">FIELD</section><aside class="orbit-panel"><div class="orbit-card">CATALOG</div></aside></div>', '.orbit-panel'],
  ['earth', '<div class="earth-layout earth-observation-lab"><section class="earth-observation-canvas">RASTER</section><aside class="earth-observation-panel"><div class="eo-panel-card">LAYERS</div></aside></div>', '.earth-observation-panel'],
  ['flow', '<div class="flow-lab"><section class="flow-map-shell">FIELD</section><aside class="flow-rail"><div class="flow-card">REPRESENTATION</div></aside></div>', '.flow-rail'],
  ['pulse', '<div class="pulse-layout pulse-observation-lab"><section class="pulse-map-wrap">EVENT FIELD</section><aside class="pulse-panel"><div class="pulse-panel-section">TEMPORAL CONTROL</div></aside></div>', '.pulse-panel'],
  ['figure', '<div class="figure-layout figure-workbench"><section class="figure-stage">IMAGE / TRACE</section><aside class="figure-control"><div class="figure-card">SCALAR FIELD</div></aside></div>', '.figure-control'],
  ['world', '<div class="world-layout"><section class="world-map-wrap">PROJECTION</section><aside class="world-panel">PROJECTION CONTROLS</aside></div>', '.world-panel']
];

for (const [kind, fixture, railSelector] of instruments) {
  test(`${kind} uses the appropriate full-page workspace controls`, async ({ page }) => {
    await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
    await page.waitForFunction(() => Boolean(document.querySelector('link[data-lab-fullpage]')?.sheet));
    await page.waitForFunction(() => Boolean(document.querySelector('link[data-lab-close-control]')?.sheet));

    // Feed the same stage mutation used by the real Lab runtime. lab-page.js owns
    // instrument identity; the full-page layer observes that declared identity.
    await page.evaluate(fixture => {
      document.getElementById('instrumentStage').innerHTML = fixture;
    }, fixture);

    const dialog = page.locator('#instrumentDialog');
    await expect(dialog).toHaveAttribute('data-instrument-kind', kind);
    await expect(dialog).toHaveAttribute('data-lab-workspace', 'true');

    await page.evaluate(() => {
      const dialog = document.getElementById('instrumentDialog');
      dialog.showModal();
      document.body.classList.add('instrument-open');
    });

    if (kind === 'pulse') {
      await expect(dialog).toHaveAttribute('data-pulse-task', 'observe');
      await expect(page.locator('.pulse-task-tabs')).toBeVisible();
      await expect(page.locator('.instrument-workspace-modes')).toBeHidden();
      await expect(dialog).not.toHaveAttribute('data-workspace-mode', /.+/);
    } else {
      await expect(dialog).toHaveAttribute('data-workspace-mode', 'work');
      await expect(page.locator('.instrument-workspace-modes')).toBeVisible();
      await expect(page.locator('.pulse-task-tabs')).toBeHidden();
    }
    await expect(page.locator('.instrument-meta')).toBeHidden();

    const close = page.locator('#instrumentClose');
    await expect(close).toBeVisible();
    await expect(close).toHaveText('×');
    await expect(close).toHaveAttribute('data-lab-exit', 'true');
    await expect(close).toHaveAttribute('aria-label', 'Return to Lab Index');
    await expect(close).toHaveAttribute('title', 'Lab Index');
    await close.focus();
    await expect(close).toBeFocused();

    const viewport = page.viewportSize();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.width - viewport.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.height - viewport.height)).toBeLessThanOrEqual(2);

    const closeBox = await close.boundingBox();
    expect(closeBox).not.toBeNull();
    expect(closeBox.width).toBeGreaterThanOrEqual(43);
    expect(closeBox.width).toBeLessThanOrEqual(48);
    expect(Math.abs(closeBox.width - closeBox.height)).toBeLessThanOrEqual(1);
    expect(viewport.width - (closeBox.x + closeBox.width)).toBeLessThanOrEqual(40);
    expect(closeBox.y).toBeLessThanOrEqual(36);
    const closeRadius = await close.evaluate(node => parseFloat(getComputedStyle(node).borderTopLeftRadius));
    expect(closeRadius).toBeGreaterThanOrEqual(20);

    const rail = page.locator(railSelector);
    await expect(rail).toBeVisible();

    if (kind === 'pulse') {
      await page.locator('[data-pulse-task="analyze"]').click();
      await expect(dialog).toHaveAttribute('data-pulse-task','analyze');
      await expect(page.locator('.pulse-task-tabs button[data-pulse-task="analyze"]')).toHaveAttribute('aria-pressed','true');
      await expect(rail).toBeVisible();
      await page.locator('[data-pulse-task="observe"]').click();
      await expect(dialog).toHaveAttribute('data-pulse-task','observe');
      await expect(rail).toBeVisible();
    } else {
      await page.locator('[data-workspace-mode="focus"]').click();
      await expect(dialog).toHaveAttribute('data-workspace-mode', 'focus');
      await expect(page.locator('.instrument-meta')).toBeHidden();
      await expect(rail).toBeHidden();

      await page.locator('[data-workspace-mode="inspect"]').click();
      await expect(dialog).toHaveAttribute('data-workspace-mode', 'inspect');
      await expect(page.locator('.instrument-meta')).toBeHidden();
      await expect(rail).toBeVisible();
    }

    const titleSize = await page.locator('#instrumentTitle').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
    expect(titleSize).toBeGreaterThanOrEqual(30);
  });
}

// Water V6 owns its context rail inside an iframe. Unlike the host-side map
// instruments, the native FOCUS/WORK/INSPECT toolbar is intentionally hidden.
test('water V9 keeps the native full-page shell and internal context rail', async ({page}) => {
  await page.goto('/lab.html?instrument=water&waterVersion=v9#l13', {waitUntil:'domcontentloaded'});
  const dialog=page.locator('#instrumentDialog');
  await expect(dialog).toBeVisible({timeout:20000});
  await expect(dialog).toHaveAttribute('data-lab-workspace','true');
  await expect(page.locator('#instrumentClose')).toBeVisible();
  await expect(page.locator('#instrumentStage iframe.water-v9-frame')).toBeVisible({timeout:20000});
  await expect(page.locator('.instrument-workspace-modes')).toBeHidden();
  const app=page.frameLocator('#instrumentStage iframe.water-v9-frame');
  await app.locator('[data-tab="iop"]').click();
  await expect(app.locator('#controls')).toBeVisible();
  await app.locator('#panelBtn').click();
  await expect(app.locator('#controls')).not.toBeVisible();
  await app.locator('#panelBtn').click();
  await expect(app.locator('#controls')).toBeVisible();
});
