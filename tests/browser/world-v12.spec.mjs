import {test,expect} from '@playwright/test';
const world={type:'FeatureCollection',features:[{type:'Feature',properties:{NAME:'Test Island',CONTINENT:'Test'},geometry:{type:'Polygon',coordinates:[[[-10,-10],[15,-10],[15,10],[-10,10],[-10,-10]]]}}]};
const quakes={type:'FeatureCollection',metadata:{generated:Date.parse('2026-10-09T06:00:00Z')},features:[{type:'Feature',geometry:{type:'Point',coordinates:[0,0,10]},properties:{place:'Test quake',mag:4.2,time:Date.parse('2026-10-09T06:00:00Z')}}]};
async function openWorld(page){
 await page.route('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(world)}));
 await page.route('https://earthquake.usgs.gov/earthquakes/feed/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(quakes)}));
 await page.route('https://eonet.gsfc.nasa.gov/api/v3/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({events:[]})}));
 await page.route('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({coordinates:[[0,60,25]],'Forecast Time':'2026-10-09T07:00:00Z'})}));
 await page.goto('/lab.html?instrument=world#l12',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.world-projection-lab')).toBeVisible({timeout:30000});
}
test('World v12 loads scientific metrics and task presets',async({page})=>{
 await openWorld(page);
 await expect(page.locator('#wMetrics')).toContainText('LOCAL DISTORTION');
 await expect(page.locator('#wMetrics')).toContainText('AREA');
 await expect(page.locator('#wDataNote')).toContainText('SNAPSHOT');
 await page.locator('#wPreset').selectOption('area');
 await expect(page.locator('#wCompareToggle')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#wMetrics .world-metric-row')).toHaveCount(2);
 await expect(page.locator('#wSecondView')).toBeVisible();
 await expect(page.locator('#wSecondLabel')).toContainText('MERCATOR');
 await expect(page.locator('.world-local-anchor')).toHaveCount(2);
});
test('World v12 refresh updates the data layer and exposes source time',async({page})=>{
 await openWorld(page);
 await expect(page.locator('#wDataNote')).toContainText('USGS 2026-10-09 06:00 UTC');
 await page.locator('#wRefresh').click();
 await expect(page.locator('#wRefresh')).toHaveText('REFRESH DATA',{timeout:20000});
 await expect(page.locator('#wLayers')).toContainText('Earthquakes');
 await expect(page.locator('#wDataNote')).toContainText('NOAA 2026-10-09 07:00 UTC');
});
