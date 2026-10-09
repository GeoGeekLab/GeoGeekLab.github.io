import {test,expect} from '@playwright/test';
const destination='/lab.html?instrument=water&waterVersion=v102#l13';
async function mount(page){
 await page.goto(destination,{waitUntil:'domcontentloaded'});
 await expect(page.locator('#instrumentDialog')).toHaveAttribute('data-water-ui-version','v102',{timeout:25000});
 const app=page.frameLocator('#instrumentStage iframe.water-v102-frame');
 await expect(app.locator('#mainNav [data-tab]')).toHaveCount(9,{timeout:25000});
 return app;
}
test('Stages 5–7: all nine workspaces render with consistent scientific semantics',async({page})=>{
 const app=await mount(page);
 const tabs=[
  ['path','.p6-schematic'],['iop','.p6-optics'],['atm','.p6b-atmosphere'],
  ['sensor','.p6b-sensor'],['ac','.p7-ac'],['compare','.p7-compare'],
  ['sensitivity','.p7-sensitivity'],['uncertainty','.u102-uncertainty'],
  ['rt','.rt-shell']
 ];
 for(const [tab,selector] of tabs){
  await app.locator('#tab-'+tab).click();
  await expect(app.locator('#tab-'+tab)).toHaveAttribute('aria-selected','true');
  await expect(app.locator(selector)).toBeVisible({timeout:15000});
  await expect(app.locator('.water-render-error')).toHaveCount(0);
 }
 await app.locator('#tab-ac').click();
 await expect(app.locator('.p7-no-validation')).toContainText('NOT PERFORMED');
 await app.locator('#tab-uncertainty').click();
 await expect(app.locator('#mainContent')).toContainText('not retrieval error');
});
const starts=[
 ['iop','rrs','.p6-optics'],
 ['atm','toa','.p6b-atmosphere'],
 ['sensor','sensor','.p6b-sensor'],
 ['ac','correction','.p7-ac'],
 ['uncertainty','summary','.u102-uncertainty']
];
for(const [tab,plot,selector] of starts){
 test('Stages 5–7: persisted '+tab+' boots V10.2 without timing-dependent fallback',async({page})=>{
  await page.addInitScript(({tab,plot})=>{
   try{localStorage.setItem('water_ui_geo_v102',JSON.stringify({tab,plot}));}catch{}
  },{tab,plot});
  const app=await mount(page);
  await expect(app.locator('#tab-'+tab)).toHaveAttribute('aria-selected','true');
  await expect(app.locator(selector)).toBeVisible();
  await expect(page.locator('.instrument-error')).toHaveCount(0);
 });
}
test('Stages 5–7: keyboard navigation and 390px analysis tables remain contained',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const app=await mount(page);
 for(const [tab,selector] of [['uncertainty','.u102-uncertainty'],['sensor','.p6b-sensor'],['ac','.p7-ac']]){
  await app.locator('#tab-'+tab).click();
  await expect(app.locator(selector)).toBeVisible();
  const r=await app.locator(selector).evaluate(el=>({
   viewport:el.ownerDocument.documentElement.clientWidth,
   scrollWidth:el.ownerDocument.documentElement.scrollWidth
  }));
  expect(r.scrollWidth).toBeLessThanOrEqual(r.viewport+2);
 }
 await app.locator('#tab-ac').focus();
 await app.locator('#tab-ac').press('ArrowRight');
 await expect(app.locator('#tab-compare')).toBeFocused();
 await expect(app.locator('#tab-compare')).toHaveAttribute('aria-selected','true');
});
test('Stages 5–7: historical waterVersion=v101 rollback is an independent instrument',async({page})=>{
 await page.goto('/lab.html?instrument=water&waterVersion=v101#l13',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#instrumentDialog')).toHaveAttribute('data-instrument-kind','water',{timeout:25000});
 // The historical V10.1 adapter does not set V10.2's data-water-ui-version marker.
 await expect(page.locator('#instrumentStage iframe.water-v101-frame')).toBeVisible({timeout:25000});
 await expect(page.locator('#instrumentStage iframe.water-v102-frame')).toHaveCount(0);
 const historical=page.frameLocator('#instrumentStage iframe.water-v101-frame');
 await expect(historical.locator('#mainNav [data-tab]')).toHaveCount(9,{timeout:20000});
});
