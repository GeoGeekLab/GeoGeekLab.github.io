import {test,expect} from '@playwright/test';

const kinds=['orbit','earth','flow','pulse','figure','world','water'];

test.beforeEach(async({page})=>{
  await page.goto('/lab.html?release=20261011v107watercache1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.labAwardShell==='a4');
  await page.waitForFunction(()=>Boolean(document.querySelector('link[data-lab-award-shell]')?.sheet));
});

test('A4 gives every Observatory instrument the same host orientation grammar',async({page})=>{
  for(const kind of kinds){
    await page.evaluate(kind=>{
      const dialog=document.getElementById('instrumentDialog');
      dialog.dataset.instrumentKind=kind;
    },kind);

    const dialog=page.locator('#instrumentDialog');
    await expect(dialog).toHaveAttribute('data-lab-award-shell','a4');

    const context=page.locator('.instrument-award-context');
    await expect(context).toHaveAttribute('data-instrument-kind',kind);
    await expect(context).toContainText('OBSERVATORY');
    await expect(context.locator('.instrument-award-axis i')).toHaveCount(7);
    await expect(context.locator('.instrument-award-axis i.is-active')).toHaveCount(1);
  }

  const close=page.locator('#instrumentClose');
  const geometry=await close.evaluate(node=>{
    const style=getComputedStyle(node);
    return {
      width:parseFloat(style.width),
      height:parseFloat(style.height),
      radius:parseFloat(style.borderTopLeftRadius)
    };
  });
  expect(geometry.width).toBeGreaterThanOrEqual(43);
  expect(geometry.width).toBeLessThanOrEqual(45);
  expect(Math.abs(geometry.width-geometry.height)).toBeLessThanOrEqual(1);
  expect(geometry.radius).toBeGreaterThanOrEqual(20);
});

test('A4 context follows existing task state instead of creating a second task system',async({page})=>{
  const dialog=page.locator('#instrumentDialog');

  await page.evaluate(()=>{
    const d=document.getElementById('instrumentDialog');
    d.dataset.instrumentKind='earth';
    d.dataset.workspaceMode='inspect';
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
