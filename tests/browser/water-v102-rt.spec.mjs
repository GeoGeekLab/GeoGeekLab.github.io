import {test,expect} from '@playwright/test';
async function openRT(page){
 await page.goto('/lab.html?instrument=water&waterVersion=v102#l13',{waitUntil:'domcontentloaded'});
 const app=page.frameLocator('#instrumentStage iframe.water-v102-frame');
 await expect(app.locator('#tab-rt')).toBeVisible({timeout:20000});
 await app.locator('#tab-rt').click();
 await expect(app.locator('.rt-science-workspace')).toBeVisible({timeout:20000});
 await expect(app.locator('.rt-science-plot')).toHaveCount(2,{timeout:20000});
 return app;
}
test('UX-RT4 desktop: two accessible depth charts with downward depth axes and sampled table',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 const app=await openRT(page);
 await expect(app.locator('.rt-science-hero')).toContainText('Underwater light');
 await expect(app.locator('.rt-science-card')).toHaveCount(2);
 await expect(app.locator('.rt-science-plot')).toHaveCount(2);
 await expect(app.locator('.rt-science-plot').first()).toHaveAttribute('role','img');
 await expect(app.locator('.rt-science-plot').first()).toContainText('z increases downward');
 await expect(app.locator('.rt-science-plot').first()).toContainText('log10 scale');
 await app.locator('.rt-science-data summary').click();
 await expect(app.locator('.rt-science-data tbody tr')).toHaveCount(10);
 await expect(app.locator('.rt-science-provenance')).toContainText('NOT EXTERNALLY BENCHMARKED');
});
test('UX-RT4 angular: fixed eight mu directions, not angular wavelength or 2D field',async({page})=>{
 const app=await openRT(page);
 await app.locator('[data-plot="angular"]').click();
 await expect(app.locator('.rt-science-plot')).toHaveCount(1);
 await expect(app.locator('.rt-science-view')).toContainText('NOT a 2D');
 await expect(app.locator('.rt-science-plot')).toContainText('|μ| = |cos(upward zenith)|');
 await expect(app.locator('.rt-science-plot')).not.toContainText('Wavelength (nm)');
 await app.locator('.rt-science-data summary').click();
 await expect(app.locator('.rt-science-data tbody tr')).toHaveCount(8);
});
test('UX-RT4 compare: signed residual plot and exact paired five-node rrs table',async({page})=>{
 const app=await openRT(page);
 await app.locator('[data-plot="compare"]').click();
 await expect(app.locator('.rt-science-plot')).toHaveCount(2);
 await expect(app.locator('.rt-science-view')).toContainText('Signed model discrepancy');
 await expect(app.locator('.rt-science-view')).toContainText('PAIRWISE SPECTRAL RMSE');
 await expect(app.locator('.rt-science-view')).toContainText('not evidence of accuracy');
 await app.locator('.rt-science-data summary').click();
 await expect(app.locator('.rt-science-data tbody tr')).toHaveCount(5);
 await expect(app.locator('.rt-science-data thead')).toContainText('Semi − RT');
});
test('UX-RT4 unmatched case action synchronizes IOP, reference status and scientific chart',async({page})=>{
 const app=await openRT(page);
 await expect(app.locator('.rt-science-unmatched')).toBeVisible();
 await app.locator('.rt-science-sync').click();
 await expect(app.locator('.rt-science-matched')).toBeVisible();
 await expect(app.locator('#uiReferenceStatus')).toContainText('matched');
 await app.locator('[data-rt-case="cdom"]').click();
 await expect(app.locator('.rt-science-unmatched')).toBeVisible();
 await app.locator('[data-rt-wl="620"]').click();
 await app.locator('[data-rt-depth="10"]').click();
 await expect(app.locator('.rt-science-conditions')).toContainText('620 nm');
 await expect(app.locator('.rt-science-conditions')).toContainText('10 m');
});
test('UX-RT4 mobile: readable cards, accessible data table and no body horizontal spill',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const app=await openRT(page);
 const metrics=await app.locator('body').evaluate(()=>({
   page:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
   charts:[...document.querySelectorAll('.rt-science-card')].map(node=>({
     regionWidth:node.clientWidth,contentWidth:node.scrollWidth,overflow:getComputedStyle(node).overflowX
   }))
 }));
 expect(metrics.page).toBeLessThanOrEqual(metrics.viewport+2);
 expect(metrics.charts.length).toBe(2);
 await app.locator('.rt-science-data summary').click();
 await expect(app.locator('.rt-science-data table')).toBeVisible();
 await expect(app.locator('.rt-science-sync')).toBeVisible();
});


test('UX-RT4 interaction: depth and wavelength charts select existing discrete reference nodes',async({page})=>{
 const app=await openRT(page);

 const depthChart=app.locator('.rt-science-plot[data-rt-interactive="depth"]').first();
 await expect(depthChart).toBeVisible();
 await expect(depthChart).toHaveAttribute('tabindex','0');
 await expect(depthChart.locator('circle').filter({hasText:'at 10 m:'}).first()).toBeAttached();

 const depthNode=depthChart.locator('circle').filter({hasText:'at 10 m:'}).first();
 await depthNode.click({force:true});
 await expect(app.locator('[data-rt-depth="10"]')).toHaveAttribute('aria-pressed','true');
 await expect(app.locator('.rt-science-conditions')).toContainText('10 m');
 await expect(app.locator('.rt-chart-readout').first()).toContainText('10 m');

 await app.locator('[data-plot="compare"]').click();
 const spectral=app.locator('.rt-science-plot[data-rt-interactive="wavelength"]').first();
 await expect(spectral).toBeVisible();
 const node620=spectral.locator('circle').filter({hasText:'at 620 nm:'}).first();
 await node620.click({force:true});
 await expect(app.locator('[data-rt-wl="620"]')).toHaveAttribute('aria-pressed','true');
 await expect(app.locator('.rt-science-conditions')).toContainText('620 nm');
 await expect(app.locator('.rt-chart-readout').first()).toContainText('620 nm');
});

test('UX-RT4 interaction: keyboard and angular-node inspection remain discrete',async({page})=>{
 const app=await openRT(page);
 const depthChart=app.locator('.rt-science-plot[data-rt-interactive="depth"]').first();
 await depthChart.focus();
 await depthChart.press('End');
 await expect(app.locator('[data-rt-depth="20"]')).toHaveAttribute('aria-pressed','true');
 await expect(app.locator('.rt-science-conditions')).toContainText('20 m');

 await app.locator('[data-plot="angular"]').click();
 const angular=app.locator('.rt-science-plot[data-rt-interactive="direction"]');
 await expect(angular).toBeVisible();
 await angular.focus();
 await angular.press('End');
 await expect(app.locator('.rt-chart-readout')).toContainText('|μ|');
 await expect(angular.locator('circle.is-inspected')).toHaveCount(1);
 await expect(app.locator('[data-rt-depth="20"]')).toHaveAttribute('aria-pressed','true');
});
