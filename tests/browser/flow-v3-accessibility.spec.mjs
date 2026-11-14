import {test,expect} from '@playwright/test';

const wind=()=>Array.from({length:84},(_,i)=>({
  latitude:-60+Math.floor(i/12)*20,longitude:-180+(i%12)*30,
  current:{wind_speed_10m:10,wind_direction_10m:270,time:new Date().toISOString().slice(0,16)},
  current_units:{wind_speed_10m:'m/s'}
}));
async function open(page){
  await page.route('https://api.open-meteo.com/**',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(wind())
  }));
  await page.route('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/**',
    route=>route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({type:'FeatureCollection',features:[]})}));
  await page.goto('/lab.html?instrument=flow&flowMode=field#l06',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.flow-lab[data-flow-round2="1"]')).toBeVisible({timeout:30000});
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
}

test('Stage 6 WCAG AA analysis: zero serious or critical violations in each mode',async({page},testInfo)=>{
  test.setTimeout(95000);
  await open(page);
  const findings=[];
  for(const mode of ['field','od','trips','release']){
    await page.locator('.flow-tabs [data-mode="'+mode+'"]').click();
    await expect(page.locator('.flow-lab')).toHaveAttribute('data-mode',mode);
    const result=await page.evaluate(async()=>{
      return window.axe.run(document.querySelector('.flow-lab'),{
        runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},
        rules:{'region':{enabled:false}}
      });
    });
    findings.push({mode,violations:result.violations.map(v=>({
      id:v.id,impact:v.impact,description:v.help,
      targets:v.nodes.map(n=>n.target).slice(0,12)
    }))});
  }
  await testInfo.attach('stage6-axe-wcag-audit.json',{
    body:Buffer.from(JSON.stringify(findings,null,2)),contentType:'application/json'
  });
  const blockers=findings.flatMap(x=>x.violations
    .filter(v=>['critical','serious'].includes(v.impact))
    .map(v=>x.mode+': '+v.id+' ('+v.impact+') '+v.targets.join(', ')));
  expect(blockers,'Serious/critical WCAG blockers in Flow').toEqual([]);
});

test('Stage 6 keyboard focus, live announcements, and FOCUS mode remain operable',async({page})=>{
  await open(page);
  const map=page.locator('#flMap');
  const announcer=page.locator('#flSampleLive');
  await expect(announcer).toHaveAttribute('aria-live','polite');
  await map.focus();
  await page.keyboard.press('Enter');
  await expect(announcer).toContainText('Sampled');
  await page.locator('.instrument-workspace-modes [data-workspace-mode="focus"]').click();
  await expect(page.locator('#flMap')).toBeVisible();
  await page.locator('.flow-tabs [data-mode="od"]').click();
  await expect(page.locator('.flow-workbar [data-flow-place]')).toBeVisible();
  await page.locator('.flow-workbar [data-flow-place]').selectOption('nyc');
  await expect.poll(()=>new URL(page.url()).searchParams.get('flowNode')).toBe('nyc');
  await page.locator('#flMap').focus();
  await page.keyboard.press('Escape');
  await expect.poll(()=>new URL(page.url()).searchParams.has('flowNode')).toBe(false);
  await page.locator('.flow-tabs [data-mode="trips"]').click();
  await expect(page.locator('.flow-workbar [aria-label="Relative teaching time units, not UTC"]')).toBeVisible();
  await expect(page.locator('.flow-timeline')).toHaveCount(1);
});
