import {test, expect} from '@playwright/test';

test('Real active-catalog snapshot renders a dense field and readable selected object', async ({page}, testInfo) => {
  test.setTimeout(80_000);
  await page.goto('/lab.html?instrument=orbit#l04', {waitUntil:'domcontentloaded'});
  const catalog=page.locator('#orbitCatalogCount');
  await expect(catalog).toContainText(/OBJECTS/, {timeout:45_000});
  const n=Number((await catalog.textContent()).replace(/[^0-9]/g,''));
  expect(n,'The published snapshot must contain a substantial real orbital catalog').toBeGreaterThan(1000);
  await expect(page.locator('#orbitHudReadout')).toContainText('DRAWN', {timeout:30_000});

  const search=page.locator('#orbitSearch');
  await search.fill('STARLINK');
  await expect(page.locator('[data-search-index]').first()).toBeVisible();
  await page.locator('[data-search-index]').first().click();
  await expect(page.locator('.orbit-selection-bar')).toBeVisible();
  await expect(page.locator('#orbitSelectedName')).toContainText(/STARLINK/i);
  await page.locator('#orbitStageV2').scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);

  const geometry=await page.evaluate(() => {
    const label=document.querySelector('.orbit-object-label');
    if(!label?.classList.contains('is-visible'))return {labelVisible:false,overlap:0};
    const rect=label.getBoundingClientRect();
    const blockers=document.querySelectorAll('.orbit-hud, .orbit-selection-bar, .orbit-enhancement-tools, .orbit-time-dock');
    let overlap=0;
    for(const element of blockers) {
      if(!element.closest('#orbitStageV2'))continue;
      const b=element.getBoundingClientRect();
      overlap+=Math.max(0,Math.min(rect.right,b.right)-Math.max(rect.left,b.left)) *
               Math.max(0,Math.min(rect.bottom,b.bottom)-Math.max(rect.top,b.top));
    }
    return {labelVisible:true,overlap};
  });
  expect(geometry.overlap).toBeLessThan(3);
  await testInfo.attach('orbit-dense-catalog-workspace', {
    body:await page.screenshot({animations:'disabled'}),
    contentType:'image/png',
  });
});
