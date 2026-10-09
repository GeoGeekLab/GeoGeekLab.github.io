import {test,expect} from '@playwright/test';
async function openStage3(page,tab='iop'){
 await page.goto('/lab.html?instrument=water&waterVersion=v102#l13',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#instrumentDialog')).toHaveAttribute('data-water-ui-version','v102',{timeout:20000});
 const app=page.frameLocator('#instrumentStage iframe.water-v102-frame');
 await expect(app.locator('#mainNav [data-tab]')).toHaveCount(9,{timeout:20000});
 if(tab!=='iop')await app.locator('#tab-'+tab).click();
 return app;
}
test('UX-P3 3 grouped sections and keyboard navigation preserve all 9 tab semantics',async({page})=>{
 const app=await openStage3(page);
 await expect(app.locator('.ui-nav-group')).toHaveCount(3);
 await expect(app.locator('.ui-nav-heading')).toHaveText(['Physical model','Analysis','Numerical reference']);
 await expect(app.locator('[role="tab"][aria-selected="true"]')).toHaveCount(1);
 await app.locator('#tab-iop').focus();
 await page.keyboard.press('ArrowRight');
 await expect(app.locator('#tab-atm')).toHaveAttribute('aria-selected','true');
 await expect(app.locator('#tab-atm')).toBeFocused();
 await page.keyboard.press('End');
 await expect(app.locator('#tab-rt')).toHaveAttribute('aria-selected','true');
 await page.keyboard.press('Home');
 await expect(app.locator('#tab-path')).toHaveAttribute('aria-selected','true');
 await expect(app.locator('#mainContent')).toHaveAttribute('role','tabpanel');
 await expect(app.locator('#mainContent')).toHaveAttribute('aria-labelledby','tab-path');
});
test('UX-P3 status uses RT provenance and responds to parameter matching',async({page})=>{
 const app=await openStage3(page,'rt');
 await expect(app.locator('.rt-svg')).toHaveCount(2,{timeout:20000});
 await expect(app.locator('#uiModelStatus')).toContainText('Scalar DOM');
 await expect(app.locator('#uiValidationStatus')).toContainText('no external benchmark');
 await expect(app.locator('#uiSessionStatus')).toContainText('no cloud sync');
 await expect(app.locator('#uiReferenceStatus')).toContainText('differs');
 await app.locator('[data-rt-apply]').click();
 await expect(app.locator('#uiReferenceStatus')).toContainText('matched');
 await app.locator('[data-rt-case="cdom"]').click();
 await expect(app.locator('#uiReferenceStatus')).toContainText('differs');
 await app.locator('#statusScopeBtn').click();
 await expect(app.locator('#inspectorDialog')).toBeVisible();
 await expect(app.locator('#inspectorDialog')).toContainText('no HydroLight/DISORT cross-check');
 await app.locator('#closeInspector').click();
});
test('UX-P3 tools are discoverable and CSV / JSON / model inspector actions remain functional',async({page})=>{
 const app=await openStage3(page);
 await expect(app.locator('#exportBtn')).toBeHidden();
 await app.locator('#toolsMenu > summary').click();
 await expect(app.locator('#exportBtn')).toBeVisible();
 const download=page.waitForEvent('download');
 await app.locator('#exportBtn').click();
 const saved=await download;
 expect(saved.suggestedFilename()).toContain('.csv');
 await app.locator('#toolsMenu > summary').click();
 await app.locator('#inspectBtn').click();
 await expect(app.locator('#inspectorDialog')).toBeVisible();
 await app.locator('#closeInspector').click();
 await app.locator('#toolsMenu > summary').click();
 await app.locator('#importBtn').click();
 await expect(app.locator('#importFile')).toBeAttached();
});
test('UX-P3 reusable setup panel and show-hide controls retain existing scientific sliders',async({page})=>{
 const app=await openStage3(page,'iop');
 await expect(app.locator('.ui-setup-context')).toBeVisible();
 await expect(app.locator('.ui-control-section')).not.toHaveCount(0);
 await expect(app.locator('#range-chl')).toBeAttached();
 await expect(app.locator('#panelBtn')).toHaveAttribute('aria-expanded','true');
 await app.locator('#panelBtn').click();
 await expect(app.locator('#panelBtn')).toHaveAttribute('aria-expanded','false');
 await expect(app.locator('#workspace')).toHaveClass(/no-rail/);
 await app.locator('#panelBtn').click();
 await expect(app.locator('#panelBtn')).toHaveAttribute('aria-expanded','true');
 await expect(app.locator('.ui-setup-context')).toBeVisible();
});
test('UX-P3 narrow layout keeps navigation usable, tool popover inside viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const app=await openStage3(page);
 await expect(app.locator('.ui-nav-group')).toHaveCount(3);
 const metrics=await app.locator('#mainNav').evaluate(node=>({
   scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,
   pageWidth:document.documentElement.scrollWidth,viewWidth:document.documentElement.clientWidth
 }));
 expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
 expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewWidth+2);
 await app.locator('#toolsMenu > summary').click();
 await expect(app.locator('#exportBtn')).toBeVisible();
 const rect=await app.locator('.ui-toolmenu-panel').evaluate(el=>({right:el.getBoundingClientRect().right,screen:innerWidth}));
 expect(rect.right).toBeLessThanOrEqual(rect.screen+1);
});
