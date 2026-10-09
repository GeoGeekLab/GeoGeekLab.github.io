import {test,expect} from '@playwright/test';

// Exercise the V10.2 iframe document directly. The separate host-mount baseline
// remains a release gate; these tests isolate the new scientific workspaces.
async function open(page,tab){
 await page.goto('/water/workbench-v10-2/app/index.html?embed=1',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#mainNav [data-tab]')).toHaveCount(9,{timeout:20000});
 await page.locator('#tab-'+tab).click();
 return page;
}
test('UX-063 atmospheric contributions and geometry stay visible and dimensionless',async({page})=>{
 const app=await open(page,'atm');
 await expect(app.locator('.p6b-atmosphere')).toBeVisible();
 await expect(app.locator('.p6b-kicker')).toContainText('FIRST-ORDER SIMULATED TOA REFLECTANCE');
 await expect(app.locator('.p6b-reading')).toHaveCount(4);
 await expect(app.locator('.p6b-reading-grid')).toContainText('Rayleigh path');
 await expect(app.locator('.p6b-reading-grid')).toContainText('Aerosol path');
 await expect(app.locator('.p6b-reading-grid')).toContainText('Transmitted water');
 await expect(app.locator('.p6b-conditions')).toContainText('Solar zenith');
 await expect(app.locator('.p6b-equation')).toContainText('Additive closure');
 await app.locator('#p6b-atmosphere-values summary').click();
 await expect(app.locator('#p6b-atmosphere-values tbody tr')).toHaveCount(14);
 await app.locator('.p6b-table-scroll').first().focus();
 await expect(app.locator('.p6b-table-scroll').first()).toBeFocused();
 await app.locator('#plotNav [data-plot="ray"]').click();
 await expect(app.locator('.p6b-chart-section')).toContainText('Rayleigh path');
 await expect(app.locator('.p6b-hero')).toContainText('not measured top-of-atmosphere radiance');
});
test('UX-063 atmospheric controls preserve their settings after chart changes',async({page})=>{
 const app=await open(page,'atm');
 const before=await app.locator('#num-aot').inputValue();
 await app.locator('#plotNav [data-plot="water"]').click();
 await expect(app.locator('#num-aot')).toHaveValue(before);
 await expect(app.locator('#controls')).toContainText('1 · AEROSOL');
 await expect(app.locator('#controls')).toContainText('2 · AIR PRESSURE');
 await expect(app.locator('#controls')).toContainText('3 · OBSERVATION GEOMETRY');
 await expect(app.locator('#num-pressure')).toBeAttached();
});
test('UX-064 nominal sensor shows no invented OLCI Oa11 sample',async({page})=>{
 const app=await open(page,'sensor');
 await expect(app.locator('.p6b-sensor')).toBeVisible();
 await expect(app.locator('.p6b-source')).toContainText('NOMINAL RECTANGULAR RESPONSE');
 const row=app.locator('#p6b-sensor-table tr[data-srf-status="out_of_model_domain"]');
 await expect(row).toContainText('Oa11');
 await expect(row).toContainText('OUT OF MODEL DOMAIN');
 await expect(row).toContainText('centre above 700 nm');
 await expect(row.locator('td').nth(4)).toHaveText('—');
 await expect(app.locator('.p6b-stages')).toContainText('Band integration');
 await expect(app.locator('.p6b-chart-section')).toContainText('Simulated TOA');
});
test('UX-064 changes between sensor types and SRF modes without silent replacement',async({page})=>{
 const app=await open(page,'sensor');
 await app.locator('[data-sensor="msi"]').click();
 await expect(app.locator('[data-sensor="msi"]')).toHaveAttribute('aria-pressed','true');
 const measured=app.locator('[data-response-mode="measured"]');
 const enabled=await measured.isEnabled();
 if(enabled){
  await measured.click();
  await expect(measured).toHaveAttribute('aria-pressed','true');
  await expect(app.locator('.p6b-source')).toContainText('PUBLISHED MEASURED SRF');
  await expect(app.locator('.p6b-provenance')).toContainText('Git blob SHA');
 }else{
  await expect(app.locator('.p6b-hero')).toContainText('NOMINAL RECTANGULAR RESPONSE');
 }
 await app.locator('#plotNav [data-plot="srfProfile"]').click();
 await expect(app.locator('.p6b-sensor')).toBeVisible();
 await expect(app.locator('.p6b-stages')).toContainText('Three layers');
});
test('UX-063/064 data regions do not cause page-level horizontal overflow at 390 px',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const app=await open(page,'atm');
 await app.locator('#p6b-atmosphere-values summary').click();
 let d=await app.locator('.p6b-atmosphere').evaluate(()=>({page:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
 expect(d.page).toBeLessThanOrEqual(d.viewport+2);
 await app.locator('#tab-sensor').click();
 d=await app.locator('.p6b-sensor').evaluate(()=>({page:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
 expect(d.page).toBeLessThanOrEqual(d.viewport+2);
 await app.locator('#p6b-sensor-table .p6b-table-scroll').focus();
 await expect(app.locator('#p6b-sensor-table .p6b-table-scroll')).toBeFocused();
});

test('P0 #148 persisted atmosphere initial tab must not race a deferred view dependency',async({page})=>{
 await page.addInitScript(()=>{
  try{localStorage.setItem('water_ui_geo_v102',JSON.stringify({tab:'atm',plot:'toa'}));}catch{}
 });
 await page.goto('/lab.html?instrument=water&waterVersion=v102#l13',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#instrumentDialog')).toHaveAttribute('data-water-ui-version','v102',{timeout:25000});
 const app=page.frameLocator('#instrumentStage iframe.water-v102-frame');
 await expect(app.locator('.p6b-atmosphere')).toBeVisible({timeout:20000});
 await expect(app.locator('.p6b-kicker')).toContainText('FIRST-ORDER SIMULATED TOA REFLECTANCE');
});
