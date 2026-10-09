import {test,expect} from '@playwright/test';
async function open(page){
 await page.goto('/water/workbench-v10-2/app/index.html?embed=1',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#mainNav [data-tab]')).toHaveCount(9,{timeout:20000});
 await expect(page.locator('#v102ScienceGlossary')).toBeAttached();
}
test('UX-081 all nine workspaces fit 320, 390, 768, 1024 and 1440 px',async({page},testInfo)=>{
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  if(width===320)await open(page);
  for(const tab of ['path','iop','atm','sensor','ac','compare','sensitivity','uncertainty','rt']){
   await page.locator('#tab-'+tab).click();
   await expect(page.locator('#mainContent')).not.toContainText('Workspace unavailable');
   const size=await page.evaluate(()=>({
    scroll:document.documentElement.scrollWidth,
    client:document.documentElement.clientWidth,
    nav:document.querySelector('#mainNav').getBoundingClientRect().width,
    controls:document.querySelector('#panelBtn').getBoundingClientRect().width
   }));
   expect(size.scroll,tab+' overflow at '+width+' px').toBeLessThanOrEqual(size.client+2);
   expect(size.controls).toBeGreaterThan(0);
  }
  await page.locator('#tab-iop').click();
  await testInfo.attach('water-v102-'+width+'px-'+testInfo.project.name,{
   body:await page.screenshot({fullPage:false}),contentType:'image/png'
  });
 }
});
test('UX-082 chart has accessible numeric data, keyboard navigation and explicit chart unit',async({page})=>{
 await open(page);
 await page.locator('#tab-iop').click();
 await expect(page.locator('.v102-chart-equivalent')).not.toHaveCount(0);
 const svg=page.locator('svg[data-chart-ref]').first();
 await expect(svg).toHaveAttribute('aria-describedby',/v102-chart-equivalent/);
 const table=page.locator('.v102-chart-equivalent').first();
 await table.locator('summary').click();
 await expect(table.locator('tbody tr')).toHaveCount(14);
 const scroll=table.locator('.v102-table-scroll');
 await scroll.focus();
 await expect(scroll).toBeFocused();
 await expect(table.locator('th[scope="col"]')).not.toHaveCount(0);
 await expect(table.locator('th[scope="row"]')).not.toHaveCount(0);
 await svg.focus();
 await svg.press('ArrowRight');
 await expect(page.locator('#probeValue')).toContainText('444 nm');
 await page.locator('#v102ScienceGlossary summary').click();
 await expect(page.locator('#v102ScienceGlossary')).toContainText('Above-water remote-sensing reflectance');
 await expect(page.locator('#v102ScienceGlossary')).toContainText('Subsurface');
});
test('UX-083 CSV and JSON encode same 301 simulated current-view values',async({page})=>{
 await open(page);
 await page.locator('#tab-iop').click();
 const actions=page.locator('.v102-current-view-actions');
 await expect(actions).toBeVisible();
 const jsonPromise=page.waitForEvent('download');
 await actions.locator('[data-export-view="json"]').click();
 const json=await jsonPromise;
 expect(json.suggestedFilename()).toMatch(/iop_.+_current_view\.json$/);
 const source=JSON.parse((await (await import('node:fs/promises')).readFile(await json.path(),'utf8')));
 expect(source.kind).toBe('water-v102-current-view');
 expect(source.sourceExperimentSchema).toBe(8);
 expect(source.wavelength_nm).toHaveLength(301);
 expect(source.charts[0].series[0].values).toHaveLength(301);
 const csvPromise=page.waitForEvent('download');
 await actions.locator('[data-export-view="csv"]').click();
 const csv=await csvPromise;
 const content=await (await import('node:fs/promises')).readFile(await csv.path(),'utf8');
 expect(content).toContain('# source=GeoGeek first-order model simulation');
 expect(content).toContain('"400"');
 expect(content).toContain('"700"');
 const probe=source.probeWavelengthNm,index=probe-400;
 const line=content.split('\n').find(row=>row.startsWith('"'+probe+'",'));
 expect(line).toContain('"'+String(source.charts[0].series[0].values[index])+'"');
});
test('UX-082 200% equivalent page zoom keeps core controls and glossary reachable',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await open(page);
 await page.evaluate(()=>{document.documentElement.style.zoom='2'});
 for(const tab of ['path','iop','ac','uncertainty','rt']){
  await page.locator('#tab-'+tab).click();
  await expect(page.locator('#mainContent')).not.toContainText('Workspace unavailable');
  await expect(page.locator('#v102ScienceGlossary summary')).toBeVisible();
  await expect(page.locator('#panelBtn')).toBeVisible();
 }
 await page.locator('#v102ScienceGlossary summary').click();
 await expect(page.locator('#v102ScienceGlossary')).toContainText('SRF');
});
