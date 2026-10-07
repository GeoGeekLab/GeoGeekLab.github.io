import { test, expect } from '@playwright/test';

async function openLight(page) {
  await page.goto('/lab.html?instrument=light', { waitUntil:'domcontentloaded' });
  const shell=page.locator('.play-v2-shell[data-play-kind="light"]');
  await expect(shell).toBeVisible({timeout:20_000});
  return shell;
}

test('LIGHT walks through three independent light-path ablations', async ({page}) => {
  const shell=await openLight(page);

  await expect(shell).toContainText('WHY IS THE SKY BLUE?');
  await shell.getByRole('button',{name:'BLACK'}).click();
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await shell.getByRole('button',{name:'REMOVE SCATTERING'}).click();
  await expect(shell).toHaveAttribute('data-atmospheric-scattering','off');
  await expect(shell).toContainText('THE SKY GOES DARK.');
  await shell.getByRole('button',{name:'NEXT EXPERIMENT'}).click();

  await expect(shell).toContainText('WHAT MAKES WATER VISIBLE?');
  await shell.getByRole('button',{name:'THE SIGNAL COLLAPSES'}).click();
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await shell.getByRole('button',{name:'REMOVE BACKSCATTER'}).click();
  await expect(shell).toHaveAttribute('data-water-backscatter','off');
  await expect(shell).toContainText('THE WATER SIGNAL COLLAPSES.');
  await shell.getByRole('button',{name:'NEXT EXPERIMENT'}).click();

  await expect(shell).toContainText('IS THE OCEAN JUST REFLECTED SKY?');
  await shell.getByRole('button',{name:'NO · WATER SIGNAL REMAINS'}).click();
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await shell.getByRole('button',{name:'REMOVE SURFACE REFLECTION'}).click();
  await expect(shell).toHaveAttribute('data-surface-reflection','off');
  await expect(shell).toContainText('REFLECTION DISAPPEARS. WATER REMAINS.');
  await shell.getByRole('button',{name:'FINISH TRACE'}).click();
  await expect(shell).toContainText('ONE COLOR. MULTIPLE PATHS.');
});

test('LIGHT is present in the Play collection', async ({page}) => {
  await page.goto('/lab.html',{waitUntil:'domcontentloaded'});
  const card=page.locator('.project-card').filter({has:page.locator('[data-instrument="light"]')});
  await expect(card).toBeVisible();
  await expect(card).toContainText('Light');
  await expect(card).toContainText('Light · Ocean Color · Mechanism');
  await expect(card.locator('.lab-coord')).toHaveText('source / path / observer');
  await expect(card.locator('[data-instrument="light"]')).toBeVisible();
});
