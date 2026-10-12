import {test,expect} from '@playwright/test';

async function openAwardWater(page){
  await page.goto('/lab.html?release=20261011v107watercache1&instrument=water#l13',{waitUntil:'domcontentloaded'});
  await expect(page.locator('iframe.water-v102-frame')).toBeVisible({timeout:45000});
  const frame=page.frameLocator('iframe.water-v102-frame');
  await expect(frame.locator('html')).toHaveAttribute('data-water-award-concept','a3',{timeout:30000});
  await expect(frame.locator('html')).toHaveAttribute('data-water-award-optical','a3');
  await expect(frame.locator('html')).toHaveAttribute('data-water-award-journey','a3');
  await expect(frame.locator('html')).toHaveAttribute('data-water-award-polish','a5');
  return frame;
}

test('Water A3 keeps wavelength as a visible coordinate without replacing the original probe',async({page})=>{
  const frame=await openAwardWater(page);
  await expect(frame.locator('.award-spectrum-ruler')).toBeVisible();
  await expect(frame.locator('#probeRange')).toBeVisible();

  const probe=(await frame.locator('#probeValue').textContent())?.match(/\d+/)?.[0];
  expect(probe).toBeTruthy();
  await expect(frame.locator('[data-award-spectrum-value]')).toContainText(probe);

  await expect(frame.locator('.p6-reading')).toHaveCount(3);
  await expect(frame.locator('.p6-optics-plots')).toBeVisible();
});

test('Water A3 presents RT selection geometry as geometry, not a solved radiance field',async({page})=>{
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

test('Water A3 exposes the atmosphere, sensor and correction model topology without replacing science',async({page})=>{
  const frame=await openAwardWater(page);

  await frame.locator('#mainNav [data-tab="atm"]').click();
  let topology=frame.locator('.award-model-topology');
  await expect(topology).toBeVisible();
  await expect(topology).toContainText('FORWARD PATH');
  await expect(topology.locator('[data-node="atmosphere"]')).toHaveClass(/is-active/);
  await expect(frame.locator('.p6b-reading')).toHaveCount(4);
  await expect(frame.locator('#p6b-atmosphere-values > summary')).toBeVisible();

  await frame.locator('#mainNav [data-tab="sensor"]').click();
  topology=frame.locator('.award-model-topology');
  await expect(topology).toBeVisible();
  await expect(topology).toContainText('SRF WEIGHTING');
  await expect(topology.locator('[data-node="sensor"]')).toHaveClass(/is-active/);
  await expect(frame.locator('.p6b-stages')).toBeVisible();
  await expect(frame.locator('#p6b-sensor-table > summary')).toBeVisible();

  await frame.locator('#mainNav [data-tab="ac"]').click();
  topology=frame.locator('.award-model-topology');
  await expect(topology).toBeVisible();
  await expect(topology).toContainText('INVERSE HYPOTHESIS');
  await expect(topology.locator('[data-node="correction"]')).toHaveClass(/is-active/);
  await expect(frame.locator('.p7-metrics')).toBeVisible();
  await expect(frame.locator('#p7-ac-values > summary')).toBeVisible();
  await expect(frame.locator('.p7-no-validation')).toContainText('NOT PERFORMED');
});


test('Water A5 keeps one wavelength identity across ruler, chart and scrubber',async({page})=>{
  const frame=await openAwardWater(page);
  await frame.locator('#mainNav [data-tab="iop"]').click();

  const slider=frame.locator('#probeRange');
  await slider.evaluate(node=>{
    node.value='490';
    node.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await expect(frame.locator('#probeValue')).toContainText('490 nm');

  await expect(frame.locator('[data-award-spectrum-value]')).toContainText('490 nm');

  const probeLine=frame.locator('.p6-spectrum.award-spectrum-primary .graph .probe-line');
  await expect(probeLine).toHaveCount(1);
  const line=await probeLine.evaluate(node=>{
    const style=getComputedStyle(node);
    return {
      x1:parseFloat(node.getAttribute('x1')),
      x2:parseFloat(node.getAttribute('x2')),
      y1:parseFloat(node.getAttribute('y1')),
      y2:parseFloat(node.getAttribute('y2')),
      stroke:style.stroke,
      display:style.display,
      visibility:style.visibility,
      opacity:parseFloat(style.opacity)
    };
  });
  expect(line.x1).toBeCloseTo(line.x2,3);
  expect(Math.abs(line.y2-line.y1)).toBeGreaterThan(40);
  expect(line.stroke).not.toBe('none');
  expect(line.display).not.toBe('none');
  expect(line.visibility).not.toBe('hidden');
  expect(line.opacity).toBeGreaterThan(0);

  await expect(frame.locator('.p6-spectrum.award-spectrum-primary .graph .active-dot')).toBeVisible();

  const visual=await slider.evaluate(node=>{
    const style=getComputedStyle(node);
    return {background:style.backgroundImage,borderRadius:style.borderRadius};
  });
  expect(visual.background).toContain('linear-gradient');
  expect(parseFloat(visual.borderRadius)).toBeLessThanOrEqual(1);
});
