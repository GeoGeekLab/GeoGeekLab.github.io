import {test,expect} from '@playwright/test';
async function visit(page,tab='rt'){
 await page.goto('/lab.html?instrument=water&waterVersion=v102#l13',{waitUntil:'domcontentloaded'});
 const d=page.locator('#instrumentDialog');
 await expect(d).toBeVisible({timeout:20000});
 await expect(d).toHaveAttribute('data-water-ui-version','v102');
 await expect(page.locator('#instrumentStage iframe.water-v102-frame')).toBeVisible({timeout:20000});
 const app=page.frameLocator('#instrumentStage iframe.water-v102-frame');
 await expect(app.locator('#mainNav [data-tab]')).toHaveCount(9);
 await app.locator('[data-tab="'+tab+'"]').click();
 return {d,app};
}
test('UX-P2 desktop: compact host and one document scroll for RT',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 const {d,app}=await visit(page);
 await expect(app.locator('.rt-svg')).toHaveCount(2,{timeout:20000});
 const height=await d.locator('.instrument-head').evaluate(el=>el.getBoundingClientRect().height);
 expect(height).toBeLessThanOrEqual(76);
 const v=await app.locator('body').evaluate(body=>{
  const nodes=['#mainContent','.rt-shell','#controls','.control-scroll','.chart-area'];
  return {owner:getComputedStyle(body).overflowY,
    scrolling:document.scrollingElement.scrollHeight>document.scrollingElement.clientHeight,
    nested:nodes.filter(x=>{const el=document.querySelector(x),css=getComputedStyle(el);return ['auto','scroll'].includes(css.overflowY)&&el.scrollHeight>el.clientHeight+4})};
 });
 expect(v.owner).toBe('auto');expect(v.scrolling).toBe(true);expect(v.nested).toEqual([]);
});
test('UX-P2 uncertainty: no nested result/control scroll, page remains scrollable',async({page})=>{
 const {app}=await visit(page,'uncertainty');
 await expect(app.locator('.u9-container')).toBeVisible();
 const result=await app.locator('.u9-container').evaluate(el=>{
  const xs=[el,document.querySelector('#mainContent'),document.querySelector('#controls')];
  return xs.map(n=>({overflow:getComputedStyle(n).overflowY,nested:['scroll','auto'].includes(getComputedStyle(n).overflowY)&&n.scrollHeight>n.clientHeight+4}));
 });
 expect(result.every(v=>!v.nested)).toBe(true);
});
test('UX-P2 390px: mobile settings appear below RT results without horizontal page spill',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const {app,d}=await visit(page);
 await expect(app.locator('.rt-svg')).toHaveCount(2,{timeout:20000});
 const g=await app.locator('.workspace').evaluate(root=>{
  const main=root.querySelector('.main-space').getBoundingClientRect(),rail=root.querySelector('.side-rail').getBoundingClientRect();
  return {mainBottom:main.bottom,railTop:rail.top,width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth};
 });
 expect(g.railTop).toBeGreaterThanOrEqual(g.mainBottom-2);
 expect(g.width).toBeLessThanOrEqual(g.viewport+2);
 expect(await d.locator('.instrument-head').evaluate(el=>el.getBoundingClientRect().height)).toBeLessThanOrEqual(76);
});
test('UX-P2 default production route remains stable V10.1',async({page})=>{
 await page.goto('/lab.html?instrument=water#l13',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#instrumentStage iframe.water-v101-frame')).toBeVisible({timeout:20000});
 await expect(page.locator('#instrumentStage iframe.water-v102-frame')).toHaveCount(0);
});
