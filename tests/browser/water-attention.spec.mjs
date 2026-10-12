import {test,expect} from '@playwright/test';

async function openWater(page) {
  await page.goto('/lab.html?release=20261011v107watercache1&instrument=water#l13',{
    waitUntil:'domcontentloaded'
  });
  await expect(page.locator('iframe.water-v102-frame')).toBeVisible({timeout:45000});
  const frame=page.frameLocator('iframe.water-v102-frame');
  await expect(frame.locator('html')).toHaveAttribute('data-water-attention','focus',{timeout:30000});
  await expect(frame.locator('.water-attention-switch')).toBeVisible();
  await frame.locator('#mainNav [data-tab="rt"]').click();
  await expect(frame.locator('.rt-science-view .rt-science-plot-grid')).toBeVisible({timeout:30000});
  return frame;
}

test('Focus shows sampled RT charts before supplementary metrics while keeping warnings',async({page},testInfo)=>{
  const frame=await openWater(page);
  await expect(frame.locator('.water-scope-boundary')).toContainText('Not externally validated');
  await expect(frame.locator('.rt-science-status')).toBeVisible();
  await expect(frame.locator('.rt-science-status')).toContainText('reference');
  await expect(frame.locator('.rt-science-hero')).toBeHidden();
  await expect(frame.locator('[data-attention-mode="focus"]')).toHaveAttribute('aria-pressed','true');
  await expect(frame.locator('[data-attention-mode="detail"]')).toHaveAttribute('aria-pressed','false');

  const y=await frame.locator('.rt-science-workspace').evaluate(node=>{
    const position=selector=>node.querySelector(selector).getBoundingClientRect().top;
    return {
      status:position('.rt-science-status'),
      view:position('.rt-science-view'),
      conditions:position('.rt-science-conditions'),
      plot:position('.rt-science-plot-grid')
    };
  });
  expect(y.status).toBeLessThan(y.plot);
  expect(y.view).toBeLessThan(y.conditions);
  expect(y.plot).toBeLessThan(y.conditions);
  if(testInfo.project.name.includes('desktop')){
    const graph=await frame.locator('.rt-science-plot-grid .rt-science-plot').first().boundingBox();
    expect(graph).not.toBeNull();
    // The actual plotted lines, not just a heading, must enter the first view.
    expect(graph.y).toBeLessThan(page.viewportSize().height*0.70);
  }
});

test('Detail exposes geometry without resetting selected RT case or graph data',async({page})=>{
  const frame=await openWater(page);
  const wavelength=frame.locator('[data-rt-wl][aria-pressed="true"]');
  const oldWavelength=await wavelength.getAttribute('data-rt-wl');
  const other=frame.locator('[data-rt-wl]:not([aria-pressed="true"])').first();
  await other.click();
  const chosen=await frame.locator('[data-rt-wl][aria-pressed="true"]').getAttribute('data-rt-wl');
  expect(chosen).not.toBe(oldWavelength);

  await frame.locator('[data-attention-mode="detail"]').click();
  await expect(frame.locator('html')).toHaveAttribute('data-water-attention','detail');
  await expect(frame.locator('.rt-science-hero')).toBeVisible();
  await expect(frame.locator('.award-rt-geometry')).toBeVisible();
  await expect(frame.locator('.rt-science-provenance')).toBeVisible();
  await expect(frame.locator('[data-rt-wl="'+chosen+'"]')).toHaveAttribute('aria-pressed','true');

  await frame.locator('[data-attention-mode="focus"]').focus();
  await page.keyboard.press('Enter');
  await expect(frame.locator('html')).toHaveAttribute('data-water-attention','focus');
  await expect(frame.locator('.rt-science-status')).toBeVisible();
  await expect(frame.locator('[data-rt-wl="'+chosen+'"]')).toHaveAttribute('aria-pressed','true');
  await expect(frame.locator('.rt-science-plot-grid')).toBeVisible();
});

test('Mobile preserves reachable mode controls and complete scientific boundary',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const frame=await openWater(page);
  await expect(frame.locator('[data-attention-mode="focus"]')).toBeVisible();
  await expect(frame.locator('[data-attention-mode="detail"]')).toBeVisible();
  await expect(frame.locator('.water-scope-boundary')).toBeVisible();
  await frame.locator('[data-attention-mode="detail"]').click();
  await expect(frame.locator('.award-rt-geometry')).toBeVisible();
  await frame.locator('[data-attention-mode="focus"]').click();
  await expect(frame.locator('.rt-science-status')).toBeVisible();
});
