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

test('A12 navigation has operable continuation controls, without masking partial tabs',async({page})=>{
  const {frame}=await openWater(page,'iop');
  const nav=frame.locator('.appnav');
  const controls=nav.locator('.water-nav-controls');
  await expect(controls).toBeVisible();
  await expect(controls).toHaveAttribute('role','group');
  const styles=await nav.evaluate(node=>({
    before:getComputedStyle(node,'::before').display,
    after:getComputedStyle(node,'::after').display
  }));
  expect(styles.before).toBe('none');
  expect(styles.after).toBe('none');
  const next=controls.locator('[data-water-nav-next]');
  const prev=controls.locator('[data-water-nav-prev]');
  await expect(next).toBeEnabled();
  const scroller=frame.locator('#mainNav');
  const start=await scroller.evaluate(node=>node.scrollLeft);
  await next.click();
  await expect.poll(()=>scroller.evaluate(node=>node.scrollLeft)).toBeGreaterThan(start+8);
  await expect(prev).toBeEnabled();
  await prev.focus();
  await page.keyboard.press('Enter');
  await expect.poll(()=>scroller.evaluate(node=>node.scrollLeft)).toBeLessThan(start+20);
  await expect(frame.locator('#mainNav [role="tab"][data-tab]')).toHaveCount(9);
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
