import { test, expect } from '@playwright/test';

async function openLight(page) {
  await page.goto('/lab.html?instrument=light', {waitUntil:'domcontentloaded'});
  const shell=page.locator('.play-v2-shell[data-play-kind="light"]');
  await expect(shell).toBeVisible({timeout:20_000});
  return shell;
}

async function chartGeometry(shell) {
  return shell.locator('.light-spectrum').evaluate(svg=>{
    const curve=selector=>[...(svg.querySelector(selector)?.getAttribute('d')||'').matchAll(/[ML][\\d.]+,([\\d.]+)/g)]
      .map(match=>Number(match[1]));
    return {
      before:curve('.light-spectrum-before'),
      after:curve('.light-spectrum-after'),
      domain:Number(svg.dataset.yMax),
      baseline:Number(svg.querySelector('.light-axis')?.getAttribute('y1'))
    };
  });
}

async function expectRemovedSignalAtZero(shell) {
  const value=await chartGeometry(shell);
  expect(value.domain).toBeGreaterThan(0);
  expect(value.before.length).toBeGreaterThan(10);
  expect(value.after).toHaveLength(value.before.length);
  expect(value.before.some(y=>y<value.baseline)).toBe(true);
  expect(value.after.every(y=>y===value.baseline)).toBe(true);
}

test('LIGHT compares removed sky and water paths on a common zero-aligned scale',async({page},testInfo)=>{
  await page.setViewportSize({width:1920,height:1080});
  const shell=await openLight(page);
  const readout=shell.locator('.light-spectrum-readout');
  await expect(readout).toContainText('550 NM · RELATIVE');
  await expect(readout).toContainText('BEFORE');
  await expect(readout).toContainText('AFTER');

  await shell.getByRole('button',{name:'BLACK'}).click();
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await shell.getByRole('button',{name:'REMOVE SCATTERING'}).click();
  await expectRemovedSignalAtZero(shell);
  await expect(shell.locator('.light-after-value')).toHaveText('0.000');
  await testInfo.attach('light-sky-removed-1920', {
    body:await page.screenshot({animations:'disabled'}),
    contentType:'image/png'
  });

  await shell.getByRole('button',{name:'NEXT EXPERIMENT'}).click();
  await expect(readout).toContainText('550 NM · Rrs / sr⁻¹');
  await shell.getByRole('button',{name:'THE SIGNAL COLLAPSES'}).click();
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await shell.getByRole('button',{name:'REMOVE BACKSCATTER'}).click();
  await expectRemovedSignalAtZero(shell);
  await expect(shell.locator('.light-after-value')).toHaveText('0.00e+0');
  await testInfo.attach('light-water-removed-1920', {
    body:await page.screenshot({animations:'disabled'}),
    contentType:'image/png'
  });
});

test('LIGHT keeps surface teaching signal separate from water-leaving Rrs',async({page},testInfo)=>{
  await page.setViewportSize({width:1440,height:900});
  const shell=await openLight(page);
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
  await expectRemovedSignalAtZero(shell);
  await expect(shell).toHaveAttribute('data-water-backscatter','on');
  await expect(shell).toHaveAttribute('data-surface-reflection','off');
  await testInfo.attach('light-surface-removed-1440', {
    body:await page.screenshot({animations:'disabled'}),
    contentType:'image/png'
  });
  await shell.getByRole('button',{name:'FINISH TRACE'}).click();
  await expect(shell).toHaveAttribute('data-play-state','complete');
});
