import {test,expect} from '@playwright/test';

const sizes=[{width:1920,height:1080},{width:1440,height:900},{width:1366,height:768}];
const desktop=info=>info.project.name==='desktop-chromium';

async function open(page){
  await page.goto('/lab.html?instrument=swath',{waitUntil:'domcontentloaded'});
  const root=page.locator('.play-v2-shell[data-play-kind="swath"]');
  await expect(root).toBeVisible({timeout:20_000});
  await expect(root).toHaveAttribute('data-play-state','question');
  return root;
}
async function photo(page,info,name){
  await info.attach(name,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
}
async function zones(root){
  const r=await root.evaluate(node=>{
    const box=s=>{const r=node.querySelector(s).getBoundingClientRect();return{x:r.left,y:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
    const svg=node.querySelector('.swath-svg');
    return {task:box('.play-v2-overlay'),scene:box('.play-v2-viewport'),evidence:box('.play-v2-hud'),
      svg:box('.swath-svg'),metrics:box('.swath-metrics'),
      layout:getComputedStyle(node).display,svgLabel:svg.getAttribute('aria-label')};
  });
  expect(r.layout).toBe('grid');
  expect(r.task.width).toBeGreaterThanOrEqual(299);
  expect(r.evidence.width).toBeGreaterThanOrEqual(293);
  expect(r.scene.width).toBeGreaterThan(420);
  expect(r.task.right).toBeLessThanOrEqual(r.scene.x+2);
  expect(r.scene.right).toBeLessThanOrEqual(r.evidence.x+2);
  expect(r.metrics.x).toBeGreaterThanOrEqual(r.evidence.x);
  expect(r.metrics.right).toBeLessThanOrEqual(r.evidence.right+1);
  expect(r.svg.x).toBeGreaterThanOrEqual(r.scene.x-1);
  expect(r.svg.right).toBeLessThanOrEqual(r.scene.right+1);
  expect(r.svgLabel).toContain('Ground swath');
  await expect(root.locator('.swath-scene-heading')).toBeVisible();
  await expect(root.locator('.swath-not-scale')).toContainText('ALTITUDE NOT TO SCALE');
  return r;
}
async function choose(root,label){
  await root.getByRole('button',{name:label}).click();
  await root.getByRole('button',{name:'COMMIT PREDICTION'}).click();
}
test('SWATH task, geometry and numerical evidence stay separated across three desktop viewports',async({page},info)=>{
  test.skip(!desktop(info),'desktop-only STEP 08 visual checks');
  for(const size of sizes){
    await page.setViewportSize(size);
    const root=await open(page);
    await zones(root);
    await expect(root.locator('.swath-evidence-trial')).toContainText('The initial geometry is shown');
    await expect(root.locator('.swath-evidence-trial')).not.toContainText('BEFORE / AFTER');
    await expect(root.locator('.swath-evidence-legend')).toContainText('not optical resolution');
    await expect(root.locator('.swath-metrics')).toContainText('NADIR GSD');
    await photo(page,info,`swath-question-${size.width}`);
    await choose(root,'MORE GROUND · COARSER PIXELS');
    await expect(root).toHaveAttribute('data-play-state','committed');
    await expect(root.locator('.swath-evidence-trial')).not.toContainText('BEFORE / AFTER');
    await root.getByRole('button',{name:'WIDEN FOV'}).click();
    await expect(root).toHaveAttribute('data-play-state','revealed');
    await expect(root).toHaveAttribute('data-compare','on');
    await expect(root.locator('.swath-comparison-key')).toBeVisible();
    await expect(root.locator('.swath-comparison-key')).toContainText('PREVIOUS · DASHED');
    await expect(root.locator('.swath-evidence-trial')).toContainText('BEFORE / AFTER');
    await expect(root.locator('.swath-evidence-trial')).toContainText('GROUND SWATH / COVERAGE WIDTH');
    await expect(root.locator('.swath-evidence-trial')).toContainText('NADIR GSD / GROUND SAMPLING');
    await expect(root.locator('.swath-evidence-trial')).toContainText('6,000 → 6,000');
    await expect(root.locator('.swath-before-footprint')).not.toHaveAttribute('d','');
    await zones(root);
    await photo(page,info,`swath-revealed-${size.width}`);
  }
});

test('SWATH three single-variable changes and free design preserve geometry, focus and optical-limit context',async({page},info)=>{
  test.skip(!desktop(info),'desktop-only STEP 08 visual checks');
  await page.setViewportSize({width:1366,height:768});
  const root=await open(page);
  const scenarios=[
    ['MORE GROUND · COARSER PIXELS','WIDEN FOV','30','600','6000'],
    ['WIDER · COARSER','RAISE ORBIT','15','900','6000'],
    ['SAME SWATH · SHARPER','ADD SAMPLES','20','600','12000']
  ];
  for(let i=0;i<scenarios.length;i++){
    const [answer,action,fov,altitude,pixels]=scenarios[i];
    await choose(root,answer);
    await root.getByRole('button',{name:action}).click();
    await expect(root).toHaveAttribute('data-play-state','revealed');
    await expect(root).toHaveAttribute('data-fov',fov);
    await expect(root).toHaveAttribute('data-altitude',altitude);
    await expect(root).toHaveAttribute('data-detector-pixels',pixels);
    await expect(root.locator('.swath-evidence-trial')).toContainText('CROSS-TRACK DETECTOR SAMPLES');
    await zones(root);
    await photo(page,info,`swath-experiment-${i+1}-1366`);
    await root.getByRole('button',{name:i===2?'OPEN SENSOR DESIGN':'NEXT EXPERIMENT'}).click();
  }
  await expect(root).toHaveAttribute('data-play-state','free');
  await expect(root.locator('.swath-evidence-trial')).toContainText('CURRENT VS REFERENCE');
  await expect(root.locator('.swath-model-details')).toContainText('MODEL BOUNDARY');
  await expect(root.locator('.swath-evidence-legend')).toContainText('Optics, SNR and MTF');
  await zones(root);
  await photo(page,info,'swath-design-1366');

  const slider=root.locator('[data-free="fovDeg"]');
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toBeFocused();
  await expect(root).toHaveAttribute('data-fov','21');
  await expect(root.locator('.swath-evidence-trial')).toContainText('WIDER');
  const alt=root.locator('[data-free="altitudeKm"]');
  await alt.evaluate(input=>{input.value='700';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await expect(root).toHaveAttribute('data-altitude','700');
  const pix=root.locator('[data-free="detectorPixels"]');
  await pix.evaluate(input=>{input.value='12032';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await expect(root).toHaveAttribute('data-detector-pixels','12032');
  await expect(root.locator('.swath-pixels')).toHaveAttribute('data-detector-pixels','12032');
  await photo(page,info,'swath-design-changed-1366');
  await root.getByRole('button',{name:'RESET SENSOR'}).click();
  await expect(root).toHaveAttribute('data-fov','20');
  await expect(root).toHaveAttribute('data-altitude','600');
  await expect(root).toHaveAttribute('data-detector-pixels','6000');
  await root.getByRole('button',{name:'REPLAY GUIDED'}).click();
  await expect(root).toHaveAttribute('data-play-state','question');
  await expect(root.locator('.swath-evidence-trial')).not.toContainText('BEFORE / AFTER');
});

test('SWATH relocates the actual live metrics on responsive resize without duplicating them',async({page},info)=>{
  test.skip(!desktop(info),'desktop-only STEP 08 responsive check');
  await page.setViewportSize({width:1366,height:768});
  const root=await open(page);
  await expect(root.locator('.swath-evidence-metrics-anchor .swath-metrics')).toHaveCount(1);
  const ref=await root.locator('.swath-metrics').evaluate(el=>{el.dataset.identity='one-only';return el.dataset.identity;});
  expect(ref).toBe('one-only');

  await page.setViewportSize({width:920,height:780});
  await expect(root).toHaveCSS('display','block');
  await expect(root.locator('.swath-geometry > .swath-metrics')).toHaveCount(1);
  await expect(root.locator('.swath-metrics')).toHaveCount(1);
  await expect(root.locator('.swath-evidence-trial')).toBeHidden();
  await expect(root.getByRole('button',{name:'COMMIT PREDICTION'})).toBeDisabled();

  await page.setViewportSize({width:1366,height:768});
  await expect(root.locator('.swath-evidence-metrics-anchor .swath-metrics')).toHaveCount(1);
  await expect(root.locator('.swath-metrics')).toHaveCount(1);
  await expect(root.locator('.swath-metrics')).toHaveAttribute('data-identity','one-only');
  await choose(root,'MORE GROUND · COARSER PIXELS');
  await root.getByRole('button',{name:'WIDEN FOV'}).click();
  await zones(root);
});
