import {test,expect} from '@playwright/test';

async function openLight(page){
  await page.goto('/lab.html?instrument=light',{waitUntil:'domcontentloaded'});
  const shell=page.locator('.play-v2-shell[data-play-kind="light"]');
  await expect(shell).toBeVisible({timeout:20000});
  return shell;
}

test('Light shows only a desktop guidance notice on narrow viewports and restores the same experiment on desktop',async({page},info)=>{
  test.skip(info.project.name!=='desktop-chromium','Desktop resize contract');
  await page.setViewportSize({width:1366,height:768});
  const shell=await openLight(page);
  const gate=shell.locator('.light-desktop-gate');
  await expect(gate).toBeHidden();
  await expect(shell).toHaveAttribute('data-light-focus','atmosphere');
  await shell.getByRole('button',{name:'BLACK'}).click();
  await expect(shell.getByRole('button',{name:'BLACK'})).toHaveAttribute('aria-pressed','true');

  await page.setViewportSize({width:390,height:844});
  await expect(gate).toBeVisible();
  await expect(gate).toContainText('Open Light on a desktop.');
  await expect(gate).toContainText('请使用电脑浏览器打开相同链接');
  await expect(gate.getByRole('link',{name:/RETURN TO LAB/})).toHaveAttribute('href','/lab.html');
  await expect(shell.locator('.play-v2-overlay')).toBeHidden();
  await expect(shell.locator('.play-v2-viewport')).toBeHidden();
  await expect(shell.locator('.play-v2-hud')).toBeHidden();
  await expect(shell.getByRole('button',{name:'COMMIT PREDICTION'})).toBeHidden();

  await page.setViewportSize({width:1366,height:768});
  await expect(gate).toBeHidden();
  await expect(shell.getByRole('button',{name:'BLACK'})).toHaveAttribute('aria-pressed','true');
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await shell.getByRole('button',{name:'REMOVE SCATTERING'}).click();
  await expect(shell).toHaveAttribute('data-atmospheric-scattering','off');
});

test('Light displays desktop guidance for touch-first mobile and tablet devices',async({page},info)=>{
  test.skip(info.project.name!=='mobile-chromium','Coarse-pointer contract');
  await page.setViewportSize({width:1024,height:768});
  const shell=await openLight(page);
  const coarse=await page.evaluate(()=>matchMedia('(hover:none) and (pointer:coarse)').matches);
  test.skip(!coarse,'This project has no coarse-pointer emulation');
  await expect(shell.locator('.light-desktop-gate')).toBeVisible();
  await expect(shell.locator('.play-v2-overlay')).toBeHidden();
  await expect(shell.locator('.light-desktop-gate-link')).toBeVisible();
});

test('Light emphasizes the path under test and keeps removed paths identifiable',async({page},info)=>{
  test.skip(info.project.name!=='desktop-chromium','Light desktop visualization');
  await page.setViewportSize({width:1440,height:900});
  const shell=await openLight(page);
  await expect(shell).toHaveAttribute('data-light-focus','atmosphere');
  await expect(shell.locator('.light-scene-focus')).toContainText('SCATTERED SKY');
  await expect(shell.locator('.light-evidence-target')).toHaveText('SCATTERED SKY');
  await expect(shell.locator('.light-ray-atmosphere')).toHaveClass(/is-focus/);
  await expect(shell.locator('[data-path="atmosphere"]')).toHaveAttribute('aria-current','step');
  await expect(shell.locator('.light-ray-water')).not.toHaveClass(/is-focus/);

  await shell.getByRole('button',{name:'BLACK'}).click();
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await shell.getByRole('button',{name:'REMOVE SCATTERING'}).click();
  await expect(shell.locator('.light-ray-atmosphere')).toHaveClass(/is-focus.*is-off|is-off.*is-focus/);
  await expect(shell.locator('[data-path="atmosphere"]')).toContainText('REMOVED');
  await expect(shell.locator('[data-path="surface"]')).toContainText('NO SKY SOURCE');
  await expect(shell.locator('.light-scene-summary')).toContainText('has no scattered-sky source');
  await expect(shell.locator('.light-ray-water')).not.toHaveClass(/is-off/);
  // The deleted path stays as an explanatory dashed ghost.
  await expect.poll(async()=>{
    return shell.locator('.light-ray-atmosphere').evaluate(el=>Number(getComputedStyle(el).opacity));
  }).toBeGreaterThan(0.2);
  await shell.getByRole('button',{name:'NEXT EXPERIMENT'}).click();
  await expect(shell).toHaveAttribute('data-light-focus','water');
  await expect(shell.locator('.light-evidence-target')).toHaveText('WATER-LEAVING SIGNAL');
  await expect(shell.locator('.light-ray-water')).toHaveClass(/is-focus/);
  await expect(shell.locator('[data-path="atmosphere"]')).not.toHaveAttribute('aria-current','step');

  await shell.getByRole('button',{name:'THE SIGNAL COLLAPSES'}).click();
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await shell.getByRole('button',{name:'REMOVE BACKSCATTER'}).click();
  await expect(shell.locator('.light-ray-water')).toHaveClass(/is-focus.*is-off|is-off.*is-focus/);
  await shell.getByRole('button',{name:'NEXT EXPERIMENT'}).click();
  await expect(shell).toHaveAttribute('data-light-focus','surface');
  await expect(shell.locator('.light-evidence-target')).toHaveText('SURFACE REFLECTION');
  await expect(shell.locator('[data-path="surface"]')).toHaveAttribute('aria-current','step');
});

test('Light reduced motion preserves visible path status and removes ray transitions',async({page},info)=>{
  test.skip(info.project.name!=='desktop-chromium','Light desktop visualization');
  await page.setViewportSize({width:1366,height:768});
  await page.emulateMedia({reducedMotion:'reduce'});
  const shell=await openLight(page);
  await shell.getByRole('button',{name:'BLACK'}).click();
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await shell.getByRole('button',{name:'REMOVE SCATTERING'}).click();
  await expect(shell.locator('[data-path="atmosphere"]')).toContainText('REMOVED');
  await expect(shell.locator('.light-ray-atmosphere')).toHaveCSS('transition-duration','0s');
});

test('Light only reveals a signed, unit-consistent delta after an intervention',async({page},info)=>{
  test.skip(info.project.name!=='desktop-chromium','Desktop evidence contract');
  await page.setViewportSize({width:1440,height:900});
  const shell=await openLight(page);
  const delta=shell.locator('.light-change-readout');
  await expect(delta).toBeHidden();
  await shell.getByRole('button',{name:'BLACK'}).click();
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await expect(delta).toBeHidden();
  await shell.getByRole('button',{name:'REMOVE SCATTERING'}).click();
  await expect(delta).toBeVisible();
  await expect(delta).toContainText('Δ AFTER − BEFORE');
  const before=Number(await shell.locator('.light-before-value').innerText());
  const after=Number(await shell.locator('.light-after-value').innerText());
  const difference=Number(await shell.locator('.light-change-value').innerText());
  expect(difference).toBeCloseTo(after-before,3);
  expect(difference).toBeLessThan(0);
  await shell.getByRole('button',{name:'NEXT EXPERIMENT'}).click();
  await expect(delta).toBeHidden();
});
