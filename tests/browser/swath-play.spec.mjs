import {test,expect} from '@playwright/test';

async function openSwath(page){
  await page.goto('/lab.html?instrument=swath',{waitUntil:'domcontentloaded'});
  const shell=page.locator('.play-v2-shell[data-play-kind="swath"]');
  await expect(shell).toBeVisible({timeout:20_000});
  return shell;
}

test('SWATH walks through three sensor-geometry tradeoffs',async({page})=>{
  const shell=await openSwath(page);

  await expect(shell).toContainText('SEE MORE OR SEE BETTER?');
  await shell.getByRole('button',{name:'MORE GROUND · COARSER PIXELS'}).click();
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await shell.getByRole('button',{name:'WIDEN FOV'}).click();
  await expect(shell).toHaveAttribute('data-fov','30');
  await expect(shell).toHaveAttribute('data-compare','on');
  await expect(shell.locator('.swath-before-footprint')).not.toHaveAttribute('d','');
  await shell.getByRole('button',{name:'NEXT EXPERIMENT'}).click();

  await shell.getByRole('button',{name:'WIDER · COARSER'}).click();
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await shell.getByRole('button',{name:'RAISE ORBIT'}).click();
  await expect(shell).toHaveAttribute('data-altitude','900');
  await shell.getByRole('button',{name:'NEXT EXPERIMENT'}).click();

  await shell.getByRole('button',{name:'SAME SWATH · SHARPER'}).click();
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await shell.getByRole('button',{name:'ADD SAMPLES'}).click();
  await expect(shell).toHaveAttribute('data-detector-pixels','12000');
  const denseSamples=Number(await shell.locator('.swath-pixels').getAttribute('data-visual-samples'));
  expect(denseSamples).toBeGreaterThan(20);

  await shell.getByRole('button',{name:'OPEN SENSOR DESIGN'}).click();
  await expect(shell).toContainText('DESIGN A SENSOR');

  const fov=shell.locator('[data-free="fovDeg"]');
  await fov.focus();
  await fov.press('ArrowRight');
  await expect(fov).toBeFocused();
  await expect(shell).toHaveAttribute('data-fov','21');

  await shell.getByRole('button',{name:'RESET SENSOR'}).click();
  await expect(shell).toHaveAttribute('data-altitude','600');
  await expect(shell).toHaveAttribute('data-fov','20');
  await expect(shell).toHaveAttribute('data-detector-pixels','6000');
});

test('SWATH appears in the Observatory collection',async({page})=>{
  await page.goto('/lab.html',{waitUntil:'domcontentloaded'});
  const card=page.locator('#l16');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Swath');
  await expect(card).toContainText('Instrument');
  await expect(card.locator('[data-instrument="swath"]')).toBeVisible();
  await expect(card.locator('.lab-coord')).toHaveText('altitude / FOV / GSD');
  await expect(card.locator('.preview-swath')).toBeVisible();
});
