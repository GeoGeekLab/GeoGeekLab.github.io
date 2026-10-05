import { test, expect } from '@playwright/test';

test('ORIENT presentation gives the spatial field the full shell instead of a fixed right console', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('geogeek.orient.primer.v1', JSON.stringify({ version:'orient-primer-1', seen:true }));
  });
  await page.goto('/lab.html?instrument=locate', { waitUntil:'domcontentloaded' });
  const shell=page.locator('.play-shell[data-play-kind="orient"]');
  await expect(shell).toBeVisible({ timeout:20_000 });
  await expect(shell).toHaveAttribute('data-play-state','judge',{ timeout:8_000 });

  const field=shell.locator('.play-field');
  const consoleNode=shell.locator('.play-console');
  const map=shell.locator('.orient-map:not(.orient-primer-map)');
  await expect(map).toBeVisible();

  const layout=await shell.evaluate(root=>{
    const field=root.querySelector('.play-field');
    const consoleNode=root.querySelector('.play-console');
    const head=root.querySelector('.play-console-head');
    const shellRect=root.getBoundingClientRect();
    const fieldRect=field.getBoundingClientRect();
    const consoleRect=consoleNode.getBoundingClientRect();
    return {
      shellWidth:shellRect.width,
      fieldWidth:fieldRect.width,
      consoleWidth:consoleRect.width,
      consolePosition:getComputedStyle(consoleNode).position,
      consoleBackground:getComputedStyle(consoleNode).backgroundColor,
      headDisplay:getComputedStyle(head).display
    };
  });

  expect(layout.fieldWidth).toBeGreaterThan(layout.shellWidth*.9);
  expect(layout.consoleWidth).toBeGreaterThan(layout.shellWidth*.9);
  expect(layout.consolePosition).toBe('absolute');
  expect(layout.headDisplay).toBe('none');
  await expect(field).toBeVisible();
  await expect(consoleNode).toBeVisible();
});
