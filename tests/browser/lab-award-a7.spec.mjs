import {test,expect} from '@playwright/test';

async function openWaterRt(page){
  await page.goto('/lab.html?release=20261011v107watercache1&instrument=water#l13',{waitUntil:'domcontentloaded'});
  const dialog=page.locator('#instrumentDialog');
  await expect(dialog).toHaveAttribute('data-water-ui-version','v102',{timeout:30000});
  const frame=page.frameLocator('#instrumentStage iframe.water-v102-frame');
  await expect(frame.locator('#mainNav [data-tab]')).toHaveCount(9,{timeout:30000});
  await frame.locator('#tab-rt').click();
  await expect(frame.locator('.rt-science-workspace')).toBeVisible();
  return {dialog,frame};
}

test('A7 Water keeps compact host and follows the declared responsive orientation contract',async({page},testInfo)=>{
  const {dialog}=await openWaterRt(page);
  const height=await dialog.locator('.instrument-head').evaluate(node=>node.getBoundingClientRect().height);
  expect(height).toBeLessThanOrEqual(76);

  const context=dialog.locator('.instrument-award-context');
  const kicker=dialog.locator('.instrument-award-context-kicker');
  const mode=dialog.locator('.instrument-award-context-mode');

  await expect(kicker).toHaveText('OBSERVATORY · 07');
  await expect(mode).toHaveText('INTERNAL WORKSPACE');
  expect(await kicker.evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(10);
  expect(await mode.evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(10);

  if(testInfo.project.name.includes('mobile')) await expect(context).toBeHidden();
  else await expect(context).toBeVisible();

  await expect(dialog.locator('.instrument-award-axis')).toBeHidden();
});

test('A7 RT reference chamber removes the dashboard-frame effect without hiding scientific status',async({page})=>{
  const {frame}=await openWaterRt(page);
  const chamber=frame.locator('.rt-science-workspace');
  const styles=await chamber.evaluate(node=>({
    borderTopWidth:getComputedStyle(node).borderTopWidth,
    background:getComputedStyle(node).backgroundColor
  }));
  expect(parseFloat(styles.borderTopWidth)).toBeLessThanOrEqual(0.5);

  await expect(frame.locator('.rt-science-status')).toBeVisible();
  await expect(frame.locator('.rt-science-conditions .rt-science-result')).toHaveCount(4);
  await expect(frame.locator('.rt-science-results .rt-science-result')).toHaveCount(3);
  await expect(frame.locator('.rt-science-provenance')).toBeVisible();
  await expect(frame.locator('.award-rt-geometry')).toContainText('NOT A RADIANCE FIELD');
});

test('A7 desktop fits all nine tabs; narrow legacy navigation retains scroll cues',async({page})=>{
  const {frame}=await openWaterRt(page);
  const nav=frame.locator('.appnav .nav-scroll');
  const metrics=await nav.evaluate(node=>{
    const box=node.getBoundingClientRect();
    const tabs=[...node.querySelectorAll('[role="tab"][data-tab]')];
    return {
      max:node.scrollWidth-node.clientWidth,
      start:document.documentElement.dataset.waterNavStart,
      end:document.documentElement.dataset.waterNavEnd,
      tabCount:tabs.length,
      allVisible:tabs.every(tab=>{
        const bounds=tab.getBoundingClientRect();
        return bounds.left>=box.left-1&&bounds.right<=box.right+1&&
          tab.scrollWidth-tab.clientWidth<=2&&tab.scrollHeight-tab.clientHeight<=2;
      })
    };
  });
  expect(metrics.tabCount).toBe(9);
  if((page.viewportSize()?.width||0)>=1100){
    expect(metrics.max).toBeLessThanOrEqual(2);
    expect(metrics.allVisible).toBe(true);
  }else{
    expect(metrics.max).toBeGreaterThan(0);
    expect(['true','false']).toContain(metrics.start);
    expect(['true','false']).toContain(metrics.end);
  }
});
