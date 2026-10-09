import { test, expect } from '@playwright/test';

async function openProject(page) {
  await page.goto('/lab.html?instrument=project', { waitUntil: 'domcontentloaded' });
  const shell = page.locator('.play-v2-shell[data-play-kind="project"]');
  await expect(shell).toBeVisible({ timeout: 20_000 });
  return shell;
}

async function setSlider(slider, value) {
  await slider.evaluate((input, next) => {
    input.value = String(next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

async function expectFiniteLegibleMap(shell) {
  const geometry = await shell.locator('.project-v2-map').evaluate(svg => {
    const land = svg.querySelector('.project-v2-land');
    const sphere = svg.querySelector('.project-v2-sphere');
    const bbox = land.getBBox();
    const sphereBox = sphere.getBBox();
    const paths = [...svg.querySelectorAll('path')].map(path => path.getAttribute('d') || '');
    return {
      width: bbox.width,
      height: bbox.height,
      sphereWidth: sphereBox.width,
      sphereHeight: sphereBox.height,
      nonemptyPaths: paths.filter(Boolean).length,
      invalidPaths: paths.filter(value => /NaN|Infinity|undefined/.test(value))
    };
  });
  expect(geometry.invalidPaths).toEqual([]);
  expect(geometry.nonemptyPaths).toBeGreaterThanOrEqual(3);
  expect(geometry.width).toBeGreaterThan(300);
  expect(geometry.height).toBeGreaterThan(180);
  expect(geometry.sphereWidth).toBeGreaterThan(320);
  expect(geometry.sphereHeight).toBeGreaterThan(240);
}

test('PROJECT area world remains legible throughout Mercator to Equal Earth on desktop', async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport);
    const shell = await openProject(page);
    await expectFiniteLegibleMap(shell);

    if (viewport.width === 1920) {
      await testInfo.attach('area-mercator-1920', {
        body: await page.screenshot({ animations: 'disabled' }),
        contentType: 'image/png'
      });
    }

    await shell.getByRole('button', { name: 'GREENLAND' }).click();
    const slider = shell.getByRole('slider', { name: 'Projection transformation from Mercator to Equal Earth' });
    for (const value of [0, 25, 50, 75, 100]) {
      await setSlider(slider, value);
      await expectFiniteLegibleMap(shell);
    }
    await expect(shell.locator('.project-v2-apparent-value')).not.toHaveText('—');
    await shell.getByRole('button', { name: 'REVEAL AREA' }).click();
    await expect(shell.locator('.project-v2-panel')).toContainText('INDIA');
    await expectFiniteLegibleMap(shell);
  }
});

test('PROJECT route world and geodesic remain finite through the Tokyo-centered projection', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const shell = await openProject(page);
  await shell.getByRole('button', { name: 'INDIA' }).click();
  const areaSlider = shell.getByRole('slider', { name: 'Projection transformation from Mercator to Equal Earth' });
  await setSlider(areaSlider, 100);
  await shell.getByRole('button', { name: 'REVEAL AREA' }).click();
  await shell.getByRole('button', { name: 'NEXT: ROUTE' }).click();
  await expect(shell).toHaveAttribute('data-play-state', 'routeDrawing');
  await expectFiniteLegibleMap(shell);

  const hit = shell.locator('.project-v2-route-hit');
  await hit.focus();
  await page.keyboard.press('ArrowUp');
  await shell.getByRole('button', { name: 'REVEAL GEODESIC' }).click();
  const slider = shell.getByRole('slider', { name: 'Route projection transformation from Mercator to azimuthal equidistant' });
  for (const value of [0, 25, 50, 75, 100]) {
    await setSlider(slider, value);
    await expectFiniteLegibleMap(shell);
    const geodesic = await shell.locator('.project-v2-geodesic').getAttribute('d');
    expect(geodesic).toBeTruthy();
    expect(geodesic).not.toMatch(/NaN|Infinity|undefined/);
  }
  await testInfo.attach('route-azimuthal-1440', {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png'
  });
  await shell.getByRole('button', { name: 'FINISH' }).click();
  await expect(shell).toHaveAttribute('data-play-state', 'routeResult');
  await expectFiniteLegibleMap(shell);
});
