import {test,expect} from '@playwright/test';

const desktopSizes=[{width:1920,height:1080},{width:1440,height:900},{width:1366,height:768}];
const desktopOnly=info=>test.skip(info.project.name!=='desktop-chromium','Light desktop acceptance');

async function openLight(page,size){
  await page.setViewportSize(size);
  await page.goto('/lab.html?instrument=light',{waitUntil:'domcontentloaded'});
  const shell=page.locator('.play-v2-shell[data-play-kind="light"]');
  await expect(shell).toBeVisible({timeout:20000});
  await expect(shell).toHaveAttribute('data-play-state','question');
  return shell;
}

async function checkSeparated(shell){
  const g=await shell.evaluate(root=>{
    const box=selector=>{
      const r=root.querySelector(selector).getBoundingClientRect();
      return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
    };
    const hud=root.querySelector('.play-v2-hud');
    return {
      display:getComputedStyle(root).display,
      task:box('.play-v2-overlay'),canvas:box('.play-v2-viewport'),
      evidence:box('.play-v2-hud'),header:box('.play-v2-header'),
      metrics:box('.light-spectrum-readout'),
      legendInEvidence:hud.contains(root.querySelector('.light-path-legend')),
      spectrumInEvidence:hud.contains(root.querySelector('.light-spectrum-card')),
      yMax:Number(root.querySelector('.light-spectrum').dataset.yMax)
    };
  });
  expect(g.display).toBe('grid');
  expect(g.task.width).toBeGreaterThanOrEqual(295);
  expect(g.canvas.width).toBeGreaterThan(600);
  expect(g.evidence.width).toBeGreaterThanOrEqual(295);
  expect(g.task.right).toBeLessThanOrEqual(g.canvas.x+2);
  expect(g.canvas.right).toBeLessThanOrEqual(g.evidence.x+2);
  expect(g.task.y).toBeGreaterThanOrEqual(g.header.bottom+0);
  expect(g.canvas.height).toBeGreaterThan(400);
  expect(g.legendInEvidence).toBe(true);
  expect(g.spectrumInEvidence).toBe(true);
  expect(g.metrics.bottom).toBeLessThanOrEqual(g.evidence.bottom+2);
  expect(g.yMax).toBeGreaterThan(0);
}

async function capture(page,info,label,size){
  await info.attach(`light-${label}-${size.width}`,{
    body:await page.screenshot({animations:'disabled'}),
    contentType:'image/png'
  });
}

test('LIGHT keeps task, optical scene, legend, chart and readouts in separate desktop zones',async({page},info)=>{
  desktopOnly(info);
  for(const size of desktopSizes){
    const shell=await openLight(page,size);
    await checkSeparated(shell);
    await expect(shell.locator('[data-path="atmosphere"]')).toContainText('PRESENT');
    await expect(shell.locator('.light-spectrum-probe')).toHaveText('550 NM · RELATIVE');
    await capture(page,info,'prediction',size);

    const black=shell.getByRole('button',{name:'BLACK'});
    await black.focus();
    expect(await black.evaluate(el=>getComputedStyle(el).outlineWidth)).toBe('2px');
    await page.keyboard.press('Enter');
    await expect(black).toHaveAttribute('aria-pressed','true');
    // The mouse target must not oscillate under hover in the narrowest desktop layout.
    await black.hover();
    await expect(black).toHaveCSS('transform','none');
    await black.click();
    await expect(black).toHaveAttribute('aria-pressed','true');
    await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
    await expect(shell.locator('[data-path="atmosphere"]')).toContainText('PRESENT');
    await shell.getByRole('button',{name:'REMOVE SCATTERING'}).click();
    await expect(shell).toHaveAttribute('data-atmospheric-scattering','off');
    await expect(shell.locator('[data-path="atmosphere"]')).toContainText('REMOVED');
    await expect(shell.locator('[data-path="water"]')).toContainText('PRESENT');
    await expect(shell.locator('.light-after-value')).toHaveText('0.000');
    await checkSeparated(shell);
    await capture(page,info,'sky-removed',size);

    await shell.getByRole('button',{name:'NEXT EXPERIMENT'}).click();
    await expect(shell.locator('.light-spectrum-probe')).toHaveText('550 NM · Rrs / sr⁻¹');
    await shell.getByRole('button',{name:'THE SIGNAL COLLAPSES'}).click();
    await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
    await shell.getByRole('button',{name:'REMOVE BACKSCATTER'}).click();
    await expect(shell.locator('[data-path="water"]')).toContainText('REMOVED');
    await expect(shell.locator('.light-after-value')).toHaveText('0.00e+0');
    await checkSeparated(shell);
    await capture(page,info,'water-removed',size);
  }
});

test('LIGHT keeps surface teaching signal separate and completes without masking the scene',async({page},info)=>{
  desktopOnly(info);
  const size=desktopSizes[2],shell=await openLight(page,size);
  await shell.getByRole('button',{name:'BLACK'}).click();
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await shell.getByRole('button',{name:'REMOVE SCATTERING'}).click();
  await shell.getByRole('button',{name:'NEXT EXPERIMENT'}).click();
  await shell.getByRole('button',{name:'THE SIGNAL COLLAPSES'}).click();
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await shell.getByRole('button',{name:'REMOVE BACKSCATTER'}).click();
  await shell.getByRole('button',{name:'NEXT EXPERIMENT'}).click();
  await expect(shell.locator('.light-spectrum-mode')).toHaveText('SKY-REFLECTION PATH / RELATIVE');
  await expect(shell.locator('.light-spectrum-probe')).toHaveText('550 NM · RELATIVE');
  await shell.getByRole('button',{name:'NO · WATER SIGNAL REMAINS'}).click();
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await shell.getByRole('button',{name:'REMOVE SURFACE REFLECTION'}).click();
  await expect(shell).toHaveAttribute('data-water-backscatter','on');
  await expect(shell).toHaveAttribute('data-surface-reflection','off');
  await expect(shell.locator('[data-path="surface"]')).toContainText('REMOVED');
  await expect(shell.locator('[data-path="water"]')).toContainText('PRESENT');
  await checkSeparated(shell);
  await capture(page,info,'surface-removed',size);
  await shell.getByRole('button',{name:'FINISH TRACE'}).click();
  await expect(shell).toHaveAttribute('data-play-state','complete');
  await checkSeparated(shell);
  await expect(shell.getByRole('button',{name:'PLAY AGAIN'})).toBeVisible();
  await shell.getByRole('button',{name:'PLAY AGAIN'}).click();
  await expect(shell).toHaveAttribute('data-play-state','question');
});

test('LIGHT restores the legacy narrow composition when a viewport crosses the desktop threshold',async({page},info)=>{
  desktopOnly(info);
  const shell=await openLight(page,desktopSizes[2]);
  await checkSeparated(shell);
  await page.setViewportSize({width:920,height:850});
  await expect(shell.locator('.light-world .light-path-legend')).toHaveCount(1);
  await expect(shell.locator('.light-stage > .light-spectrum-card')).toHaveCount(1);
  await page.setViewportSize(desktopSizes[2]);
  await checkSeparated(shell);
});
