import { test, expect } from '@playwright/test';

const records = [
  ['l04', 'Orbital Commons', 'CelesTrak active', 'Orbital Commons source'],
  ['l05', 'Earth in Change', 'MODIS / Terra', 'NASA GIBS'],
  ['l06', 'Geographic Flow Laboratory', 'Open-Meteo', 'Geographic Flow Laboratory instrument notes'],
  ['l10', 'Earth Pulse', 'USGS all_day GeoJSON', 'USGS GeoJSON feeds'],
  ['l11', 'Image → Trace', 'Browser raster', 'Image to Trace instrument notes'],
  ['l12', 'World as Relation', 'Natural Earth 1:110m', 'Natural Earth']
];

for (const [id, title, condition, bodyMarker] of records) {
  test(`${id} keeps persistent instrument context on the record page`, async ({ page }) => {
    await page.goto(`/records/lab-${id}.html`, { waitUntil:'domcontentloaded' });

    await expect(page.locator('#recordTitle')).toHaveText(title);
    await expect(page.locator('#recordDetailLabel')).toHaveText('INSTRUMENT NOTES');
    await expect(page.locator('#recordMeta')).toContainText(condition);
    await expect(page.locator('.lab-record-detail')).toBeVisible();
    await expect(page.locator('#recordBody')).toContainText(bodyMarker);
    await expect(page.locator('.lab-record-facts')).toBeVisible();
  });
}
