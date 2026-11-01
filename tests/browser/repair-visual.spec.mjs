import { test, expect } from '@playwright/test';

for (const [name,route] of [['home','/'],['atlas','/atlas.html']]) {
  test(`${name} keeps the shared document design`, async ({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(route,{waitUntil:'domcontentloaded'});
    await expect(page.locator('html')).toHaveAttribute('data-geogeek-boot','ready');
    await page.evaluate(()=>document.fonts.ready);
    await expect(page).toHaveScreenshot(`${name}.png`,{
      animations:'disabled', caret:'hide', maxDiffPixelRatio:.01,
      style:'.bg-field{visibility:hidden!important}',
      mask:[page.locator('.atlas-stage canvas'),page.locator('.atlas-viz svg'),page.locator('.atlas-stage svg')],
    });
  });
}
