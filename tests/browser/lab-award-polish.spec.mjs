import {test,expect} from '@playwright/test';

test('A5 host polish follows A4 shell state and preserves the validated exit',async({page})=>{
  await page.goto('/lab.html?release=20261011v107watercache1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.labAwardPolish==='a5');

  await page.evaluate(()=>{
    const dialog=document.getElementById('instrumentDialog');
    dialog.dataset.instrumentKind='earth';
    dialog.dataset.workspaceMode='work';
    document.getElementById('instrumentStage').innerHTML=
      '<div class="earth-layout earth-observation-lab"><section class="earth-observation-canvas">FIELD</section><aside class="earth-observation-panel">RAIL</aside></div>';
    dialog.showModal();
  });

  const dialog=page.locator('#instrumentDialog');
  await expect(dialog).toHaveAttribute('data-lab-award-shell','a4');
  await expect(dialog).toHaveAttribute('data-lab-award-polish','a5');

  const close=page.locator('#instrumentClose');
  const box=await close.boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBeGreaterThanOrEqual(43);
  expect(box.height).toBeGreaterThanOrEqual(43);

  await page.locator('[data-workspace-mode="inspect"]').click();
  await expect(dialog).toHaveAttribute('data-workspace-mode','inspect');
  await expect(page.locator('.instrument-award-context-mode')).toHaveText('INSPECT');
});

test('A5 keeps Observatory orientation at tablet width without exposing it on mobile',async({page})=>{
  await page.setViewportSize({width:900,height:900});
  await page.goto('/lab.html?release=20261011v107watercache1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.labAwardPolish==='a5');

  await page.evaluate(()=>{
    const dialog=document.getElementById('instrumentDialog');
    dialog.dataset.instrumentKind='pulse';
    dialog.dataset.pulseTask='observe';
    document.getElementById('instrumentStage').innerHTML=
      '<div class="pulse-layout pulse-observation-lab"><section class="pulse-map-wrap">FIELD</section><aside class="pulse-panel">RAIL</aside></div>';
    dialog.showModal();
  });

  await expect(page.locator('.instrument-award-context')).toBeVisible();
  await expect(page.locator('.instrument-award-context')).toContainText('OBSERVATORY · 04');

  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.instrument-award-context')).toBeHidden();
});
