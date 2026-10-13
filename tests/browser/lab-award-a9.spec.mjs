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

test('A12 navigation keeps complete tabs on desktop and accessible scroll controls elsewhere',async({page})=>{
  const {frame}=await openWater(page,'iop');
  const nav=frame.locator('.appnav');
  const controls=nav.locator('.water-nav-controls');
  const desktop=(page.viewportSize()?.width||0)>=1100;
  if(desktop){
    await expect(controls).toBeHidden();
  }else{
    await expect(controls).toBeVisible();
    await expect(controls).toHaveAttribute('role','group');
  }
  const styles=await nav.evaluate(node=>({
    before:getComputedStyle(node,'::before').display,
    after:getComputedStyle(node,'::after').display
  }));
  expect(styles.before).toBe('none');
  expect(styles.after).toBe('none');
  const next=controls.locator('[data-water-nav-next]');
  const prev=controls.locator('[data-water-nav-prev]');
  const scroller=frame.locator('#mainNav');
  if(!desktop){
    await expect(next).toBeEnabled();
    const start=await scroller.evaluate(node=>node.scrollLeft);
    await next.click();
    await expect.poll(()=>scroller.evaluate(node=>node.scrollLeft)).toBeGreaterThan(start+8);
    await expect(prev).toBeEnabled();
    await prev.focus();
    await page.keyboard.press('Enter');
    await expect.poll(()=>scroller.evaluate(node=>node.scrollLeft)).toBeLessThan(start+20);
  }else{
    await expect.poll(()=>scroller.evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(2);
  }
  await expect(frame.locator('#mainNav [role="tab"][data-tab]')).toHaveCount(9);
});

test('A12 desktop 1280 and 1600 show nine complete workspace tabs without truncation',async({page},testInfo)=>{
  test.skip(testInfo.project.name.includes('mobile'),'Desktop visual composition only');
  for(const viewport of [{width:1280,height:720},{width:1600,height:1000}]){
    await page.setViewportSize(viewport);
    const {frame}=await openWater(page,'rt');
    const metrics=await frame.locator('#mainNav').evaluate(node=>{
      const parent=node.getBoundingClientRect();
      const tabs=[...node.querySelectorAll('[role="tab"][data-tab]')];
      return {
        overflow:node.scrollWidth-node.clientWidth,
        positions:tabs.map(tab=>{
          const rect=tab.getBoundingClientRect();
          return {
            tab:tab.dataset.tab,left:rect.left,right:rect.right,
            textOverflow:tab.scrollWidth-tab.clientWidth,
            verticalOverflow:tab.scrollHeight-tab.clientHeight,
            within:rect.left>=parent.left-1&&rect.right<=parent.right+1
          };
        })
      };
    });
    expect(metrics.positions).toHaveLength(9);
    expect(metrics.overflow).toBeLessThanOrEqual(2);
    for(const tab of metrics.positions){
      expect(tab.within,viewport.width+': '+tab.tab).toBe(true);
      expect(tab.textOverflow,viewport.width+': '+tab.tab).toBeLessThanOrEqual(2);
      expect(tab.verticalOverflow,viewport.width+': '+tab.tab).toBeLessThanOrEqual(2);
    }
    await expect(frame.locator('.rt-science-status')).toBeVisible();
    const graph=await frame.locator('.rt-science-plot-grid .rt-science-plot').first().boundingBox();
    expect(graph).not.toBeNull();
    expect(graph.y).toBeLessThan(viewport.height*.70);
    await frame.locator('#mainNav [data-tab="iop"]').click();
    await expect(frame.locator('#mainNav [data-tab="iop"]')).toHaveAttribute('aria-selected','true');
    await frame.locator('#mainNav [data-tab="rt"]').focus();
    await page.keyboard.press('Enter');
    await expect(frame.locator('#mainNav [data-tab="rt"]')).toHaveAttribute('aria-selected','true');
  }
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
