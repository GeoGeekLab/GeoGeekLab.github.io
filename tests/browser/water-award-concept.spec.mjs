import {test,expect} from '@playwright/test';

async function openAwardWater(page){
  await page.goto('/lab.html?release=20261011v107watercache1&instrument=water#l13',{waitUntil:'domcontentloaded'});
  await expect(page.locator('iframe.water-v102-frame')).toBeVisible({timeout:45000});
  const frame=page.frameLocator('iframe.water-v102-frame');
  await expect(frame.locator('html')).toHaveAttribute('data-water-award-concept','a2',{timeout:30000});
  return frame;
}

test('Water A2 makes wavelength a visible coordinate without replacing the original probe',async({page})=>{
  const frame=await openAwardWater(page);
  await expect(frame.locator('.award-spectrum-ruler')).toBeVisible();
  await expect(frame.locator('#probeRange')).toBeVisible();

  const probe=(await frame.locator('#probeValue').textContent())?.match(/\d+/)?.[0];
  expect(probe).toBeTruthy();
  await expect(frame.locator('[data-award-spectrum-value]')).toContainText(probe);

  await expect(frame.locator('.p6-reading')).toHaveCount(3);
  await expect(frame.locator('.p6-optics-plots')).toBeVisible();
});

test('Water A2 presents RT selection geometry as geometry, not a solved radiance field',async({page})=>{
  const frame=await openAwardWater(page);
  await frame.locator('#mainNav [data-tab="rt"]').click();

  const geometry=frame.locator('.award-rt-geometry');
  await expect(geometry).toBeVisible();
  await expect(geometry).toContainText('NOT A RADIANCE FIELD');

  const wl=await frame.locator('[data-rt-wl][aria-pressed="true"]').getAttribute('data-rt-wl');
  const depth=await frame.locator('[data-rt-depth][aria-pressed="true"]').getAttribute('data-rt-depth');
  const sun=await frame.locator('[data-rt-sun][aria-pressed="true"]').getAttribute('data-rt-sun');

  await expect(geometry.locator('[data-award-rt-wavelength]')).toContainText(wl);
  await expect(geometry.locator('[data-award-rt-depth]')).toContainText(depth);
  await expect(geometry.locator('[data-award-rt-sun]')).toContainText(sun);

  await expect(frame.locator('.rt-science-provenance')).toBeVisible();
  await expect(frame.locator('.rt-science-status')).toBeVisible();
});
