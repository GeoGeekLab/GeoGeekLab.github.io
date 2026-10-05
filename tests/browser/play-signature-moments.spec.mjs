import { test, expect } from '@playwright/test';

async function openPlay(page, instrument, kind) {
  await page.goto(`/lab.html?instrument=${instrument}`, { waitUntil:'domcontentloaded' });
  const shell=page.locator(`.play-v2-shell[data-play-kind="${kind}"]`);
  await expect(shell).toBeVisible({ timeout:20_000 });
  return shell;
}

async function setRange(locator,value) {
  await locator.evaluate((input,next)=>{
    input.value=String(next);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  },value);
}

test('CONNECT gives the rule change enough time to read before adaptation starts', async ({ page }) => {
  const shell=await openPlay(page,'path','connect');
  for(const name of ['Spain','France','Germany','Poland']) {
    const node=shell.getByRole('button',{name});
    await node.focus();
    await page.keyboard.press('Enter');
  }
  await shell.getByRole('button',{name:'LOCK ROUTE'}).click();
  await shell.getByRole('button',{name:'CHANGE THE RULE'}).click();
  await expect(shell).toHaveAttribute('data-play-state','transforming');
  await expect(shell.locator('.connect-v2-overlay-panel')).toContainText('RULE CHANGE');

  await page.waitForTimeout(1050);
  await expect(shell).toHaveAttribute('data-play-state','transforming');
  await expect(shell).toHaveAttribute('data-play-state','adapting',{timeout:1200});
});

test('PROJECT exposes a live apparent-area consequence while the projection morphs', async ({ page }) => {
  const shell=await openPlay(page,'project','project');
  await shell.getByRole('button',{name:'GREENLAND'}).click();
  const metric=shell.locator('.project-v2-apparent-value');
  const scrubber=shell.locator('.project-v2-scrubber');

  await expect(metric).toBeVisible();
  await expect(shell).toHaveAttribute('data-morph-phase','start');
  const startRatio=Number(await shell.getAttribute('data-apparent-area-ratio'));
  const startText=await metric.textContent();
  expect(startRatio).toBeGreaterThan(0);

  await setRange(scrubber,50);
  await expect(shell).toHaveAttribute('data-morph-phase','moving');
  const midRatio=Number(await shell.getAttribute('data-apparent-area-ratio'));
  const midText=await metric.textContent();
  expect(midRatio).toBeGreaterThan(0);
  expect(midText).not.toBe(startText);

  await setRange(scrubber,100);
  await expect(shell).toHaveAttribute('data-morph-phase','end');
  const endRatio=Number(await shell.getAttribute('data-apparent-area-ratio'));
  const endText=await metric.textContent();
  expect(endRatio).toBeGreaterThan(0);
  expect(endText).not.toBe(midText);
  expect(Math.abs(endRatio-startRatio)).toBeGreaterThan(.05);
});
