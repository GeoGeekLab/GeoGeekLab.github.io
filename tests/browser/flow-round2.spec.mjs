import { test, expect } from '@playwright/test';

function windGrid() {
  return Array.from({ length:84 }, (_, i) => ({
    latitude:-60 + Math.floor(i / 12) * 20,
    longitude:-180 + (i % 12) * 30,
    current:{ wind_speed_10m:6, wind_direction_10m:270, time:'2026-10-02T12:00' }
  }));
}

async function openFlow(page) {
  await page.route('https://api.open-meteo.com/**', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(windGrid()) }));
  await page.route('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/**', route => route.fulfill({
    status:200, contentType:'application/json', body:JSON.stringify({ type:'FeatureCollection', features:[] })
  }));
  await page.goto('/lab.html?instrument=flow#l06', { waitUntil:'domcontentloaded' });
  await expect(page.locator('.flow-lab[data-flow-round2="1"]')).toBeVisible({ timeout:10000 });
}

test('Flow round two makes movement grammar, geography and inference boundaries explicit', async ({ page }) => {
  await openFlow(page);
  const dialog = page.locator('#instrumentDialog');
  await expect(dialog).toHaveAttribute('data-workspace-mode', 'work');
  await expect(page.locator('.flow-active-summary')).toContainText('ACTIVE GRAMMAR');
  await expect(page.locator('.flow-active-summary')).toContainText('VELOCITY VECTOR');
  await expect(page.locator('.flow-tabs [data-mode]')).toHaveCount(4);
  await expect(page.locator('.flow-tabs [data-mode="field"]')).toHaveAttribute('role', 'tab');
  await expect(page.locator('.flow-tabs [data-mode="field"]')).toHaveAttribute('aria-selected', 'true');

  const field = page.locator('.flow-tabs [data-mode="field"]');
  await field.focus();
  await field.press('ArrowRight');
  await expect(page.locator('.flow-tabs [data-mode="od"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.flow-active-summary')).toContainText('PLACE PAIRS');
  await expect(page.locator('.flow-active-summary')).toContainText('arc ≠ literal route');
  await expect(page).toHaveURL(/flowMode=od/);
  await expect(page.locator('#flStatus')).toContainText('REFERENCE');
  await expect(page.locator('#instrumentStage')).not.toContainText(/\bDEMO\b/i);

  const source = page.locator('[data-flow-section="source"]');
  await expect(source).toBeHidden();
  await page.locator('[data-flow-jump="source"]').click();
  await expect(dialog).toHaveAttribute('data-workspace-mode', 'inspect');
  await expect(source).toBeVisible();
  await expect(source).toContainText('Plate Carrée');

  await page.locator('.instrument-workspace-modes button[data-workspace-mode="work"]').click();
  await page.locator('[data-flow-geometry="geodesic"]').click();
  await expect(page.locator('[data-flow-geometry="geodesic"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.flow-geo-overlay [data-flow-od]')).not.toHaveCount(0);
  await expect(page).toHaveURL(/flowGeometry=geodesic/);

  await page.locator('.flow-tabs [data-mode="trips"]').click();
  await expect(page.locator('.flow-active-summary')).toContainText('interpolation ≠ additional observation');
  const pacific = page.locator('.flow-geo-overlay [data-flow-trip="0"]');
  await expect(pacific).toBeVisible();
  const d = await pacific.getAttribute('d');
  expect((d?.match(/M/g) || []).length).toBeGreaterThan(1);

  const time = page.locator('#flTripTime');
  const before = Number(await time.inputValue());
  await page.locator('#flTripPlay').click();
  await expect.poll(async () => Number(await time.inputValue()), { timeout:2500 }).not.toBe(before);
  await expect(pacific).toBeVisible();
  await page.locator('#flTripPlay').click();

  await expect(page.locator('#instrumentStage')).not.toContainText(/\bDEMO\b/i);
  await expect(page.locator('.flow-projection-readout')).toContainText('PLATE CARRÉE');
  await expect(page.locator('#instrumentStage')).not.toContainText('Windy');
});

test('Flow round two survives closing and reopening the instrument in the same page', async ({ page }) => {
  await openFlow(page);
  await expect(page.locator('.flow-active-summary')).toHaveCount(1);
  await page.locator('#instrumentClose').click();
  await expect(page.locator('#instrumentDialog')).not.toHaveAttribute('open', '');

  const trigger = page.locator('[data-instrument="flow"]').first();
  await expect(trigger).toBeVisible();
  await trigger.click();

  await expect(page.locator('.flow-lab[data-flow-round2="1"]')).toBeVisible({ timeout:10000 });
  await expect(page.locator('.flow-active-summary')).toHaveCount(1);
  await expect(page.locator('.flow-tabs [data-mode="field"]')).toHaveAttribute('role', 'tab');
});
