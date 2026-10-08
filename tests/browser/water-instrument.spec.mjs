import { test, expect } from '@playwright/test';

// V7 replaces the legacy monolithic Water DOM with a same-origin iframe.
// Test the public Lab entry and the real instrument, not the obsolete V3 selectors.
async function openWater(page) {
  await page.goto('/lab.html?instrument=water#l13', { waitUntil:'domcontentloaded' });
  const dialog=page.locator('#instrumentDialog');
  await expect(dialog).toBeVisible({timeout:20000});
  await expect(dialog).toHaveAttribute('data-instrument-kind','water');
  const iframe=page.locator('#instrumentStage iframe.water-v7-frame');
  await expect(iframe).toBeVisible({timeout:20000});
  const app=page.frameLocator('#instrumentStage iframe.water-v7-frame');
  await expect(app.locator('[data-tab="sensitivity"]')).toBeVisible({timeout:20000});
  return {dialog,iframe,app};
}

test('V7 deep link opens the native Water dialog and all seven analysis workspaces', async ({page})=>{
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

test('V7 sensitivity exposes finite-difference physics and parameter perturbation',async ({page})=>{
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

test('V7 exports 301 sensitivity samples and retains scientific provenance',async ({page})=>{
  const {app}=await openWater(page);
  await app.locator('[data-tab="sensitivity"]').click();
  const csvPending=page.waitForEvent('download');
  await app.locator('#exportBtn').click();
  const csv=await csvPending;
  expect(csv.suggestedFilename()).toContain('v7');
  expect(csv.suggestedFilename()).toMatch(/\.csv$/);
  const jsonPending=page.waitForEvent('download');
  await app.locator('#advancedDetails summary').click();
  await app.locator('[data-export="json"]').click();
  const json=await jsonPending;
  expect(json.suggestedFilename()).toMatch(/\.json$/);
  await app.locator('#inspectBtn').click();
  await expect(app.locator('#inspectorDialog')).toBeVisible();
  await expect(app.locator('#inspectorDialog')).toContainText('no independent field validation');
  await app.locator('#closeInspector').click();
});

test('V7 retains Water state across close and reopen and keeps native close working',async ({page})=>{
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

test('V7 spectral plots and parameter controls remain usable on narrow viewports',async ({page})=>{
  const {app}=await openWater(page);
  await app.locator('[data-tab="sensitivity"]').click();
  await expect(app.locator('svg[data-chart-click]')).toBeVisible();
  await expect(app.locator('#controls')).toBeVisible();
  await expect(app.locator('#probeValue')).toContainText('nm');
  const overflow=await app.locator('body').evaluate(node=>node.scrollWidth > window.innerWidth + 3);
  expect(overflow).toBe(false);
});

test('V7 radiative PATH stages remain fully visible without nested clipping at compact desktop height', async ({page})=>{
  await page.setViewportSize({width:1840,height:830});
  const {app}=await openWater(page);
  await app.locator('[data-tab="path"]').click();
  const tiles=app.locator('.path-stage-card');
  await expect(tiles).toHaveCount(5);
  const dimensions=await app.locator('#mainContent').evaluate(node=>{
    const hint=node.querySelector('.path-hint'),stage=node.querySelector('.path-stage-grid'),details=node.querySelector('.stage-explain');
    const viewport=node.getBoundingClientRect();
    return {noScroll:node.scrollHeight<=node.clientHeight+3,
      tiles:[...node.querySelectorAll('.path-stage-card')].every(card=>{
        const box=card.getBoundingClientRect();
        return box.top>=viewport.top&&box.bottom<=viewport.bottom&&box.height>=95;
      }),
      detailsVisible:details.getBoundingClientRect().bottom<=viewport.bottom+3,
      hintVisible:hint.getBoundingClientRect().bottom<=viewport.bottom+3,
      horizontalOverflow:node.scrollWidth>node.clientWidth+3};
  });
  expect(dimensions.noScroll).toBe(true);
  expect(dimensions.tiles).toBe(true);
  expect(dimensions.detailsVisible).toBe(true);
  expect(dimensions.hintVisible).toBe(true);
  expect(dimensions.horizontalOverflow).toBe(false);
  await app.locator('.path-stage-card[data-stage="atm"]').click();
  await expect(app.locator('.path-stage-card[data-stage="atm"]')).toHaveAttribute('aria-pressed','true');
  await expect(app.locator('.stage-explain')).toContainText('Atmospheric Scattering');
  await app.locator('.path-stage-card[data-stage="sat"]').focus();
  await app.locator('.path-stage-card[data-stage="sat"]').press('Enter');
  await expect(app.locator('.path-stage-card[data-stage="sat"]')).toHaveAttribute('aria-pressed','true');
});

test('V7 radiative PATH wraps on narrow viewports without horizontal overflow',async ({page})=>{
  await page.setViewportSize({width:390,height:820});
  const {app}=await openWater(page);
  await app.locator('[data-tab="path"]').click();
  await expect(app.locator('.path-stage-card')).toHaveCount(5);
  const overflow=await app.locator('body').evaluate(el=>el.scrollWidth>window.innerWidth+3);
  expect(overflow).toBe(false);
});

test('V7 band sensitivity uses sensor-integrated values and rejects partial bands', async ({page})=>{
  const {app}=await openWater(page);
  await app.locator('[data-tab="sensitivity"]').click();
  await app.locator('[data-plot="bands"]').click();
  await expect(app.locator('.band-response-row')).toHaveCount(10);
  await expect(app.locator('.band-response-row[data-band-result="Oa01"]')).toHaveAttribute('data-status','partial');
  await expect(app.locator('.band-response-row[data-band-result="Oa02"]')).toHaveAttribute('data-status','full');
  await expect(app.locator('.band-response-intro')).toContainText('not measured SRFs');
  await app.locator('[data-sensitivity-parameter="ag"]').click();
  await app.locator('[data-sensitivity-step="10"]').click();
  await expect(app.locator('[data-plot="bands"]')).toHaveAttribute('aria-pressed','true');
  const csv=page.waitForEvent('download');
  await app.locator('[data-export="bands"]').click();
  await expect(await csv).toBeDefined();
  await app.locator('[data-sensor="oci"]').click();
  await expect(app.locator('.band-response-row')).toHaveCount(60);
  await app.locator('[data-sensor="msi"]').click();
  await expect(app.locator('.band-response-row').first()).toBeVisible();
});
