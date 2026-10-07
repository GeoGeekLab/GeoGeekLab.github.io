import { test, expect } from '@playwright/test';

test('Water as Spectrum opens as a production Lab observatory instrument', async ({ page }) => {
  await page.goto('/lab.html?instrument=water#l13', { waitUntil:'domcontentloaded' });

  const dialog=page.locator('#instrumentDialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('data-instrument-kind','water');
  await expect(dialog).toHaveAttribute('data-lab-workspace','true');
  await expect(page.locator('#instrumentTitle')).toHaveText('Water as Spectrum');

  await expect(page.locator('.water-lab')).toBeVisible();
  await expect(page.locator('.water-chart')).toHaveCount(3);
  await expect(page.locator('[data-role="a-scale"]')).toContainText('AUTO Y');
  await expect(page.locator('[data-role="bb-scale"]')).toContainText('AUTO Y');
  await expect(page.locator('[data-role="Rrs-scale"]')).toContainText('AUTO Y');
  await expect(page.locator('.water-control-rail')).toBeVisible();
  await expect(page.locator('[data-role="probe-nm"]')).toHaveText('443 nm');
  await expect(page.locator('.water-scene')).toContainText('GLINT PATH · EXCLUDED');
  await expect(page.locator('[data-preset="turbidParticleRich"]')).toHaveText('PARTICLE-RICH');

  const before=await page.locator('[data-role="probe-Rrs"]').textContent();
  await page.locator('[data-preset="cdomRich"]').click();
  await expect(page.locator('[data-output="ag440"]')).toHaveText('0.800 m⁻¹');
  const after=await page.locator('[data-role="probe-Rrs"]').textContent();
  expect(after).not.toBe(before);

  await page.locator('[data-workspace-mode="focus"]').click();
  await expect(page.locator('.water-control-rail')).toBeHidden();
  await expect(page.locator('.water-main')).toBeVisible();

  await page.locator('[data-workspace-mode="inspect"]').click();
  await expect(page.locator('.water-control-rail')).toBeVisible();
  await expect(page.locator('.water-inspect-only')).toBeVisible();
  await expect(page.locator('.water-inspect-only')).toContainText('400–700 nm');
  await expect(page.locator('.water-inspect-only')).toContainText('fixed mean');
  await expect(page.locator('.water-inspect-only')).toContainText('teaching assumption');

  await page.locator('[data-water-mode="iop"]').click();
  await expect(page.locator('.water-lab')).toHaveAttribute('data-mode','iop');

  await page.locator('[data-role="spectrum-panel"]').focus();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(page.locator('[data-role="probe-nm"]')).toHaveText('453 nm');
});

test('Water as Spectrum is listed in Observatory and links to its record', async ({ page }) => {
  await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
  const card=page.locator('#l13');
  await expect(card).toBeVisible();
  await expect(card.locator('h2')).toHaveText('Water as Spectrum');
  await expect(card).toHaveAttribute('data-instrument-kind','water');
  await expect(card.locator('[data-instrument="water"]')).toBeVisible();
  await expect(card.locator('a[data-record-ref="lab:l13"]')).toHaveAttribute('href',/lab-l13\.html/);
});


test('Sensor Observation Layer samples pedagogical TOA reflectance without changing the continuous model', async ({ page }) => {
  await page.goto('/lab.html?instrument=water#l13', { waitUntil:'domcontentloaded' });

  const scene=page.locator('.water-scene');
  const note=page.locator('.water-path-note');
  const sceneBox=await scene.boundingBox();
  const noteBox=await note.boundingBox();
  expect(sceneBox).not.toBeNull();
  expect(noteBox).not.toBeNull();
  expect(noteBox.x).toBeLessThan(sceneBox.x + sceneBox.width * 0.5);

  const continuousBefore=await page.locator('[data-role="probe-Rrs"]').textContent();
  const toaBefore=await page.locator('[data-role="probe-toa"]').textContent();
  await page.locator('[data-water-mode="sensor"]').click();
  await expect(page.locator('.water-lab')).toHaveAttribute('data-mode','sensor');
  await expect(page.locator('.water-sensor-controls')).toBeVisible();
  await expect(page.locator('[data-role="sensor-name"]')).toHaveText('Sentinel-3 OLCI');
  await expect(page.locator('[data-role="sensor-count"]')).toContainText('SAMPLED');
  expect(await page.locator('[data-chart="Rrs"] .water-sensor-sample-dot').count()).toBeGreaterThan(0);

  await page.locator('[data-sensor="s2-msi"]').click();
  await expect(page.locator('[data-role="sensor-name"]')).toHaveText('Sentinel-2A MSI');
  await expect(page.locator('[data-role="sensor-band-list"] button')).toHaveCount(4);
  await expect(page.locator('[data-role="probe-Rrs"]')).toHaveText(continuousBefore);
  await expect(page.locator('[data-role="probe-toa"]')).toHaveText(toaBefore);

  await page.locator('[data-sensor="pace-oci"]').click();
  await expect(page.locator('[data-role="sensor-count"]')).toContainText('60 SAMPLED / 60 SHOWN');
  await expect(page.locator('[data-role="sensor-band-list"] button')).toHaveCount(60);
  await expect(page.locator('[data-role="spectra-hint"]')).toContainText('MEASURED SRF NOT APPLIED');
});


test('Atmosphere layer changes TOA without changing water Rrs', async ({ page }) => {
  await page.goto('/lab.html?instrument=water#l13', { waitUntil:'domcontentloaded' });

  const rrsBefore=await page.locator('[data-role="probe-Rrs"]').textContent();
  const toaBefore=await page.locator('[data-role="probe-toa"]').textContent();

  await page.locator('[data-water-mode="atmosphere"]').click();
  await expect(page.locator('.water-lab')).toHaveAttribute('data-mode','atmosphere');
  await expect(page.locator('.water-atmosphere-controls')).toBeVisible();
  await expect(page.locator('.water-atmosphere-scene')).toBeVisible();
  await expect(page.locator('[data-role="third-title"]')).toHaveText('ρTOA*(λ)');
  await expect(page.locator('[data-role="spectra-hint"]')).toContainText('NOT ATMOSPHERIC CORRECTION');

  await page.locator('[data-atm-control="aot"]').evaluate(node => {
    node.value='0.35';
    node.dispatchEvent(new Event('input',{bubbles:true}));
  });

  await expect(page.locator('[data-role="probe-Rrs"]')).toHaveText(rrsBefore);
  await expect(page.locator('[data-role="probe-toa"]')).not.toHaveText(toaBefore);
  await expect(page.locator('[data-role="atm-fraction"]')).toContainText('ATMOSPHERIC PATH');
  await expect(page.locator('[data-role="causal"]')).toContainText('ρTOA*');

  await page.locator('[data-water-mode="sensor"]').click();
  await expect(page.locator('.water-atmosphere-controls')).toBeVisible();
  await expect(page.locator('.water-sensor-controls')).toBeVisible();
  await expect(page.locator('[data-role="third-title"]')).toHaveText('ρTOA*(λ)');
});


test('Atmospheric correction mode exposes aerosol-assumption error and preserves negative Rrs', async ({ page }) => {
  await page.goto('/lab.html?instrument=water#l13', { waitUntil:'domcontentloaded' });

  await page.locator('[data-water-mode="atmosphere"]').click();
  await page.locator('[data-atm-control="aot"]').evaluate(node => {
    node.value='0.15';
    node.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.locator('[data-atm-control="alpha"]').evaluate(node => {
    node.value='1.0';
    node.dispatchEvent(new Event('input',{bubbles:true}));
  });

  await page.locator('[data-water-mode="correction"]').click();
  await expect(page.locator('.water-lab')).toHaveAttribute('data-mode','correction');
  await expect(page.locator('.water-correction-scene')).toBeVisible();
  await expect(page.locator('.water-correction-controls')).toBeVisible();
  await expect(page.locator('[data-role="third-title"]')).toHaveText('Rrs_est(λ)');
  await expect(page.locator('[data-role="third-subtitle"]')).toContainText('TRUE Rrs DASHED');
  await expect(page.locator('[data-role="corr-negative"]')).toHaveText('0 / 301');

  const rrsTruth=await page.locator('[data-role="probe-Rrs"]').textContent();
  const rrsEstimateMatched=await page.locator('[data-role="probe-Rrs-est"]').textContent();
  expect(rrsEstimateMatched).toBe(rrsTruth);

  await page.locator('[data-corr-control="aot"]').evaluate(node => {
    node.value='0.25';
    node.dispatchEvent(new Event('input',{bubbles:true}));
  });

  await expect(page.locator('[data-correction-match]')).toHaveText('MATCH TRUE');
  await expect(page.locator('[data-role="corr-rmse"]')).not.toHaveText('0 sr⁻¹');
  const negativeText=await page.locator('[data-role="corr-negative"]').textContent();
  expect(Number.parseInt(negativeText,10)).toBeGreaterThan(0);
  await expect(page.locator('[data-role="causal"]')).toContainText('Rrs_est');
  await expect(page.locator('[data-role="spectra-hint"]')).toContainText('NEGATIVE VALUES PRESERVED');

  await page.locator('[data-correction-match]').click();
  await expect(page.locator('[data-correction-match]')).toHaveText('MATCHED');
  await expect(page.locator('[data-role="corr-negative"]')).toHaveText('0 / 301');
  await expect(page.locator('[data-role="probe-Rrs-est"]')).toHaveText(rrsTruth);
});
