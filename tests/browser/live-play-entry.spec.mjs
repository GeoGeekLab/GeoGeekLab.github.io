import { test, expect } from '@playwright/test';

const LIVE='https://geogeeklab.github.io/lab.html';
const plays=[
  ['locate','orient'],
  ['zone','bound'],
  ['path','connect'],
  ['project','project'],
  ['light','light']
];

test('public Lab opens every Play from the collection click path', async ({page}) => {
  const consoleErrors=[];
  const pageErrors=[];
  const failedRequests=[];
  page.on('console', msg => {
    if (msg.type()==='error' || msg.type()==='warning') consoleErrors.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
  page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'failed'}`));

  await page.goto(`${LIVE}?livePlayProbe=1`, {waitUntil:'domcontentloaded', timeout:30_000});
  await page.waitForFunction(() => Boolean(window.GeoModules?.__geoSpatialPlayRuntime) && document.querySelectorAll('.lab-group-play .project-card [data-instrument]').length >= 5, null, {timeout:20_000});

  const runtime = await page.evaluate(() => ({
    geoModules: Boolean(window.GeoModules),
    playRuntime: Boolean(window.GeoModules?.__geoSpatialPlayRuntime),
    geoInstruments: Boolean(window.GeoInstruments),
    readyState: document.readyState,
    playCards: [...document.querySelectorAll('.lab-group-play .project-card')].map(card => ({
      id: card.id,
      kind: card.querySelector('[data-instrument]')?.dataset.instrument || '',
      disabled: Boolean(card.querySelector('[data-instrument]')?.disabled)
    }))
  }));

  expect(new Set(runtime.playCards.map(item=>item.kind))).toEqual(new Set(plays.map(([kind])=>kind)));
  expect(runtime.geoModules).toBeTruthy();
  expect(runtime.playRuntime).toBeTruthy();

  for (const [kind,domKind] of plays) {
    const trigger=page.locator(`[data-instrument="${kind}"]`).first();
    await expect(trigger, `${kind} trigger`).toBeVisible();
    await expect(trigger, `${kind} enabled`).toBeEnabled();
    await trigger.click();

    const dialog=page.locator('#instrumentDialog');
    await expect(dialog, `${kind} dialog`).toHaveAttribute('open','', {timeout:20_000}).catch(async()=>{
      const diag=await page.evaluate((kind)=>({
        kind,
        dialogOpen:document.getElementById('instrumentDialog')?.open,
        stage:document.getElementById('instrumentStage')?.innerHTML?.slice(0,500),
        active:window.GeoInstruments?.getActive?.(),
        runtime:Boolean(window.GeoModules?.__geoSpatialPlayRuntime)
      }),kind);
      throw new Error(`PLAY_CLICK_DIAGNOSTIC ${JSON.stringify({diag,consoleErrors,pageErrors,failedRequests})}`);
    });

    const mounted=page.locator(`.play-shell[data-play-kind="${domKind}"], .play-v2-shell[data-play-kind="${domKind}"]`);
    await expect(mounted, `${kind} shell`).toBeVisible({timeout:20_000}).catch(async()=>{
      const diag=await page.evaluate((kind)=>({
        kind,
        dialogOpen:document.getElementById('instrumentDialog')?.open,
        stage:document.getElementById('instrumentStage')?.innerHTML?.slice(0,1200),
        active:window.GeoInstruments?.getActive?.()
      }),kind);
      throw new Error(`PLAY_MOUNT_DIAGNOSTIC ${JSON.stringify({diag,consoleErrors,pageErrors,failedRequests})}`);
    });

    await page.locator('#instrumentClose').click();
    await expect(dialog).not.toHaveAttribute('open','');
  }

  expect(pageErrors, `page errors: ${pageErrors.join('\n')}`).toEqual([]);
});
