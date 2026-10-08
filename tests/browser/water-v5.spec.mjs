import { test, expect } from '@playwright/test';

test('Water V5 loads as an interactive iframe with all six model workspaces', async ({page}) => {
  await page.goto('/lab.html?instrument=water#l13', {waitUntil:'domcontentloaded'});
  const dialog=page.locator('#instrumentDialog');
  await expect(dialog).toBeVisible({timeout:25_000});
  await expect(dialog).toHaveAttribute('data-instrument-kind','water');
  const frame=page.locator('#instrumentStage iframe.water-v5-frame');
  await expect(frame).toBeVisible({timeout:25_000});
  const inner=page.frameLocator('#instrumentStage iframe.water-v5-frame');
  const tabs=inner.locator('#mainNav [data-tab]');
  await expect(tabs).toHaveCount(6,{timeout:25_000});
  for(const name of ['path','iop','atm','sensor','ac','compare']){
    const tab=inner.locator('#mainNav [data-tab="'+name+'"]');
    await expect(tab).toBeVisible();
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected','true');
  }
  await page.locator('#instrumentClose').click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('#instrumentStage iframe.water-v5-frame')).toHaveCount(0);
});

test('Water V5 remains usable in narrow mobile viewports', async ({page}) => {
  await page.setViewportSize({width:390,height:780});
  await page.goto('/lab.html?instrument=water#l13', {waitUntil:'domcontentloaded'});
  const frame=page.frameLocator('#instrumentStage iframe.water-v5-frame');
  await expect(frame.locator('#mainNav [data-tab]')).toHaveCount(6,{timeout:25_000});
  await frame.locator('#mainNav [data-tab="iop"]').click();
  await expect(frame.locator('#mainNav [data-tab="iop"]')).toHaveAttribute('aria-selected','true');
});
