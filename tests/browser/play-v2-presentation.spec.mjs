import { test, expect } from '@playwright/test';

// STEP 09 updates the former full-canvas/absolute-overlay presentation contract.
// On desktop, the field must be unobstructed between task and evidence rails;
// below the desktop breakpoint, the original overlay presentation remains.
test('ORIENT keeps the reference globe unobstructed between task and evidence rails on desktop, with narrow fallback', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('geogeek.orient.primer.v1', JSON.stringify({ version:'orient-primer-1', seen:true }));
  });
  await page.goto('/lab.html?instrument=locate', { waitUntil:'domcontentloaded' });
  const shell=page.locator('.play-shell[data-play-kind="orient"]');
  await expect(shell).toBeVisible({ timeout:20_000 });
  await expect(shell).toHaveAttribute('data-play-state','judge',{ timeout:8_000 });
  const map=shell.locator('svg.orient-map:not(.orient-primer-map)');
  await expect(map).toBeVisible();
  const layout=await shell.evaluate(root=>{
    const box=s=>{const r=root.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
    const consoleNode=root.querySelector('.play-console');
    return {
      shell:{width:root.getBoundingClientRect().width},
      field:box('.play-field'),map:box('.orient-map'),
      task:box('.play-task'),actions:box('.play-actions'),
      evidence:box('.play-conditions'),
      console:box('.play-console'),
      rootDisplay:getComputedStyle(root).display,
      consoleDisplay:getComputedStyle(consoleNode).display,
      consolePosition:getComputedStyle(consoleNode).position,
      headDisplay:getComputedStyle(root.querySelector('.play-console-head')).display
    };
  });
  if (testInfo.project.name==='mobile-chromium') {
    expect(layout.field.width).toBeGreaterThan(layout.shell.width*.9);
    expect(layout.consolePosition).toBe('absolute');
    await expect(shell.locator('.orient-desktop-head')).toBeHidden();
    return;
  }
  expect(layout.rootDisplay).toBe('grid');
  expect(layout.consoleDisplay).toBe('contents');
  expect(layout.field.width).toBeGreaterThan(580);
  expect(layout.task.width).toBeGreaterThan(300);
  expect(layout.evidence.width).toBeGreaterThanOrEqual(300);
  expect(layout.task.right).toBeLessThanOrEqual(layout.field.left+2);
  expect(layout.field.right).toBeLessThanOrEqual(layout.evidence.left+2);
  expect(layout.actions.right).toBeLessThanOrEqual(layout.field.left+2);
  expect(layout.map.left).toBeGreaterThan(layout.field.left);
  expect(layout.map.right).toBeLessThan(layout.field.right);
  expect(layout.map.top).toBeGreaterThan(layout.field.top);
  expect(layout.map.bottom).toBeLessThan(layout.field.bottom);
  expect(layout.headDisplay).toBe('none');
  await expect(shell.locator('.orient-desktop-head')).toBeVisible();
  await expect(shell.locator('.orient-legend-truth')).toBeHidden();
  await expect(shell.locator('.orient-truth')).toHaveCount(0);
  await expect(shell.locator('.orient-target')).toHaveCount(0);
  await expect(shell.locator('.play-conditions')).toContainText('REFERENCE');
});
