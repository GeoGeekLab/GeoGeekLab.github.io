import {test, expect} from '@playwright/test';

const desktop=[
  {width:1920,height:1080},
  {width:1440,height:900},
  {width:1366,height:768}
];

const desktopOnly=info=>test.skip(info.project.name!=='desktop-chromium','Project is a desktop workspace');

async function openProject(page,size) {
  await page.setViewportSize(size);
  await page.goto('/lab.html?instrument=project',{waitUntil:'domcontentloaded'});
  const shell=page.locator('.play-v2-shell[data-play-kind="project"]');
  await expect(shell).toBeVisible({timeout:20000});
  await expect(shell).toHaveAttribute('data-play-state','predicting');
  return shell;
}
async function scrub(locator,n) {
  await locator.evaluate((input,value)=>{
    input.value=String(value);
    input.dispatchEvent(new Event('input',{bubbles:true}));
  },n);
}
async function geometry(shell) {
  return shell.evaluate(root=>{
    const rect=selector=>{
      const node=root.querySelector(selector);
      if(!node) return null;
      const {x,y,width,height}=node.getBoundingClientRect();
      return {x,y,width,height,right:x+width,bottom:y+height,
        scrollHeight:node.scrollHeight,clientHeight:node.clientHeight};
    };
    return {
      root:rect('.play-v2-shell'),
      panel:rect('.play-v2-overlay'),
      map:rect('.play-v2-viewport'),
      evidence:rect('.play-v2-hud'),
      header:rect('.play-v2-header'),
      position:getComputedStyle(root).display,
      background:getComputedStyle(root).backgroundColor
    };
  });
}
async function requireSeparatedColumns(shell) {
  const g=await geometry(shell);
  expect(g.position).toBe('grid');
  expect(g.panel.width).toBeGreaterThanOrEqual(295);
  expect(g.map.width).toBeGreaterThan(600);
  expect(g.evidence.width).toBeGreaterThanOrEqual(240);
  expect(g.panel.right).toBeLessThanOrEqual(g.map.x+2);
  expect(g.map.right).toBeLessThanOrEqual(g.evidence.x+2);
  expect(g.panel.y).toBeGreaterThanOrEqual(g.header.bottom-2);
  expect(g.map.height).toBeGreaterThan(400);
  expect(g.map.height).toBeCloseTo(g.panel.height,0);
  expect(g.map.height).toBeCloseTo(g.evidence.height,0);
}
async function areaResult(shell) {
  await shell.getByRole('button',{name:'GREENLAND'}).click();
  await expect(shell).toHaveAttribute('data-play-state','transforming');
  await expect(shell.locator('.project-v2-apparent-value')).toBeVisible();
  await expect(shell.locator('.play-v2-overlay .project-v2-apparent-value')).toHaveCount(0);
  await expect(shell.locator('.play-v2-hud .project-v2-apparent-value')).toHaveCount(1);
  await expect(shell.locator('.project-v2-area-pair')).toHaveCount(0);
  const slider=shell.getByRole('slider',{name:'Projection transformation from Mercator to Equal Earth'});
  await scrub(slider,50);
  await expect(shell.locator('.project-v2-apparent-value')).not.toHaveText('—');
  await scrub(slider,100);
  await shell.getByRole('button',{name:'REVEAL AREA'}).click();
  await expect(shell).toHaveAttribute('data-play-state','revealed');
  await expect(shell.locator('.play-v2-hud .project-v2-area-pair')).toBeVisible();
  await expect(shell.locator('.project-v2-area-pair')).toContainText('INDIA');
}

test('PROJECT workspace separates task, map and evidence across desktop sizes',async({page},info)=>{
  desktopOnly(info);
  for(const size of desktop) {
    const shell=await openProject(page,size);
    await requireSeparatedColumns(shell);
    await expect(shell.locator('.project-v2-evidence-head')).toContainText('Area & projection');
    await expect(shell.locator('.project-v2-area-pair')).toHaveCount(0);
    await expect(shell.locator('.project-v2-canvas-caption')).toContainText('01 / AREA');
    await info.attach(`project-area-predict-${size.width}`,{
      body:await page.screenshot({animations:'disabled'}),
      contentType:'image/png'
    });
    await areaResult(shell);
    await requireSeparatedColumns(shell);
    await info.attach(`project-area-result-${size.width}`,{
      body:await page.screenshot({animations:'disabled'}),
      contentType:'image/png'
    });
    const bounds=await geometry(shell);
    expect(bounds.panel.scrollHeight).toBeLessThanOrEqual(bounds.panel.clientHeight+15);
  }
});

test('PROJECT route keeps geodesic hidden until reveal and displays it in the map column',async({page},info)=>{
  desktopOnly(info);
  for(const size of desktop) {
    const shell=await openProject(page,size);
    await areaResult(shell);
    await shell.getByRole('button',{name:'NEXT: ROUTE'}).click();
    await expect(shell).toHaveAttribute('data-play-state','routeDrawing');
    await requireSeparatedColumns(shell);
    await expect(shell.locator('.project-v2-canvas-caption')).toContainText('02 / ROUTE');
    await expect(shell.locator('.project-v2-route-legend.is-muted')).toContainText('Reference hidden until reveal');
    await expect(shell.locator('.project-v2-legend-line.is-geodesic')).toHaveCount(0);
    await expect(shell.locator('.project-v2-geodesic')).toHaveAttribute('opacity','0');
    await info.attach(`project-route-draw-${size.width}`,{
      body:await page.screenshot({animations:'disabled'}),
      contentType:'image/png'
    });

    await shell.locator('.project-v2-route-hit').focus();
    await page.keyboard.press('ArrowUp');
    await shell.getByRole('button',{name:'REVEAL GEODESIC'}).click();
    await expect(shell).toHaveAttribute('data-play-state','routeTransforming');
    await expect(shell.locator('.project-v2-geodesic')).toHaveAttribute('opacity','1');
    await expect(shell.locator('.project-v2-legend-line.is-geodesic')).toBeVisible();
    const slider=shell.getByRole('slider',{name:'Route projection transformation from Mercator to azimuthal equidistant'});
    for(const value of [0,50,100]) await scrub(slider,value);
    await shell.getByRole('button',{name:'FINISH'}).click();
    await expect(shell).toHaveAttribute('data-play-state','routeResult');
    await requireSeparatedColumns(shell);
    await expect(shell.locator('.project-v2-route-result')).toContainText('THE ROUTE DIDN');
    await info.attach(`project-route-result-${size.width}`,{
      body:await page.screenshot({animations:'disabled'}),
      contentType:'image/png'
    });
  }
});

test('PROJECT desktop controls and evidence use the same reading hierarchy',async({page},info)=>{
  desktopOnly(info);
  const shell=await openProject(page,{width:1366,height:768});
  const h2=shell.locator('.project-v2-panel h2');
  const titleSize=await h2.evaluate(node=>parseFloat(getComputedStyle(node).fontSize));
  expect(titleSize).toBeGreaterThanOrEqual(28);
  expect(titleSize).toBeLessThanOrEqual(40);
  const evidence=await shell.locator('.play-v2-hud').evaluate(node=>({
    width:node.getBoundingClientRect().width,
    overflow:getComputedStyle(node).overflowY,
    background:getComputedStyle(node).backgroundColor
  }));
  expect(evidence.width).toBeGreaterThan(240);
  expect(evidence.overflow).toBe('auto');
  await shell.getByRole('button',{name:'INDIA'}).focus();
  const outline=await shell.getByRole('button',{name:'INDIA'}).evaluate(node=>getComputedStyle(node).outlineWidth);
  expect(outline).toBe('2px');
});
