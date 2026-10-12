import {test,expect} from '@playwright/test';

async function openWater(page,tab='iop'){
  await page.goto('/lab.html?release=20261011v107watercache1&instrument=water#l13',{waitUntil:'domcontentloaded'});
  const dialog=page.locator('#instrumentDialog');
  await expect(dialog).toHaveAttribute('data-water-ui-version','v102',{timeout:30000});
  const frame=page.frameLocator('#instrumentStage iframe.water-v102-frame');
  await expect(frame.locator('html')).toHaveAttribute('data-water-award-polish','a5',{timeout:30000});
  await frame.locator('#mainNav [data-tab="'+tab+'"]').click();
  return {dialog,frame};
}

test('A9 navigation overflow uses explicit continuation cues instead of exposed partial labels',async({page})=>{
  const {frame}=await openWater(page,'rt');
  const nav=frame.locator('.appnav');
  const cue=await nav.evaluate(node=>{
    const before=getComputedStyle(node,'::before');
    const after=getComputedStyle(node,'::after');
    return {
      beforeContent:before.content,
      beforeWidth:parseFloat(before.width),
      beforeOpacity:parseFloat(before.opacity),
      afterContent:after.content,
      afterWidth:parseFloat(after.width)
    };
  });
  expect(cue.beforeContent).toContain('‹');
  expect(cue.afterContent).toContain('›');
  expect(cue.beforeWidth).toBeGreaterThanOrEqual(88);
  expect(cue.afterWidth).toBeGreaterThanOrEqual(88);
});

test('A9 Water Optics opening is flat and keeps the primary spectrum in the desktop first view',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'desktop composition contract');
  const {frame}=await openWater(page,'iop');
  const intro=frame.locator('.p6-optics.award-optics-a2 > .p6-optics-intro');
  await expect(intro).toBeVisible();
  const radius=await intro.evaluate(node=>parseFloat(getComputedStyle(node).borderTopLeftRadius));
  expect(radius).toBeLessThanOrEqual(1);

  const primary=frame.locator('.p6-spectrum.award-spectrum-primary');
  await expect(primary).toBeVisible();
  const box=await primary.boundingBox();
  expect(box).not.toBeNull();
  expect(box.y).toBeLessThan(760);
});

test('A9 mobile Lab exit presents one back-to-index glyph',async({page},testInfo)=>{
  test.skip(!testInfo.project.name.includes('mobile'),'mobile shell contract');
  const {dialog}=await openWater(page,'iop');
  const close=dialog.locator('#instrumentClose');
  const style=await close.evaluate(node=>({
    color:getComputedStyle(node).color,
    before:getComputedStyle(node,'::before').content,
    beforeColor:getComputedStyle(node,'::before').color,
    ariaLabel:node.getAttribute('aria-label')
  }));
  expect(style.color).toBe('rgba(0, 0, 0, 0)');
  expect(style.before).toContain('←');
  expect(style.beforeColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(style.ariaLabel).toBe('Return to Lab Index');
});
