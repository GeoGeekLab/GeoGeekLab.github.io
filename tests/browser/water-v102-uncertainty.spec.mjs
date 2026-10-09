import {test,expect} from '@playwright/test';
async function open(page){
 await page.goto('/lab.html?instrument=water&waterVersion=v102#l13',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#instrumentDialog')).toHaveAttribute('data-water-ui-version','v102',{timeout:20000});
 const app=page.frameLocator('#instrumentStage iframe.water-v102-frame');
 await expect(app.locator('#tab-uncertainty')).toBeVisible({timeout:20000});
 await app.locator('#tab-uncertainty').click();
 await expect(app.locator('.u102-uncertainty')).toBeVisible({timeout:20000});
 return app;
}
test('UX-051: summary reports assumed noise, local rank and scientific limitation',async({page})=>{
 const app=await open(page);
 await expect(app.locator('#mainContent')).toContainText('not retrieval error');
 await expect(app.locator('#mainContent')).toContainText('Most coupled Jacobian columns');
 await expect(app.locator('#mainContent')).toContainText('Weakest Fisher eigenmode');
 await expect(app.locator('#mainContent')).toContainText('Σ = σ²I');
 await expect(app.locator('.u102-assumptions')).toContainText('not observed retrieval accuracy');
});
test('UX-052/053: Jacobian and both correlation concepts have accessible data tables',async({page})=>{
 const app=await open(page);
 await app.locator('#plotNav [data-plot="jacobian"]').click();
 await expect(app.locator('.u102-matrix-table')).toHaveCount(1);
 await expect(app.locator('table caption')).toContainText('Physical-unit Jacobian');
 await expect(app.locator('th[scope="col"]')).not.toHaveCount(0);
 await expect(app.locator('th[scope="row"]')).not.toHaveCount(0);
 await expect(app.locator('.u102-matrix-scroll')).toHaveAttribute('tabindex','0');
 await expect(app.locator('#mainContent')).toContainText('computed separately for each parameter');
 await app.locator('#plotNav [data-plot="correlation"]').click();
 await expect(app.locator('#mainContent')).toContainText('NOT parameter correlation');
 const hasCov=await app.locator('.u102-cov-details').count();
 if(hasCov){
  await app.locator('.u102-cov-details summary').click();
  await expect(app.locator('.u102-matrix-table')).toHaveCount(3);
 }else{
  await expect(app.locator('#mainContent')).toContainText('No inverse Fisher covariance');
 }
});
test('UX-054: sensor, noise and step selections preserve selected parameters and core model values',async({page})=>{
 const app=await open(page);
 const chosen=app.locator('[data-u9-parameter="chl"]');
 await expect(chosen).toHaveAttribute('aria-pressed','true');
 const initial=await app.locator('#num-chl').inputValue();
 await app.locator('[data-u9-sigma="0.000005"]').click();
 await expect(app.locator('[data-u9-sigma="0.000005"]')).toHaveAttribute('aria-pressed','true');
 await app.locator('[data-u9-step="10"]').click();
 await expect(app.locator('[data-u9-step="10"]')).toHaveAttribute('aria-pressed','true');
 await app.locator('[data-sensor="msi"]').click();
 await expect(app.locator('[data-sensor="msi"]')).toHaveAttribute('aria-pressed','true');
 await expect(app.locator('[data-u9-parameter="chl"]')).toHaveAttribute('aria-pressed','true');
 await expect(app.locator('#num-chl')).toHaveValue(initial);
 await expect(app.locator('#mainContent')).toContainText('5.000000e-6');
});
test('UX-052: small screen permits matrix horizontal scrolling without page-level overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const app=await open(page);
 await app.locator('#plotNav [data-plot="jacobian"]').click();
 const scroll=app.locator('.u102-matrix-scroll');
 await scroll.focus();
 await expect(scroll).toBeFocused();
 const r=await scroll.evaluate(el=>({
  tableWidth:el.scrollWidth,clientWidth:el.clientWidth,
  viewport:document.documentElement.clientWidth,page:document.documentElement.scrollWidth
 }));
 expect(r.tableWidth).toBeGreaterThanOrEqual(r.clientWidth);
 expect(r.page).toBeLessThanOrEqual(r.viewport+2);
});
