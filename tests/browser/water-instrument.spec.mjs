import { test, expect } from '@playwright/test';

// V9 replaces the legacy monolithic Water DOM with a same-origin iframe.
// Test the public Lab entry and the real instrument, not the obsolete V3 selectors.
async function openWater(page) {
  await page.goto('/lab.html?instrument=water#l13', { waitUntil:'domcontentloaded' });
  const dialog=page.locator('#instrumentDialog');
  await expect(dialog).toBeVisible({timeout:20000});
  await expect(dialog).toHaveAttribute('data-instrument-kind','water');
  const iframe=page.locator('#instrumentStage iframe.water-v9-frame');
  await expect(iframe).toBeVisible({timeout:20000});
  const app=page.frameLocator('#instrumentStage iframe.water-v9-frame');
  await expect(app.locator('[data-tab="sensitivity"]')).toBeVisible({timeout:20000});
  return {dialog,iframe,app};
}

test('V9 deep link opens the native Water dialog and all eight analysis workspaces', async ({page})=>{
  const {dialog,app}=await openWater(page);
  await expect(page.locator('#instrumentTitle')).toHaveText('Water as Spectrum');
  await expect(app.locator('#mainNav [data-tab]')).toHaveCount(8);
  for(const tab of ['path','iop','atm','sensor','ac','compare','sensitivity']){
    await app.locator('[data-tab="'+tab+'"]').click();
    await expect(app.locator('[data-tab="'+tab+'"]')).toHaveAttribute('aria-selected','true');
    await expect(app.locator('#mainContent')).not.toBeEmpty();
  }
  await expect(dialog).toHaveAttribute('data-lab-workspace','true');
});

test('V9 sensitivity exposes finite-difference physics and parameter perturbation',async ({page})=>{
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

test('V9 exports 301 sensitivity samples and retains scientific provenance',async ({page})=>{
  const {app}=await openWater(page);
  await app.locator('[data-tab="sensitivity"]').click();
  const csvPending=page.waitForEvent('download');
  await app.locator('#exportBtn').click();
  const csv=await csvPending;
  expect(csv.suggestedFilename()).toContain('v9');
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

test('V9 retains Water state across close and reopen and keeps native close working',async ({page})=>{
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

test('V9 spectral plots and parameter controls remain usable on narrow viewports',async ({page})=>{
  const {app}=await openWater(page);
  await app.locator('[data-tab="sensitivity"]').click();
  await expect(app.locator('svg[data-chart-click]')).toBeVisible();
  await expect(app.locator('#controls')).toBeVisible();
  await expect(app.locator('#probeValue')).toContainText('nm');
  const overflow=await app.locator('body').evaluate(node=>node.scrollWidth > window.innerWidth + 3);
  expect(overflow).toBe(false);
});

test('V9 radiative PATH stages remain fully visible without nested clipping at compact desktop height', async ({page})=>{
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

test('V9 radiative PATH wraps on narrow viewports without horizontal overflow',async ({page})=>{
  await page.setViewportSize({width:390,height:820});
  const {app}=await openWater(page);
  await app.locator('[data-tab="path"]').click();
  await expect(app.locator('.path-stage-card')).toHaveCount(5);
  const overflow=await app.locator('body').evaluate(el=>el.scrollWidth>window.innerWidth+3);
  expect(overflow).toBe(false);
});

test('V9 band sensitivity uses sensor-integrated values and rejects partial bands', async ({page})=>{
  const {app}=await openWater(page);
  await app.locator('[data-tab="sensitivity"]').click();
  await app.locator('[data-plot="bands"]').click();
  await expect(app.locator('.band-response-row')).toHaveCount(10);
  await expect(app.locator('.band-response-row[data-band-result="Oa01"]')).toHaveAttribute('data-status','partial');
  await expect(app.locator('.band-response-row[data-band-result="Oa02"]')).toHaveAttribute('data-status','full');
  await expect(app.locator('.band-response-intro')).toContainText('simplified-top-hat');
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


test('V9 spectral geometry is proportional and hover reads all component curves',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  const {app}=await openWater(page);
  await app.locator('[data-tab="iop"]').click();
  await app.locator('[data-plot="bb"]').click();
  const svg=app.locator('#mainContent svg.graph[data-chart-ref]').first();
  await expect(svg).toBeVisible();
  await expect(svg).toHaveAttribute('data-water-probe-bound','1');
  const geom=await svg.evaluate(node=>{
    const b=node.getBoundingClientRect(),v=node.viewBox.baseVal;
    return {cssRatio:b.width/b.height,svgRatio:v.width/v.height,lines:node.querySelectorAll('path.graph-line').length};
  });
  expect(Math.abs(geom.cssRatio-geom.svgRatio)).toBeLessThan(.015);
  expect(geom.lines).toBe(3);
  const bounds=await svg.boundingBox();
  await page.mouse.move(bounds.x+bounds.width*.54,bounds.y+bounds.height*.45);
  const tooltip=app.locator('.chart-hover-values:visible');
  await expect(tooltip).toBeVisible();
  for(const label of ['TOTAL','WATER','PARTICLES'])await expect(tooltip).toContainText(label);
  await expect(app.locator('.chart-footer .multi-values .v')).toHaveCount(3);
  const hovered=Number((await tooltip.locator('strong').first().textContent()).split(' ')[0]);
  await page.mouse.click(bounds.x+bounds.width*.54,bounds.y+bounds.height*.45);
  const pinned=Number((await app.locator('#probeValue').textContent()).split(' ')[0]);
  expect(Math.abs(pinned-hovered)).toBeLessThanOrEqual(1);
  await app.locator('[data-plot="a"]').click();
  await expect(app.locator('#mainContent [data-probe-dot]')).toHaveCount(5);
  await app.locator('[data-plot="all"]').click();
  await expect(app.locator('#mainContent svg.graph[data-chart-ref]')).toHaveCount(3);
});

test('V9 chart geometry follows compact mobile viewport without stretching text',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const {app}=await openWater(page);
  await app.locator('[data-tab="iop"]').click();
  await app.locator('[data-plot="bb"]').click();
  const svg=app.locator('#mainContent svg.graph[data-chart-ref]').first();
  await expect(svg).toBeVisible();
  await expect(svg).toHaveAttribute('data-water-probe-bound','1');
  await expect.poll(async()=>svg.evaluate(node=>{
    const b=node.getBoundingClientRect(),v=node.viewBox.baseVal;
    return Math.abs(b.width/b.height-v.width/v.height);
  })).toBeLessThan(.02);
  await app.locator('[data-plot="all"]').click();
  await expect(app.locator('#mainContent svg.graph[data-chart-ref]')).toHaveCount(3);
  for(const node of await app.locator('#mainContent svg.graph[data-chart-ref]').all()){
    const mismatch=await node.evaluate(svg=>{
      const b=svg.getBoundingClientRect(),v=svg.viewBox.baseVal;
      return Math.abs(b.width/b.height-v.width/v.height);
    });
    expect(mismatch).toBeLessThan(.02);
  }
});


test('V9 published Sentinel-2 measured SRF is distinct from nominal and reports missing B01',async ({page})=>{
 const {app}=await openWater(page);
 await app.locator('[data-tab="sensor"]').click();
 await app.locator('[data-sensor="msi"]').click();
 await app.locator('[data-response-mode="measured"]').click();
 await expect(app.locator('[data-response-mode="measured"]')).toHaveAttribute('aria-pressed','true');
 await expect(app.locator('[data-srf-status="B01"]')).toContainText('UNAVAILABLE');
 await expect(app.locator('[data-srf-status="B02"]')).not.toContainText('UNAVAILABLE');
 await app.locator('[data-plot="srfProfile"]').click();
 await app.locator('[data-srf-band="B02"]').first().click();
 await expect(app.locator('.srf-profile')).toContainText('Measured vs nominal SRF');
 await expect(app.locator('.srf-profile svg path')).toHaveCount(1);
 await app.locator('[data-srf-platform="s2b"]').click();
 await expect(app.locator('.srf-profile')).toContainText('S2B');
 await app.locator('[data-sensor="oli"]').click();
 await expect(app.locator('[data-srf-status="B1"]')).not.toContainText('UNAVAILABLE');
 await app.locator('[data-sensor="olci"]').click();
 await expect(app.locator('[data-response-mode="measured"]')).toBeDisabled();
});

test('V9 sensitivity and experimental JSON preserve the measured SRF source provenance',async ({page})=>{
 const {app}=await openWater(page);
 await app.locator('[data-tab="sensitivity"]').click();
 await app.locator('[data-sensor="msi"]').click();
 await app.locator('[data-response-mode="measured"]').click();
 await app.locator('[data-plot="bands"]').click();
 await expect(app.locator('.band-response-intro')).toContainText('published-measured-1nm-srf');
 await expect(app.locator('.band-response-row[data-band-result="B01"]')).toHaveAttribute('data-status','unavailable');
 await app.locator('[data-sensitivity-parameter="ag"]').click();
 await app.locator('[data-sensitivity-step="10"]').click();
 await expect(app.locator('.band-response-row[data-band-result="B02"]')).toHaveAttribute('data-status','full');
 const dl=page.waitForEvent('download');
 await app.locator('[data-export="bands"]').click();
 const f=await dl;
 expect(f.suggestedFilename()).toContain('v9');
 await app.locator('[data-tab="sensor"]').click();
 await app.locator('[data-sensor="msi"]').click();
 await app.locator('#advancedDetails summary').click();
 const json=page.waitForEvent('download');
 await app.locator('[data-export="json"]').click();
 expect((await json).suggestedFilename()).toContain('v9');
});


test('V9 Fisher workspace shows eight tabs, bounded Jacobian and assumed-noise controls',async({page})=>{
 const {app}=await openWater(page);
 await expect(app.locator('#mainNav [data-tab]')).toHaveCount(8);
 await app.locator('[data-tab="uncertainty"]').click();
 await expect(app.locator('#spaceTitle')).toContainText('Uncertainty & Identifiability');
 await expect(app.locator('.u9-metrics')).toBeVisible();
 await expect(app.locator('.u9-metrics')).toContainText('ASSUMED σ(Rrs)');
 await expect(app.locator('[data-u9-parameter="chl"]')).toHaveAttribute('aria-pressed','true');
 await app.locator('[data-plot="jacobian"]').click();
 await expect.poll(()=>app.locator('.u9-matrix-row').count()).toBeGreaterThan(4);
 await app.locator('[data-plot="correlation"]').click();
 await expect(app.locator('.u9-summary h3')).toHaveText('Local parameter correlation matrix');
 await expect(app.locator('.u9-summary')).toContainText(/conditional covariance/i);
 await app.locator('[data-plot="summary"]').click();
 await app.locator('[data-u9-sigma="0.0001"]').click();
 await expect(app.locator('[data-u9-sigma="0.0001"]')).toHaveAttribute('aria-pressed','true');
 await app.locator('[data-u9-step="10"]').click();
 await expect(app.locator('[data-u9-step="10"]')).toHaveAttribute('aria-pressed','true');
});
test('V9 insufficient measured MSI bands with five parameters report rank deficiency without covariance',async({page})=>{
 const {app}=await openWater(page);
 await app.locator('[data-tab="uncertainty"]').click();
 await app.locator('[data-sensor="msi"]').click();
 await app.locator('[data-response-mode="measured"]').click();
 for(const id of ['anap','bbp','eta']) await app.locator('[data-u9-parameter="'+id+'"]').click();
 await expect(app.locator('.u9-alert')).toContainText('RANK DEFICIENT');
 await expect(app.locator('.u9-null')).toContainText('No parameter uncertainties');
 await expect(app.locator('.u9-metrics')).toContainText('3 bands');
 await app.locator('[data-plot="correlation"]').click();
 await expect(app.locator('.u9-alert')).toContainText('Covariance withheld');
});
test('V9 exports a band-by-band Jacobian CSV and session provenance JSON',async({page})=>{
 const {app}=await openWater(page);
 await app.locator('[data-tab="uncertainty"]').click();
 const csv=page.waitForEvent('download');
 await app.locator('[data-export="u9jacobian"]').click();
 expect((await csv).suggestedFilename()).toBe('water_as_spectrum_v9_jacobian.csv');
 const json=page.waitForEvent('download');
 await app.locator('[data-export="json"]').click();
 expect((await json).suggestedFilename()).toContain('v9');
});


test('V9 recovers a persisted V8 session even if the standalone uncertainty engine request is blocked',async({page})=>{
 const old={tab:'iop',plot:'rrs',probe:443,showPanel:true,axisRanges:{},
  sensor:'olci',responseMode:'nominal',srfPlatform:'s2a',srfBand:'B02',
  params:{chl:1,ag:.05,anap:.02,bbp:.002,aot:.1,alpha:.7,pressure:1013.25,
   sza:30,vza:10,raz:135,corrAot:.1,corrAlpha:.7,sg:.0176,snap:.0123,eta:1},
  sensitivityParameter:'chl',sensitivityStep:5};
 await page.addInitScript(saved=>{
  if(location.pathname.includes('/water/workbench-v9/app/index.html')){
   localStorage.removeItem('water_ui_geo_v9');
   localStorage.setItem('water_ui_geo_v8',JSON.stringify(saved));
  }
 },old);
 await page.route('**/water/workbench-v9/analysis/uncertainty-engine.js*',route=>route.abort());
 const {app}=await openWater(page);
 await expect(app.locator('#mainNav [data-tab]')).toHaveCount(8);
 await expect(app.locator('#mainContent svg')).toBeVisible();
 await expect(app.locator('#controls [data-range="chl"]')).toBeVisible();
 await app.locator('[data-tab="uncertainty"]').click();
 await expect(app.locator('.u9-metrics')).toBeVisible();
 await expect(app.locator('.u9-metrics')).toContainText('MATRIX RANK');
 await app.locator('[data-tab="iop"]').click();
 await expect(app.locator('#mainContent svg')).toBeVisible();
});

test('V9 resumed session remains interactive after a same-origin iframe reload',async({page})=>{
 const {app}=await openWater(page);
 await app.locator('[data-tab="uncertainty"]').click();
 await app.locator('[data-u9-sigma="0.0001"]').click();
 await expect(app.locator('[data-u9-sigma="0.0001"]')).toHaveAttribute('aria-pressed','true');
 await page.reload({waitUntil:'domcontentloaded'});
 const resumed=page.frameLocator('#instrumentStage iframe.water-v9-frame');
 await expect(resumed.locator('#mainNav [data-tab]')).toHaveCount(8,{timeout:20000});
 await expect(resumed.locator('.u9-metrics')).toBeVisible();
 await expect(resumed.locator('[data-u9-sigma="0.0001"]')).toHaveAttribute('aria-pressed','true');
});
