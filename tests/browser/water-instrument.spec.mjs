import { test, expect } from '@playwright/test';

// V6 replaces the legacy monolithic Water DOM with a same-origin iframe.
// Test the public Lab entry and the real instrument, not the obsolete V3 selectors.
async function openWater(page) {
  await page.goto('/lab.html?instrument=water#l13', { waitUntil:'domcontentloaded' });
  const dialog=page.locator('#instrumentDialog');
  await expect(dialog).toBeVisible({timeout:20000});
  await expect(dialog).toHaveAttribute('data-instrument-kind','water');
  const iframe=page.locator('#instrumentStage iframe.water-v6-frame');
  await expect(iframe).toBeVisible({timeout:20000});
  const app=page.frameLocator('#instrumentStage iframe.water-v6-frame');
  await expect(app.locator('[data-tab="sensitivity"]')).toBeVisible({timeout:20000});
  return {dialog,iframe,app};
}

test('V6 deep link opens the native Water dialog and all seven analysis workspaces', async ({page})=>{
  const {dialog,app}=await openWater(page);
  await expect(page.locator('#instrumentTitle')).toHaveText('Water as Spectrum');
  await expect(app.locator('#mainNav [data-tab]')).toHaveCount(7);
  for(const tab of ['path','iop','atm','sensor','ac','compare','sensitivity']){
    await app.locator('[data-tab="'+tab+'"]').click();
    await expect(app.locator('[data-tab="'+tab+'"]')).toHaveAttribute('aria-selected','true');
    await expect(app.locator('#mainContent')).not.toBeEmpty();
  }
  await expect(dialog).toHaveAttribute('data-lab-workspace','true');
});

test('V6 sensitivity exposes finite-difference physics and parameter perturbation',async ({page})=>{
  const {app}=await openWater(page);
  await app.locator('[data-tab="sensitivity"]').click();
  await expect(app.locator('#spaceTitle')).toContainText('Sensitivity');
  await expect(app.locator('[data-plot="derivative"]')).toHaveAttribute('aria-pressed','true');
  await expect(app.locator('#mainContent')).toContainText('FINITE DIFFERENCE');
  await app.locator('[data-sensitivity-parameter="ag"]').click();
  await expect(app.locator('[data-sensitivity-parameter="ag"]')).toHaveAttribute('aria-pressed','true');
  await app.locator('[data-sensitivity-step="10"]').click();
  await expect(app.locator('[data-sensitivity-step="10"]')).toHaveAttribute('aria-pressed','true');
  await expect(app.locator('#mainContent')).toContainText('Requested step: 10%');
  for(const mode of ['delta','overlay','derivative']){
    await app.locator('[data-plot="'+mode+'"]').click();
    await expect(app.locator('[data-plot="'+mode+'"]')).toHaveAttribute('aria-pressed','true');
  }
});

test('V6 exports 301 sensitivity samples and retains scientific provenance',async ({page})=>{
  const {app}=await openWater(page);
  await app.locator('[data-tab="sensitivity"]').click();
  const csvPending=page.waitForEvent('download');
  await app.locator('#exportBtn').click();
  const csv=await csvPending;
  expect(csv.suggestedFilename()).toContain('v6');
  expect(csv.suggestedFilename()).toMatch(/\.csv$/);
  const jsonPending=page.waitForEvent('download');
  await app.locator('[data-export="json"]').last().click();
  const json=await jsonPending;
  expect(json.suggestedFilename()).toMatch(/\.json$/);
  await app.locator('#inspectBtn').click();
  await expect(app.locator('#inspectorDialog')).toBeVisible();
  await expect(app.locator('#inspectorDialog')).toContainText('not real-data retrieval');
  await app.locator('#closeInspector').click();
});

test('V6 retains Water state across close and reopen and keeps native close working',async ({page})=>{
  const {dialog,app}=await openWater(page);
  await app.locator('[data-tab="sensitivity"]').click();
  await app.locator('[data-sensitivity-parameter="bbp"]').click();
  await app.locator('[data-sensitivity-step="20"]').click();
  await page.locator('#instrumentClose').click();
  await expect(dialog).not.toBeVisible();
  const reopened=await openWater(page);
  await reopened.app.locator('[data-tab="sensitivity"]').click();
  await expect(reopened.app.locator('[data-sensitivity-parameter="bbp"]')).toHaveAttribute('aria-pressed','true');
  await expect(reopened.app.locator('[data-sensitivity-step="20"]')).toHaveAttribute('aria-pressed','true');
});

test('V6 spectral plots and parameter controls remain usable on narrow viewports',async ({page})=>{
  const {app}=await openWater(page);
  await app.locator('[data-tab="sensitivity"]').click();
  await expect(app.locator('svg[data-chart-click]')).toBeVisible();
  await expect(app.locator('#controls')).toBeVisible();
  await expect(app.locator('#probeValue')).toContainText('nm');
  const overflow=await app.locator('body').evaluate(node=>node.scrollWidth > window.innerWidth + 3);
  expect(overflow).toBe(false);
});
