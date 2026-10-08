import {test,expect} from '@playwright/test';

async function openRT(page){
 await page.goto('/lab.html?instrument=water#l13',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#instrumentDialog')).toBeVisible({timeout:20000});
 const frame=page.locator('#instrumentStage iframe.water-v101-frame');
 await expect(frame).toBeVisible({timeout:20000});
 const app=page.frameLocator('#instrumentStage iframe.water-v101-frame');
 await expect(app.locator('#mainNav [data-tab]')).toHaveCount(9);
 await app.locator('[data-tab="rt"]').click();
 await expect(app.locator('.rt-svg')).toHaveCount(2,{timeout:20000});
 return app;
}
test('V10.1 renders an accessible numerical RT depth profile and 9-tab navigation',async({page})=>{
 const app=await openRT(page);
 await expect(app.locator('.rt-shell')).toContainText('Depth, direction & model discrepancy');
 await expect(app.locator('.rt-shell')).toContainText('SELF-GENERATED');
 await expect(app.locator('.rt-svg')).toHaveCount(2);
 await expect(app.locator('.rt-svg').first()).toHaveAttribute('role','img');
 await expect(app.locator('.rt-shell')).toContainText('No Fresnel');
});
test('V10.1 enforces discrete water, spectral and depth selections',async({page})=>{
 const app=await openRT(page);
 await app.locator('[data-rt-case="phyto"]').click();
 await app.locator('[data-rt-sun="60"]').click();
 await app.locator('[data-rt-wl="620"]').click();
 await app.locator('[data-rt-depth="10"]').click();
 await expect(app.locator('[data-rt-case="phyto"]')).toHaveAttribute('aria-pressed','true');
 await expect(app.locator('.rt-shell')).toContainText('620 nm · 60°');
 await expect(app.locator('.rt-shell')).toContainText('Kd(10m)');
 await expect(app.locator('.rt-state-row')).toContainText('DIFFERENT');
 await app.locator('[data-rt-apply]').click();
 await expect(app.locator('.rt-state-row')).toContainText('MATCHED');
 await app.locator('[data-plot="angular"]').click();
 await expect(app.locator('.rt-svg')).toHaveCount(1);
 await expect(app.locator('.rt-shell')).toContainText('NOT a 2D');
 await app.locator('[data-plot="compare"]').click();
 await expect(app.locator('.rt-shell')).toContainText('MATCHED');
 await expect(app.locator('.rt-shell')).toContainText('PAIRWISE SPECTRAL RMSE');
});
test('V10.1 unavailable reference never fabricates numerical curves',async({page})=>{
 await page.route('**/reference/rt-reference-v1.json',route=>route.abort());
 await page.goto('/lab.html?instrument=water#l13',{waitUntil:'domcontentloaded'});
 const app=page.frameLocator('#instrumentStage iframe.water-v101-frame');
 await expect(app.locator('[data-tab="rt"]')).toBeVisible({timeout:20000});
 await app.locator('[data-tab="rt"]').click();
 await expect(app.locator('.rt-empty')).toContainText('Reference dataset unavailable',{timeout:20000});
 await expect(app.locator('.rt-svg')).toHaveCount(0);
 await expect(app.locator('[data-rt-retry]')).toBeVisible();
});
test('V10.1 experiment JSON schema v8 preserves the actual RT reference selection',async({page})=>{
 const app=await openRT(page);
 await app.locator('[data-rt-case="cdom"]').click();
 await app.locator('[data-rt-sun="0"]').click();
 await app.locator('[data-rt-wl="550"]').click();
 await app.locator('[data-rt-depth="5"]').click();
 await app.locator('[data-tab="compare"]').click();
 const pending=page.waitForEvent('download');
 await app.locator('[data-export="json"]').click();
 const file=await pending;
 expect(file.suggestedFilename()).toContain('v101');
 const fs=await import('node:fs/promises');
 const data=JSON.parse(await fs.readFile(await file.path(),'utf8'));
 expect(data.schemaVersion).toBe(8);
 expect(data.appVersion).toBe('10.1.0');
 expect(data.waterRT.datasetSchema).toBe('water-rt-reference-v1');
 expect(data.waterRT.caseId).toBe('cdom');
 expect(data.waterRT.szaInWaterDeg).toBe(0);
 expect(data.waterRT.wavelengthNm).toBe(550);
 expect(data.waterRT.depthM).toBe(5);
 expect(data.waterRT.provenance).toContain('NOT external validated');
});
