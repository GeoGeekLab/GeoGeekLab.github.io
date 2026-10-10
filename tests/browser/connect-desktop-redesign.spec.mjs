import {test,expect} from '@playwright/test';

const SIZES=[{width:1920,height:1080},{width:1440,height:900},{width:1366,height:768}];
const isDesktop=info=>info.project.name==='desktop-chromium';
const node=(shell,id)=>shell.locator('.connect-v2-node').filter({hasText:new RegExp(`^${id}$`)});

async function open(page){
  await page.goto('/lab.html?instrument=path',{waitUntil:'domcontentloaded'});
  const root=page.locator('.play-v2-shell[data-play-kind="connect"]');
  await expect(root).toBeVisible({timeout:20_000});
  await expect(root).toHaveAttribute('data-play-state','planning');
  return root;
}
async function photo(page,info,name){
  await info.attach(name,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
}
async function zones(root){
  const bounds=await root.evaluate(el=>{
    const box=s=>{const r=el.querySelector(s).getBoundingClientRect();return{x:r.left,y:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
    return{layout:getComputedStyle(el).display,left:box('.play-v2-overlay'),map:box('.play-v2-viewport'),right:box('.play-v2-hud'),svg:box('.connect-v2-map')};
  });
  expect(bounds.layout).toBe('grid');
  expect(bounds.left.width).toBeGreaterThan(300);
  expect(bounds.right.width).toBeGreaterThan(307);
  expect(bounds.map.width).toBeGreaterThan(600);
  expect(bounds.left.right).toBeLessThanOrEqual(bounds.map.x+2);
  expect(bounds.map.right).toBeLessThanOrEqual(bounds.right.x+2);
  expect(bounds.svg.x).toBeGreaterThanOrEqual(bounds.map.x-1);
  expect(bounds.svg.right).toBeLessThanOrEqual(bounds.map.right+1);
  await expect(root.locator('.connect-v2-map-heading')).toBeVisible();
  await expect(root.locator('.connect-v2-node-legend')).toBeVisible();
  return bounds;
}
async function route(root,ids){
  for(const id of ids){
    await node(root,id).click();
  }
}

test('CONNECT old route, new network and hop evidence remain spatially separated across three desktop viewports',async({page},info)=>{
  test.skip(!isDesktop(info),'STEP 10 desktop-only visual matrix');
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const size of SIZES){
    await page.setViewportSize(size);
    const root=await open(page);
    await zones(root);
    await expect(root).toHaveAttribute('data-connect-rule','shared-border');
    await expect(root).toHaveAttribute('data-connect-comparison','false');
    await expect(root.locator('.connect-v2-evidence')).toContainText('SHARED LAND BORDER');
    await expect(root.locator('.connect-v2-stat')).toContainText('0 / 5');
    await expect(root.locator('.connect-v2-route-line')).toHaveCount(0);
    await expect(root.locator('.key-original-wrap')).toBeHidden();
    await photo(page,info,`connect-initial-${size.width}`);

    await route(root,['ES','FR','DE','PL']);
    await expect(root).toHaveAttribute('data-play-state','routeReady');
    await expect(root.locator('.connect-v2-stat')).toContainText('4 / 5');
    await photo(page,info,`connect-ready-${size.width}`);
    await root.getByRole('button',{name:'LOCK ROUTE'}).click();
    await expect(root).toHaveAttribute('data-play-state','locked');
    await expect(root.locator('.connect-v2-overlay-panel')).toContainText('4 hops recorded');
    await root.getByRole('button',{name:'CHANGE THE RULE'}).click();
    await expect(root).toHaveAttribute('data-connect-comparison','true');
    await expect(root.locator('.connect-v2-evidence')).toContainText('≤ 1,200 KM GREAT CIRCLE');
    await expect(root.locator('.connect-v2-evidence')).toContainText('ORIGINAL LOCKED / 4 HOPS');
    await expect(root.locator('.connect-v2-edge-deltas')).toBeVisible();
    await expect(root.locator('.connect-v2-route-line.is-ghost')).toHaveCount(4);
    await expect(root.locator('.connect-v2-edge.is-added').first()).toBeVisible();
    // In the authored European graph, every former shared land-border edge is within 1,200 km.
    // No removed edges exist in this scenario; the dashed notation remains an explicit zero-count legend.
    await expect(root.locator('.connect-v2-edge.is-removed')).toHaveCount(0);
    await expect(root.locator('.connect-v2-edge-deltas')).toContainText('−0');
    await expect(root).toHaveAttribute('data-play-state','adapting',{timeout:8000});
    await expect(root.locator('.key-original-wrap')).toBeVisible();
    await expect(root.locator('.key-added-wrap')).toBeVisible();
    await expect(root.locator('.key-removed-wrap')).toBeVisible();
    await zones(root);
    await photo(page,info,`connect-rule-shift-${size.width}`);

    await route(root,['FR','DE','PL']);
    await expect(root).toHaveAttribute('data-play-state','routeReady2');
    await root.getByRole('button',{name:'LOCK ROUTE'}).click();
    await expect(root).toHaveAttribute('data-play-state','result');
    await expect(root.locator('.connect-v2-evidence')).toContainText('BEFORE → AFTER / HOPS');
    await expect(root.locator('.connect-v2-evidence')).toContainText('4 → 3');
    await expect(root.locator('.connect-v2-evidence')).toContainText('OPTIMAL / MINIMUM HOPS');
    await expect(root.locator('.connect-v2-evidence')).toContainText('Current route achieves the shortest');
    await expect(root.locator('.connect-v2-route-line.is-ghost')).toHaveCount(4);
    await expect(root.locator('.connect-v2-route-line:not(.is-ghost)')).toHaveCount(3);
    await zones(root);
    await photo(page,info,`connect-result-${size.width}`);
  }
});

test('CONNECT invalid edge retains the route; SVG keyboard navigation, Undo, lock and replay remain usable',async({page},info)=>{
  test.skip(!isDesktop(info),'STEP 10 desktop input');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:1366,height:768});
  const root=await open(page);
  await node(root,'DE').click();
  await expect(root.locator('.connect-v2-error')).toContainText('NO VALID CONNECTION');
  await expect(root.locator('.connect-v2-error')).toContainText('Route unchanged');
  await expect(root.locator('.connect-v2-route-line')).toHaveCount(0);
  await photo(page,info,'connect-invalid-1366');
  await node(root,'ES').focus();
  await page.keyboard.press('Enter');
  await expect(root.locator('.connect-v2-stat')).toContainText('1 / 5');
  await expect(node(root,'ES')).toHaveClass(/is-current/);
  await node(root,'FR').click();
  await root.getByRole('button',{name:'UNDO'}).click();
  await expect(root.locator('.connect-v2-stat')).toContainText('1 / 5');
  await node(root,'FR').click();
  await node(root,'DE').click();
  await node(root,'PL').click();
  await expect(root).toHaveAttribute('data-play-state','routeReady');
  await root.getByRole('button',{name:'LOCK ROUTE'}).click();
  await expect(root).toHaveAttribute('data-play-state','locked');
  await root.getByRole('button',{name:'CHANGE THE RULE'}).click();
  await expect(root).toHaveAttribute('data-play-state','adapting',{timeout:8000});
  await route(root,['FR','DE','PL']);
  await root.getByRole('button',{name:'LOCK ROUTE'}).click();
  await expect(root).toHaveAttribute('data-play-state','result');
  await root.getByRole('button',{name:'PLAY AGAIN'}).click();
  await expect(root).toHaveAttribute('data-play-state','planning');
  await expect(root.locator('.connect-v2-route-line')).toHaveCount(0);
  await expect(root).toHaveAttribute('data-connect-comparison','false');
  await expect(root.locator('.connect-v2-evidence')).not.toContainText('OPTIMAL / MINIMUM HOPS');
});

test('CONNECT narrow fallback hides desktop annotations while retaining keyboard node access',async({page},info)=>{
  test.skip(!isDesktop(info),'STEP 10 desktop-to-narrow responsive check');
  await page.setViewportSize({width:1366,height:768});
  const root=await open(page);
  await zones(root);
  await page.setViewportSize({width:920,height:780});
  await expect(root).toHaveCSS('display','block');
  await expect(root.locator('.connect-v2-node-legend')).toBeHidden();
  await expect(root.locator('.connect-v2-map-heading')).toBeHidden();
  await expect(root.locator('.connect-v2-map')).toBeVisible();
  await node(root,'ES').focus();
  await page.keyboard.press('Enter');
  await expect(root.locator('.connect-v2-stat')).toContainText('1 / 5');
  await page.setViewportSize({width:1366,height:768});
  await zones(root);
  await expect(root.locator('.connect-v2-stat')).toContainText('1 / 5');
});
