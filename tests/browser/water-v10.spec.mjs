import {test,expect} from '@playwright/test';

async function openV10(page) {
 await page.goto('/lab.html?instrument=water#l13',{waitUntil:'domcontentloaded'});
 const dialog=page.locator('#instrumentDialog');
 await expect(dialog).toBeVisible({timeout:20000});
 const frame=page.locator('#instrumentStage iframe.water-v10-frame');
 await expect(frame).toBeVisible({timeout:20000});
 const app=page.frameLocator('#instrumentStage iframe.water-v10-frame');
 await expect(app.locator('[data-tab="iop"]')).toBeVisible({timeout:20000});
 return {dialog,frame,app};
}

test('V10.0 default route shows scientific contract and eight workspaces',async({page})=>{
 const {app}=await openV10(page);
 await expect(app.locator('#mainNav [data-tab]')).toHaveCount(8);
 await expect(app.locator('.buildtag')).toContainText('v10.0');
 await expect(app.locator('#v10Science')).toContainText('SEMI_ANALYTICAL');
 await app.locator('#v10Science summary').click();
 await expect(app.locator('#v10Science')).toContainText('NOT calculated');
});

test('V10.0 slope variant is explicit, resettable and retained after tab change',async({page})=>{
 const {app}=await openV10(page);
 await app.locator('[data-tab="iop"]').click();
 await app.locator('#advancedDetails summary').click();
 const sg=app.locator('#num-sg');
 await expect(sg).toBeVisible();
 await sg.fill('0.023');
 await sg.dispatchEvent('change');
 await expect(app.locator('#v10ScienceState')).toContainText('V10_EXPLORATORY_CUSTOM_SLOPES');
 await app.locator('[data-tab="sensor"]').click();
 await app.locator('[data-tab="iop"]').click();
 await expect(app.locator('#v10ScienceState')).toContainText('V10_EXPLORATORY_CUSTOM_SLOPES');
 await app.locator('[data-reset-slopes]').click();
 await expect(app.locator('#v10ScienceState')).toContainText('V9_COMPAT_FIXED_SLOPES');
});

test('V10.0 out-of-domain OLCI Oa11 is not shown as valid',async({page})=>{
 const {app}=await openV10(page);
 await app.locator('[data-tab="sensor"]').click();
 await expect(app.locator('[data-srf-status="Oa11"]')).toHaveText('OUT_OF_MODEL_DOMAIN');
 await app.locator('[data-tab="ac"]').click();
 await expect(app.locator('#mainContent')).toContainText('V10 BAND-INTEGRATED OC4');
});

test('V10.0 export schema v7 retains model identity and guarded variant',async({page})=>{
 const {app}=await openV10(page);
 await app.locator('[data-tab="iop"]').click();
 await app.locator('#advancedDetails summary').click();
 await app.locator('#num-sg').fill('0.022');
 await app.locator('#num-sg').dispatchEvent('change');
 const pending=page.waitForEvent('download');
 await app.locator('[data-tab="compare"]').click();
 if (!(await app.locator('#advancedDetails').evaluate(el=>el.open))) await app.locator('#advancedDetails summary').click();
 await app.locator('[data-export="json"]').click();
 const download=await pending;
 expect(download.suggestedFilename()).toContain('v10');
 const fs=await import('node:fs/promises');
 const content=JSON.parse(await fs.readFile(await download.path(),'utf8'));
 expect(content.schemaVersion).toBe(7);
 expect(content.science.modelType).toBe('SEMI_ANALYTICAL');
 expect(content.science.modelVariant).toBe('V10_EXPLORATORY_CUSTOM_SLOPES');
 expect(content.state.params.sg).toBe(0.022);
 expect(content.sensor.bandValidity.find(b=>b.id==='Oa11').status).toBe('out_of_domain');
});
