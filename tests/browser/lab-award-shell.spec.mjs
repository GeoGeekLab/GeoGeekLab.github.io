import {test,expect} from '@playwright/test';

const fixtures={
  world:'<div class="world-layout"><section class="world-map-wrap">FIELD</section><aside class="world-panel">RAIL</aside></div>',
  figure:'<div class="figure-layout figure-workbench"><section class="figure-stage">FIELD</section><aside class="figure-control">RAIL</aside></div>',
  orbit:'<div class="orbit-v2 orbit-layout"><section class="orbit-stage">FIELD</section><aside class="orbit-panel">RAIL</aside></div>',
  earth:'<div class="earth-layout earth-observation-lab"><section class="earth-observation-canvas">FIELD</section><aside class="earth-observation-panel">RAIL</aside></div>',
  flow:'<div class="flow-lab"><section class="flow-map-shell">FIELD</section><aside class="flow-rail">RAIL</aside></div>',
  pulse:'<div class="pulse-layout pulse-observation-lab"><section class="pulse-map-wrap">FIELD</section><aside class="pulse-panel">RAIL</aside></div>',
  water:'<div class="water-award-fixture">WATER</div>'
};

test.beforeEach(async({page})=>{
  await page.goto('/lab.html?release=20261011v107watercache1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.labAwardShell==='a4');
  await page.waitForFunction(()=>Boolean(document.querySelector('link[data-lab-award-shell]')?.sheet));
});

test('A4 gives every Observatory instrument the same host orientation grammar',async({page})=>{
  for(const [kind,fixture] of Object.entries(fixtures)){
    await page.evaluate(({kind,fixture})=>{
      const dialog=document.getElementById('instrumentDialog');
      document.getElementById('instrumentStage').innerHTML=fixture;
      dialog.dataset.instrumentKind=kind;
      if(!dialog.open) dialog.showModal();
    },{kind,fixture});

    const dialog=page.locator('#instrumentDialog');
    await expect(dialog).toHaveAttribute('data-lab-award-shell','a4');
    const context=page.locator('.instrument-award-context');
    await expect(context).toBeVisible();
    await expect(context.locator('.instrument-award-axis i')).toHaveCount(7);
    await expect(context.locator('.instrument-award-axis i.is-active')).toHaveCount(1);

    const close=page.locator('#instrumentClose');
    const box=await close.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThanOrEqual(43);
    expect(box.width).toBeLessThanOrEqual(45);
    expect(Math.abs(box.width-box.height)).toBeLessThanOrEqual(1);
    const radius=await close.evaluate(node=>parseFloat(getComputedStyle(node).borderTopLeftRadius));
    expect(radius).toBeGreaterThanOrEqual(20);
  }
});

test('A4 context follows existing task state instead of creating a second task system',async({page})=>{
  const dialog=page.locator('#instrumentDialog');

  await page.evaluate(()=>{
    const d=document.getElementById('instrumentDialog');
    d.dataset.instrumentKind='earth';
    d.dataset.workspaceMode='inspect';
    if(!d.open)d.showModal();
  });
  await expect(dialog).toHaveAttribute('data-workspace-mode','inspect');
  await expect(page.locator('.instrument-award-context-mode')).toHaveText('INSPECT');

  await page.evaluate(()=>{
    const d=document.getElementById('instrumentDialog');
    d.dataset.instrumentKind='pulse';
    d.dataset.pulseTask='analyze';
  });
  await expect(dialog).toHaveAttribute('data-pulse-task','analyze');
  await expect(page.locator('.instrument-award-context-mode')).toHaveText('ANALYZE');

  await page.evaluate(()=>{
    const d=document.getElementById('instrumentDialog');
    d.dataset.instrumentKind='water';
    delete d.dataset.workspaceMode;
    delete d.dataset.pulseTask;
  });
  await expect(page.locator('.instrument-award-context')).toContainText('SPECTRAL WATER');
  await expect(page.locator('.instrument-award-context-mode')).toHaveText('INTERNAL WORKSPACE');
});
